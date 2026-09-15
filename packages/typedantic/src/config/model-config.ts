import { defineFieldProperty, defineFieldPropertyMetadata } from "../fields/properties.js";
import { MODEL_CONFIG_KEY, type ConfigDict } from "../fields/types.js";

export function modelConfig(config: ConfigDict): ClassDecorator {
    return (target) => {
        const propertyValue = { ...(target as { modelConfig?: ConfigDict }).modelConfig, ...config };
        defineFieldProperty(target, 'modelConfig', propertyValue);
        defineFieldPropertyMetadata(MODEL_CONFIG_KEY, config, target);
    };
}

export function getModelConfig(ctor: Function): ConfigDict {
    return ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {}) as ConfigDict;
}