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
    const effective = fieldInfo?.type ?? type;
    let base = getBaseSchemaFromType(effective);

    return getSchemaConstraints(base, fieldInfo);
}

