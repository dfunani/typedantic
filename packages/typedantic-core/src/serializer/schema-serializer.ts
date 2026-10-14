import type { SerializationOptionsSchema } from '../schema/models/configurations.js';
import type { BaseSchema } from '../schema/types.js';

export type DumpOptions = SerializationOptionsSchema & {
    /** Field names that were set on the instance (for excludeUnset). */
    fieldsSet?: Set<string>;
    /** Per-field serializers keyed by field name. */
    fieldSerializers?: Record<
        string,
        (value: unknown, info: { mode: 'json' | 'model' }) => unknown
    >;
    /** Computed field getters keyed by name. */
    computed?: Record<string, () => unknown>;
};

export class SchemaSerializer {
    constructor(private readonly schema: BaseSchema) {}

    dump(value: unknown, options: DumpOptions = {}): unknown {
        return serializeValue(this.schema, value, options);
    }

    dumpJson(value: unknown, options: DumpOptions = {}): string {
        return JSON.stringify(this.dump(value, { ...options, mode: 'json' }));
    }

    getSchema(): BaseSchema {
        return this.schema;
    }
}

export function serializeValue(
    schema: BaseSchema,
    value: unknown,
    options: DumpOptions = {},
): unknown {
    const mode = options.mode ?? 'model';

    if (value === undefined) return undefined;
    if (options.excludeNone && value === null) return undefined;

    switch (schema.type) {
        case 'date':
            if (value instanceof Date) {
                return mode === 'json' ? value.toISOString() : value;
            }
            return value;
        case 'nullable':
            if (value === null) return null;
            return serializeValue(schema.schema, value, options);
        case 'optional':
            if (value === undefined) return undefined;
            return serializeValue(schema.schema, value, options);
        case 'default':
        case 'default-factory':
        case 'function-before':
        case 'function-after':
        case 'function-wrap':
            return serializeValue(schema.schema, value, options);
        case 'function-plain':
            return value;
        case 'array':
            if (!Array.isArray(value)) return value;
            return value.map((item) => serializeValue(schema.itemsSchema, item, options));
        case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
            {
                const out: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
                    out[k] = serializeValue(schema.valuesSchema, v, options);
                }
                return out;
            }
        case 'union': {
            // Prefer instance dump when value is already a model (correct arm).
            if (
                value !== null &&
                typeof value === 'object' &&
                typeof (value as { modelDump?: unknown }).modelDump === 'function'
            ) {
                return dumpPlain(value, mode);
            }
            if (schema.discriminator && typeof value === 'object' && value !== null) {
                const tag = (value as Record<string, unknown>)[schema.discriminator];
                for (const choice of schema.choices) {
                    if (choice.type !== 'model-fields') continue;
                    const disc = choice.fields[schema.discriminator];
                    if (!disc) continue;
                    if (disc.schema.type === 'literal') {
                        const expected = (disc.schema as { expected: unknown[] }).expected;
                        if (expected.includes(tag)) {
                            return serializeValue(choice, value, options);
                        }
                    }
                    if (disc.schema.type === 'enum') {
                        const members = (disc.schema as { members: readonly string[] }).members;
                        if (members.includes(tag as string)) {
                            return serializeValue(choice, value, options);
                        }
                    }
                }
            }
            for (const choice of schema.choices) {
                return serializeValue(choice, value, options);
            }
            return dumpPlain(value, mode);
        }
        case 'model-fields':
            return serializeModelFields(schema, value, options);
        default:
            return dumpPlain(value, mode);
    }
}

function dumpPlain(value: unknown, mode: 'json' | 'model'): unknown {
    if (mode === 'json' && value instanceof Date) return value.toISOString();
    if (
        value !== null &&
        typeof value === 'object' &&
        typeof (value as { modelDump?: unknown }).modelDump === 'function'
    ) {
        return (value as { modelDump: (o?: DumpOptions) => unknown }).modelDump({ mode });
    }
    if (
        mode === 'json' &&
        value !== null &&
        typeof value === 'object' &&
        typeof (value as { toJSON?: unknown }).toJSON === 'function'
    ) {
        return (value as { toJSON: () => unknown }).toJSON();
    }
    return value;
}

function serializeModelFields(
    schema: Extract<BaseSchema, { type: 'model-fields' }>,
    value: unknown,
    options: DumpOptions,
): Record<string, unknown> {
    const mode = options.mode ?? 'model';
    const src =
        value !== null && typeof value === 'object'
            ? (value as Record<string, unknown>)
            : {};
    const out: Record<string, unknown> = {};

    for (const [name, field] of Object.entries(schema.fields)) {
        if (field.exclude) continue;
        if (options.include && !options.include.has(name)) continue;
        if (options.exclude?.has(name)) continue;
        if (options.excludeUnset && options.fieldsSet && !options.fieldsSet.has(name)) continue;

        let fieldValue = src[name];
        if (fieldValue === undefined && options.computed?.[name]) {
            fieldValue = options.computed[name]!();
        }

        if (options.excludeNone && fieldValue === null) continue;
        if (options.excludeDefaults) {
            if (field.default !== undefined && fieldValue === field.default) continue;
        }

        const ser = options.fieldSerializers?.[name];
        let serialized = ser
            ? ser(fieldValue, { mode })
            : serializeValue(field.schema, fieldValue, options);

        if (
            serialized !== null &&
            typeof serialized === 'object' &&
            typeof (serialized as { modelDump?: unknown }).modelDump === 'function'
        ) {
            serialized = (serialized as { modelDump: (o?: DumpOptions) => unknown }).modelDump({
                mode,
            });
        }

        const key =
            options.byAlias && (field.serializationAlias ?? field.alias)
                ? (field.serializationAlias ?? field.alias)!
                : name;
        out[key] = serialized;
    }

    // Computed fields not in schema.fields
    if (options.computed) {
        for (const [name, getter] of Object.entries(options.computed)) {
            if (name in schema.fields) continue;
            if (options.include && !options.include.has(name)) continue;
            if (options.exclude?.has(name)) continue;
            const v = getter();
            if (options.excludeNone && v === null) continue;
            out[name] = mode === 'json' && v instanceof Date ? v.toISOString() : v;
        }
    }

    return out;
}
