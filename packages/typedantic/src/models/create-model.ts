import { BaseModel } from './base-model.js';
import { Field } from '../fields/field.js';
import type { FieldInfo } from '../internal/metadata.js';
import { registerModelField } from '../internal/field-registry.js';

export type FieldDefinitions = Record<string, FieldInfo | unknown>;

export function createModel(
  modelName: string,
  fields: FieldDefinitions,
  base: typeof BaseModel = BaseModel,
): typeof BaseModel {
  class DynamicModel extends base {}

  Object.defineProperty(DynamicModel, 'name', { value: modelName });

  for (const [name, def] of Object.entries(fields)) {
    if (def && typeof def === 'object' && ('default' in def || 'alias' in def || 'minLength' in def)) {
      registerModelField(DynamicModel, name, def as FieldInfo);
    } else {
      registerModelField(DynamicModel, name, { default: def });
    }
    Object.defineProperty(DynamicModel.prototype, name, {
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  return DynamicModel;
}

export { Field };
