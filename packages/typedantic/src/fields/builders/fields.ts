import type { BaseSchema, ModelFieldSchema, ValidatorFunction } from '@typedantic/core';
import { ConfigDict, FieldInfo } from '../types.js';
import { getBaseSchemaFromType, getModelFields, getSchemaConstraints } from './schema.js';
import { getFieldValidators, getModelValidators } from '../../validators/decorators.js';
import { CORE_SCHEMA_KEY } from '../types.js';
import { getAnnotatedSchema } from '../../types/annotated.js';

export function buildModelFieldSchema(ctor: Function, config?: ConfigDict): BaseSchema {
    // Break recursion for self-referencing models (B9).
    if (Object.prototype.hasOwnProperty.call(ctor, CORE_SCHEMA_KEY)) {
        return (ctor as { [CORE_SCHEMA_KEY]?: BaseSchema })[CORE_SCHEMA_KEY]!;
    }

    const modelConfig = config ?? ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {});
    const placeholder: Extract<BaseSchema, { type: 'model-fields' }> = {
        type: 'model-fields',
        fields: {},
        modelName: ctor.name,
        extra: modelConfig.extra ?? 'ignore',
        strict: modelConfig.strict,
        populateByName: modelConfig.populateByName,
    };
    Object.defineProperty(ctor, CORE_SCHEMA_KEY, { value: placeholder, configurable: true });

    const fields = getModelFields(ctor);
    const modelFields: Record<string, ModelFieldSchema> = {};

    for (const [name, meta] of Object.entries(fields)) {
        if (meta.fieldInfo?.exclude) continue;
        let schema = wrapFieldValidators(ctor, name, meta.schema);
        modelFields[name] = {
            schema,
            required: meta.required,
            alias: meta.alias,
            validationAlias: meta.fieldInfo?.validationAlias ?? meta.alias,
            serializationAlias: meta.fieldInfo?.serializationAlias ?? meta.alias,
            exclude: meta.fieldInfo?.exclude,
            title: meta.fieldInfo?.title,
            description: meta.fieldInfo?.description,
            default: meta.default,
            defaultFactory: meta.defaultFactory,
        };
    }

    placeholder.fields = modelFields;
    let schema: BaseSchema = placeholder;
    schema = wrapModelValidators(ctor, schema);
    Object.defineProperty(ctor, CORE_SCHEMA_KEY, { value: schema, configurable: true });
    return schema;
}

function wrapFieldValidators(ctor: Function, fieldName: string, schema: BaseSchema): BaseSchema {
    const validators = getFieldValidators(ctor).filter((v) => v.field === fieldName);
    let current = schema;
    for (const v of validators) {
        const fn: ValidatorFunction = (input, _ctx) => v.fn(input, { field: fieldName });
        if (v.mode === 'before') {
            current = { type: 'function-before', schema: current, fn };
        } else if (v.mode === 'after') {
            current = { type: 'function-after', schema: current, fn };
        } else if (v.mode === 'wrap') {
            current = {
                type: 'function-wrap',
                schema: current,
                fn: (input, handler) => v.fn(input, { field: fieldName }) ?? handler(input),
            };
        } else {
            current = { type: 'function-plain', fn };
        }
    }
    return current;
}

function wrapModelValidators(ctor: Function, schema: BaseSchema): BaseSchema {
    const validators = getModelValidators(ctor);
    let current = schema;
    for (const v of validators) {
        const fn: ValidatorFunction = (input) => v.fn(input);
        if (v.mode === 'before') {
            current = { type: 'function-before', schema: current, fn };
        } else if (v.mode === 'after') {
            current = { type: 'function-after', schema: current, fn };
        } else if (v.mode === 'wrap') {
            current = {
                type: 'function-wrap',
                schema: current,
                fn: (input, handler) => (v.fn(input) as unknown) ?? handler(input),
            };
        } else {
            current = { type: 'function-plain', fn };
        }
    }
    return current;
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

    const annotated = getAnnotatedSchema(effective);
    if (annotated) return annotated;

    if (effective === Date || effective === 'date') {
        return { type: 'date' };
    }
    if (effective === Array || effective === 'array') {
        return inferArraySchema(fieldInfo);
    }
    if (
        effective === 'object' ||
        fieldInfo?.values !== undefined ||
        fieldInfo?.keys !== undefined
    ) {
        return inferObjectSchema(fieldInfo);
    }
    if (effective === 'number') {
        return getSchemaConstraints({ type: 'number' }, fieldInfo);
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
    return (
        typeof type === 'function' &&
        type !== String &&
        type !== Number &&
        type !== Boolean &&
        type !== Date &&
        type !== Array &&
        type !== Object &&
        typeof (type as { modelValidate?: unknown }).modelValidate === 'function'
    );
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

function inferObjectSchema(fieldInfo?: FieldInfo): BaseSchema {
    return {
        type: 'object',
        valuesSchema: inferSchemaFromType(fieldInfo?.values ?? String),
        keysSchema: fieldInfo?.keys ? inferSchemaFromType(fieldInfo.keys) : undefined,
    };
}

function inferArraySchema(fieldInfo?: FieldInfo): BaseSchema {
    return {
        type: 'array',
        itemsSchema: inferSchemaFromType(fieldInfo?.items ?? String),
        minLength: fieldInfo?.minLength,
        maxLength: fieldInfo?.maxLength,
    };
}
