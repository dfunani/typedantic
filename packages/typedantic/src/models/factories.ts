import {
    BaseSchema,
    SchemaSerializer,
    SchemaValidator,
    type DumpOptions,
} from '@typedantic/core';
import { getModelConfig } from '../config/model-config.js';
import {
    CORE_SCHEMA_KEY,
    FIELDS_SET_KEY,
    FieldInfo,
    ModelClass,
    SERIALIZER_KEY,
    VALIDATOR_KEY,
} from '../fields/types.js';
import { buildModelFieldSchema } from '../fields/builders/fields.js';
import { getModelFields } from '../fields/builders/schema.js';
import { getComputedFields, getFieldSerializers } from '../serializers/decorators.js';

function hasOwn(ctor: object, key: string | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(ctor, key);
}

export function buildBaseModelSchema(ctor: Function): BaseSchema {
    if (hasOwn(ctor, CORE_SCHEMA_KEY)) {
        return (ctor as ModelClass)[CORE_SCHEMA_KEY]!;
    }
    return buildModelFieldSchema(ctor);
}

export function buildBaseModelValidator(ctor: Function, schema: BaseSchema): SchemaValidator {
    if (hasOwn(ctor, VALIDATOR_KEY)) {
        return (ctor as ModelClass)[VALIDATOR_KEY]!;
    }
    const config = getModelConfig(ctor);
    const validator = new SchemaValidator(schema, { strict: config.strict });
    Object.defineProperty(ctor, VALIDATOR_KEY, { value: validator });
    return validator;
}

export function buildBaseModelSerializer(ctor: Function, schema: BaseSchema): SchemaSerializer {
    if (hasOwn(ctor, SERIALIZER_KEY)) {
        return (ctor as ModelClass)[SERIALIZER_KEY]!;
    }
    const serializer = new SchemaSerializer(schema);
    Object.defineProperty(ctor, SERIALIZER_KEY, { value: serializer });
    return serializer;
}

type ModelStatic = {
    modelConstruct(values: Record<string, unknown>): object;
};

export function buildBaseModelInstance<T extends new (...args: unknown[]) => object>(
    ctor: ModelClass<T>,
    data: Record<string, unknown>,
    fieldsSet?: Set<string>,
): InstanceType<T> {
    const config = getModelConfig(ctor);
    const fields = getModelFields(ctor);
    let instance = Object.create(ctor.prototype) as InstanceType<T>;

    const set = fieldsSet ?? new Set(Object.keys(data));
    Object.defineProperty(instance, FIELDS_SET_KEY, {
        value: set,
        enumerable: false,
        writable: true,
    });

    for (const [key, value] of Object.entries(data)) {
        const meta = fields[key];
        const hydrated = meta ? hydrateFieldValue(meta.fieldInfo, value) : value;
        Object.defineProperty(instance, key, {
            value: hydrated,
            writable: !config.frozen,
            enumerable: true,
            configurable: !config.frozen,
        });
    }

    if (config.frozen) {
        Object.freeze(instance);
        return instance;
    }

    if (config.validateAssignment) {
        instance = new Proxy(instance as object, {
            set(target, prop, value) {
                if (typeof prop !== 'string') {
                    (target as Record<string | symbol, unknown>)[prop] = value;
                    return true;
                }
                const meta = fields[prop];
                if (!meta) {
                    if (config.extra === 'forbid') {
                        throw new Error(`Extra field not permitted: ${prop}`);
                    }
                    (target as Record<string, unknown>)[prop] = value;
                    return true;
                }
                const schema = buildBaseModelSchema(ctor);
                const validator = buildBaseModelValidator(ctor, schema);
                const patch = { ...(target as Record<string, unknown>), [prop]: value };
                const validated = validator.validateModel(patch, {
                    strict: config.strict,
                }) as Record<string, unknown>;
                (target as Record<string, unknown>)[prop] = hydrateFieldValue(
                    meta.fieldInfo,
                    validated[prop],
                );
                (target as { [FIELDS_SET_KEY]?: Set<string> })[FIELDS_SET_KEY]?.add(prop);
                return true;
            },
        }) as InstanceType<T>;
    }

    return instance;
}

export function dumpModelInstance(
    ctor: Function,
    instance: object,
    options: DumpOptions = {},
): Record<string, unknown> {
    const schema = buildBaseModelSchema(ctor);
    const serializer = buildBaseModelSerializer(ctor, schema);
    const fieldSerializers: DumpOptions['fieldSerializers'] = {};
    for (const s of getFieldSerializers(ctor)) {
        if (s.whenUsed === 'json' && options.mode !== 'json') continue;
        if (s.whenUsed === 'unless-none') {
            fieldSerializers[s.field] = (value, info) => {
                if (value === null || value === undefined) return value;
                return s.fn(value, info);
            };
        } else {
            fieldSerializers[s.field] = s.fn;
        }
    }
    const computed: Record<string, () => unknown> = {};
    for (const c of getComputedFields(ctor)) {
        const desc = Object.getOwnPropertyDescriptor(ctor.prototype, c.name);
        if (desc?.get) {
            computed[c.name] = () => desc.get!.call(instance);
        }
    }
    const fieldsSet = (instance as { [FIELDS_SET_KEY]?: Set<string> })[FIELDS_SET_KEY];
    return serializer.dump(instance, {
        ...options,
        fieldSerializers,
        computed,
        fieldsSet,
    }) as Record<string, unknown>;
}

function isModelCtor(type: unknown): type is ModelClass & ModelStatic {
    return (
        typeof type === 'function' &&
        type !== String &&
        type !== Number &&
        type !== Boolean &&
        type !== Date &&
        type !== Array &&
        type !== Object &&
        typeof (type as { modelValidate?: unknown }).modelValidate === 'function' &&
        typeof (type as { modelConstruct?: unknown }).modelConstruct === 'function'
    );
}

function hydrateFieldValue(fieldInfo: FieldInfo | undefined, value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (Array.isArray(value) && isModelCtor(fieldInfo?.items)) {
        const itemCtor = fieldInfo.items;
        return value.map((item) => {
            if (item === null || item === undefined) return item;
            if (typeof item !== 'object' || Array.isArray(item)) return item;
            if (item instanceof itemCtor) return item;
            return itemCtor.modelConstruct(item as Record<string, unknown>);
        });
    }

    // Dict of models
    if (
        fieldInfo?.values &&
        isModelCtor(fieldInfo.values) &&
        typeof value === 'object' &&
        !Array.isArray(value)
    ) {
        const valueCtor = fieldInfo.values;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
                out[k] =
                    v instanceof valueCtor
                        ? v
                        : valueCtor.modelConstruct(v as Record<string, unknown>);
            } else {
                out[k] = v;
            }
        }
        return out;
    }

    if (typeof value !== 'object' || Array.isArray(value)) return value;

    const record = value as Record<string, unknown>;

    if (fieldInfo?.union) {
        const matched = matchUnionModel(fieldInfo.union, record, fieldInfo.discriminator);
        if (matched) return matched.modelConstruct(record);
    }

    if (isModelCtor(fieldInfo?.type)) {
        if (value instanceof fieldInfo.type) return value;
        return fieldInfo.type.modelConstruct(record);
    }

    return value;
}

function matchUnionModel(
    union: unknown[],
    value: Record<string, unknown>,
    discriminator?: string,
): (ModelClass & ModelStatic) | undefined {
    for (const choice of union) {
        if (!isModelCtor(choice)) continue;
        if (modelDiscriminatorMatch(choice, value, discriminator)) return choice;
    }
    return undefined;
}

function modelDiscriminatorMatch(
    ctor: ModelClass,
    value: Record<string, unknown>,
    discriminator?: string,
): boolean {
    const fields = getModelFields(ctor);
    if (discriminator && fields[discriminator]) {
        const meta = fields[discriminator]!;
        const tag = value[discriminator];
        if (meta.schema.type === 'literal') {
            return (meta.schema as { expected: unknown[] }).expected.includes(tag);
        }
        if (meta.schema.type === 'enum') {
            return (meta.schema as { members: readonly string[] }).members.includes(
                tag as string,
            );
        }
    }
    let sawDisc = false;
    for (const [name, meta] of Object.entries(fields)) {
        if (meta.schema.type === 'literal') {
            sawDisc = true;
            const expected = (meta.schema as { expected: unknown[] }).expected;
            if (!expected.includes(value[name])) return false;
        }
        if (meta.schema.type === 'enum' && discriminator === name) {
            sawDisc = true;
            const members = (meta.schema as { members: readonly string[] }).members;
            if (!members.includes(value[name] as string)) return false;
        }
    }
    return sawDisc;
}
