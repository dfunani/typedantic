import { BaseSchema, SchemaValidator } from "@typedantic/core";
import { getModelConfig } from "../config/model-config.js";
import { CORE_SCHEMA_KEY, FieldInfo, ModelClass, VALIDATOR_KEY } from "../fields/types.js";
import { buildModelFieldSchema } from "../fields/builders/fields.js";
import { getModelFields } from "../fields/builders/schema.js";

function hasOwn(ctor: object, key: string | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(ctor, key);
}

export function buildBaseModelSchema(ctor: Function): BaseSchema {
    if (hasOwn(ctor, CORE_SCHEMA_KEY)) {
        return (ctor as ModelClass)[CORE_SCHEMA_KEY]!;
    }
    getModelFields(ctor);
    const schema = buildModelFieldSchema(ctor);
    Object.defineProperty(ctor, CORE_SCHEMA_KEY, { value: schema });
    return schema;
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

type ModelStatic = {
    modelConstruct(values: Record<string, unknown>): object;
};

export function buildBaseModelInstance<T extends new (...args: unknown[]) => object>(
    ctor: ModelClass<T>,
    data: Record<string, unknown>,
): InstanceType<T> {
    const config = getModelConfig(ctor);
    const fields = getModelFields(ctor);
    const instance = Object.create(ctor.prototype) as InstanceType<T>;

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

    if (config.frozen) Object.freeze(instance);
    return instance;
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

    if (typeof value !== 'object' || Array.isArray(value)) return value;

    const record = value as Record<string, unknown>;

    if (fieldInfo?.union) {
        const matched = matchUnionModel(fieldInfo.union, record);
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
): (ModelClass & ModelStatic) | undefined {
    for (const choice of union) {
        if (!isModelCtor(choice)) continue;
        if (modelLiteralsMatch(choice, value)) return choice;
    }
    // Fall back to first model arm if no literals discriminate.
    return union.find(isModelCtor);
}

function modelLiteralsMatch(ctor: ModelClass, value: Record<string, unknown>): boolean {
    const fields = getModelFields(ctor);
    let sawLiteral = false;
    for (const [name, meta] of Object.entries(fields)) {
        if (meta.schema.type !== 'literal') continue;
        sawLiteral = true;
        const expected = (meta.schema as { expected: unknown[] }).expected;
        if (!expected.includes(value[name])) return false;
    }
    return sawLiteral;
}
