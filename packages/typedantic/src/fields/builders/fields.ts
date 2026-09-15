import { ConfigDict, FieldInfo } from '../types.js';
import { getBaseSchemaFromType, getModelFields, getSchemaConstraints } from './schema.js';
import { BaseSchema, ModelFieldSchema } from '@typedantic/core';



export function buildModelFieldSchema(ctor: Function, config?: ConfigDict): BaseSchema {
    const fields = getModelFields(ctor);
    const modelConfig = config ?? ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {});

    const modelFields: Record<string, ModelFieldSchema> = {};
    for (const [name, meta] of Object.entries(fields)) {
        let schema = meta.schema;

        // V1: apply defaults as schema wrappers if you already added default nodes to CoreSchema.
        // If not, rely on ModelFieldSchema.default / defaultFactory (supported by compileModelFields).
        modelFields[name] = {
            schema,
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

export function inferSchemaFromType(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
    const schema = inferBaseSchema(type, fieldInfo);
    return wrapNullable(schema, fieldInfo);
}

function inferBaseSchema(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
    if (fieldInfo?.literal !== undefined) {
        return inferLiteralSchema(fieldInfo);
    }
    if (fieldInfo?.enum) {
        return { type: 'enum', members: fieldInfo.enum };
    }
    if (fieldInfo?.union) {
        return inferUnionSchema(fieldInfo);
    }

    const effective = fieldInfo?.type ?? type;

    if (effective === Date || effective === 'date') {
        return { type: 'date' };
    }
    if (effective === Array || effective === 'list') {
        return inferListSchema(fieldInfo);
    }
    if (effective === 'dict' || fieldInfo?.values !== undefined || fieldInfo?.keys !== undefined) {
        return inferDictSchema(fieldInfo);
    }
    if (effective === 'float') {
        return getSchemaConstraints({ type: 'float' }, fieldInfo);
    }
    if (isModelConstructor(effective)) {
        return buildModelFieldSchema(effective);
    }

    const base = getBaseSchemaFromType(effective, fieldInfo);
    return getSchemaConstraints(base, fieldInfo);
}

function wrapNullable(schema: BaseSchema, fieldInfo?: FieldInfo): BaseSchema {
    if (fieldInfo?.nullable) return { type: 'nullable', schema };
    return schema;
}

function isModelConstructor(type: unknown): type is Function {
    return typeof type === 'function'
        && type !== String
        && type !== Number
        && type !== Boolean
        && type !== Date
        && type !== Array
        && type !== Object
        && typeof (type as { modelValidate?: unknown }).modelValidate === 'function';
}


function inferLiteralSchema(fieldInfo: FieldInfo): BaseSchema {
    if (Array.isArray(fieldInfo.literal)) {
        return { type: 'literal', expected: fieldInfo.literal };
    }
    return { type: 'literal', expected: [fieldInfo.literal] };
}

function inferUnionSchema(fieldInfo: FieldInfo): BaseSchema {
    return {
        type: 'union',
        choices: fieldInfo.union?.map((choice) => inferSchemaFromType(choice)) ?? [],
        discriminator: fieldInfo.discriminator,
    };
}

function inferDictSchema(fieldInfo?: FieldInfo): BaseSchema {
    return {
        type: 'dict',
        valuesSchema: inferSchemaFromType(fieldInfo?.values ?? String),
        keysSchema: fieldInfo?.keys ? inferSchemaFromType(fieldInfo.keys) : undefined,
    };
}

function inferListSchema(fieldInfo?: FieldInfo): BaseSchema {
    return {
        type: 'list',
        itemsSchema: inferSchemaFromType(fieldInfo?.items ?? String),
        minLength: fieldInfo?.minLength,
        maxLength: fieldInfo?.maxLength,
    };
}
