import 'reflect-metadata';
import { BaseModel } from '../models/base-model.js';
import { Field } from '../fields/decorator.js';
import { modelConfig } from '../config/model-config.js';
import type { ConfigDict, FieldInfo } from '../fields/types.js';

export type CreateModelFields = Record<string, FieldInfo>;

export type InferCreateModelInstance<F extends CreateModelFields> = {
    [K in keyof F]: unknown;
} & BaseModel;

/**
 * Dynamically create a BaseModel subclass from a field map (generics / factory helper).
 *
 * @example
 * const User = createModel('User', {
 *   name: { type: String, minLength: 1 },
 *   age: { type: Number, ge: 0 },
 * }, { extra: 'forbid' });
 * const u = User.modelValidate({ name: 'Ada', age: 36 });
 */
export function createModel<F extends CreateModelFields>(
    name: string,
    fields: F,
    config: ConfigDict = {},
): typeof BaseModel & (new (data?: unknown) => InferCreateModelInstance<F>) {
    class DynamicModel extends BaseModel {}
    Object.defineProperty(DynamicModel, 'name', { value: name });

    modelConfig({ ...DynamicModel.modelConfig, ...config })(DynamicModel);

    for (const [fieldName, info] of Object.entries(fields)) {
        Field(info)(DynamicModel.prototype, fieldName);
    }

    return DynamicModel as typeof BaseModel &
        (new (data?: unknown) => InferCreateModelInstance<F>);
}

/**
 * Specialize a model by merging extra fields onto a base class.
 */
export function extendModel<F extends CreateModelFields>(
    base: typeof BaseModel,
    name: string,
    fields: F,
    config?: ConfigDict,
): typeof BaseModel & (new (data?: unknown) => InferCreateModelInstance<F>) {
    class Extended extends base {}
    Object.defineProperty(Extended, 'name', { value: name });

    const mergedConfig = {
        ...((base as { modelConfig?: ConfigDict }).modelConfig ?? {}),
        ...config,
    };
    modelConfig(mergedConfig)(Extended);

    for (const [fieldName, info] of Object.entries(fields)) {
        Field(info)(Extended.prototype, fieldName);
    }

    return Extended as typeof BaseModel &
        (new (data?: unknown) => InferCreateModelInstance<F>);
}
