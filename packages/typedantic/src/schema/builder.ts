import type { BaseSchema } from '@typedantic/core';
import { finalizeRegisteredFields, getRegisteredFields } from '../fields/registry.js';
import type { ConfigDict, FieldInfo, ModelFieldMeta } from '../fields/types.js';

const ALLOWED_BASE_SCHEMA_TYPES = {
    String: { type: 'string' },
    Number: { type: 'number' },
    Boolean: { type: 'boolean' },
} as const satisfies Record<string, BaseSchema>;

const ALLOWED_REFLECT_SCHEMA_TYPES = {
    string: { type: 'string' },
    number: { type: 'number' },
    boolean: { type: 'boolean' },
} as const satisfies Record<string, BaseSchema>;

const NUMBER_CONSTRAINTS = [
    'ge',
    'gt',
    'le',
    'lt',
    'multipleOf',
] as const;

const STRING_CONSTRAINTS = [
    'minLength',
    'maxLength',
    'pattern',
] as const;

export function inferSchemaFromType(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
    const effective = fieldInfo?.type ?? type;
    let base = buildBaseSchema(effective);

    // Constraint hints can force number/string when design:type is missing
    if (
        fieldInfo &&
        NUMBER_CONSTRAINTS.some((constraint) => fieldInfo[constraint] !== undefined)
    ) {
        base = { type: 'number' };
    }
    if (
        fieldInfo &&
        STRING_CONSTRAINTS.some((constraint) => fieldInfo[constraint] !== undefined)
    ) {
        base = { type: 'string' };
    }

    return applyFieldConstraints(base, fieldInfo);
}

function buildBaseSchema(type: unknown): BaseSchema {
    const base = ALLOWED_BASE_SCHEMA_TYPES[type as keyof typeof ALLOWED_BASE_SCHEMA_TYPES];
    if (base) return base;

    const reflect = ALLOWED_REFLECT_SCHEMA_TYPES[type as keyof typeof ALLOWED_REFLECT_SCHEMA_TYPES];
    if (reflect) return reflect;

    return { type: 'string' };
}

/** Like `{ k: fieldInfo[k] for k in keys if fieldInfo[k] is not None }` */
function pickDefinedConstraints<const K extends readonly (keyof FieldInfo)[]>(
    fieldInfo: FieldInfo,
    keys: K,
): Partial<Pick<FieldInfo, K[number]>> {
    return Object.fromEntries(
        keys
            .filter((key) => fieldInfo[key] !== undefined)
            .map((key) => [key, fieldInfo[key]]),
    ) as Partial<Pick<FieldInfo, K[number]>>;
}

function applyFieldConstraints(schema: BaseSchema, fieldInfo?: FieldInfo): BaseSchema {
    if (!fieldInfo) return schema;

    // { "strict": fieldInfo.strict } if defined — same idea as a one-key comprehension
    const strict = pickDefinedConstraints(fieldInfo, ['strict'] as const);

    if (schema.type === 'string') {
        return {
            ...schema,
            ...pickDefinedConstraints(fieldInfo, STRING_CONSTRAINTS),
            ...strict,
        };
    }
    if (schema.type === 'number') {
        return {
            ...schema,
            ...pickDefinedConstraints(fieldInfo, NUMBER_CONSTRAINTS),
            ...strict,
        };
    }
    return schema;
}

export function collectModelFields(ctor: Function): Record<string, ModelFieldMeta> {
    const registered = getRegisteredFields(ctor);
    if (Object.keys(registered).length === 0) return {};
    return finalizeRegisteredFields(ctor, (fieldInfo, designType) =>
        inferSchemaFromType(designType ?? String, fieldInfo),
    );
}

export function buildModelSchema(ctor: Function, config?: ConfigDict): BaseSchema {
    const fields = collectModelFields(ctor);
    const modelConfig = config ?? ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {});

    const modelFields: Record<string, import('@typedantic/core').ModelFieldSchema> = {};
    for (const [name, meta] of Object.entries(fields)) {
        modelFields[name] = {
            schema: meta.schema,
            required: meta.required,
            alias: meta.alias,
            default: meta.default,
            defaultFactory: meta.defaultFactory,
        };
    }

    return {
        type: 'model-fields',
        fields: modelFields,
        modelName: ctor.name,
        extra: modelConfig.extra ?? 'ignore',
        strict: modelConfig.strict,
    };
}
