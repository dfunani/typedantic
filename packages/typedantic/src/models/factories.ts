import { BaseSchema, SchemaValidator } from "@typedantic/core";
import { buildModelSchema, collectModelFields } from "../schema/builder.js";
import { getModelConfig } from "../config/model-config.js";

function hasOwn(ctor: object, key: string | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(ctor, key);
}

export function getOrBuildSchema(ctor: Function): BaseSchema {
    if (hasOwn(ctor, CORE_SCHEMA_KEY)) {
        return (ctor as ModelClass)[CORE_SCHEMA_KEY]!;
    }
    collectModelFields(ctor);
    const schema = buildModelSchema(ctor);
    Object.defineProperty(ctor, CORE_SCHEMA_KEY, { value: schema });
    return schema;
}

export function getOrBuildValidator(ctor: Function, schema: BaseSchema): SchemaValidator {
    if (hasOwn(ctor, VALIDATOR_KEY)) {
        return (ctor as ModelClass)[VALIDATOR_KEY]!;
    }
    const config = getModelConfig(ctor);
    const validator = new SchemaValidator(schema, { strict: config.strict });
    Object.defineProperty(ctor, VALIDATOR_KEY, { value: validator });
    return validator;
}

export function instantiateModel<T extends new (...args: unknown[]) => object>(
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
