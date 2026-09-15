import { BaseSchema, SchemaValidator } from "@typedantic/core";
import { getModelConfig } from "../config/model-config.js";
import { CORE_SCHEMA_KEY, ModelClass, VALIDATOR_KEY } from "../fields/types.js";
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

export function buildBaseModelInstance<T extends new (...args: unknown[]) => object>(
    ctor: ModelClass<T>,
    data: Record<string, unknown>,
): InstanceType<T> {
    const config = getModelConfig(ctor);
    const instance = Object.create(ctor.prototype) as InstanceType<T>;

    for (const [key, value] of Object.entries(data)) {
        Object.defineProperty(instance, key, {
            value,
            writable: !config.frozen,
            enumerable: true,
            configurable: !config.frozen,
        });
    }

    if (config.frozen) Object.freeze(instance);
    return instance;
}
