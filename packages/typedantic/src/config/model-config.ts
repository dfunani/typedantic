import { defineMetadata } from '../internal/reflect.js';
import type { ConfigDict } from '../internal/metadata.js';
import { MODEL_CONFIG_KEY } from '../internal/metadata.js';

export function modelConfig(config: ConfigDict): ClassDecorator {
  return (target) => {
    Object.defineProperty(target, 'modelConfig', {
      value: { ...(target as { modelConfig?: ConfigDict }).modelConfig, ...config },
      writable: true,
      configurable: true,
    });
    defineMetadata(MODEL_CONFIG_KEY, config, target);
  };
}

export function getModelConfig(ctor: Function): ConfigDict {
  return ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {}) as ConfigDict;
}
