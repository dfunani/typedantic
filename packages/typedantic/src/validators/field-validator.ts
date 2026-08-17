import { getMetadata, defineMetadata } from '../internal/reflect.js';
import type { ValidatorMode, ModelValidatorMode } from '../internal/metadata.js';
import { FIELD_VALIDATORS_KEY, MODEL_VALIDATORS_KEY } from '../internal/metadata.js';

const COMPUTED_FIELDS_KEY = Symbol('typedantic:computedFields');

export function getComputedFields(ctor: Function): string[] {
  return (getMetadata(COMPUTED_FIELDS_KEY, ctor.prototype) as string[]) ?? [];
}

export function fieldValidator(
  ...fields: string[]
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void;
export function fieldValidator(
  field: string,
  options: { mode?: ValidatorMode },
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void;
export function fieldValidator(
  ...args: [string, { mode?: ValidatorMode }?] | string[]
): (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => void {
  let fields: string[];
  let mode: ValidatorMode = 'after';

  if (args.length >= 2 && typeof args[1] === 'object') {
    fields = [args[0] as string];
    mode = (args[1] as { mode?: ValidatorMode }).mode ?? 'after';
  } else {
    fields = args as string[];
  }

  return (target, _propertyKey, descriptor) => {
    const existing =
      (getMetadata(FIELD_VALIDATORS_KEY, target) as Array<{
        fields: string[];
        mode: ValidatorMode;
        fn: (...args: unknown[]) => unknown;
      }>) ?? [];

    existing.push({ fields, mode, fn: descriptor.value as (...args: unknown[]) => unknown });
    defineMetadata(FIELD_VALIDATORS_KEY, existing, target);
  };
}

export function modelValidator(options: { mode: ModelValidatorMode } = { mode: 'after' }) {
  return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const ctor = _target.constructor;
    const existing =
      (getMetadata(MODEL_VALIDATORS_KEY, ctor) as Array<{
        mode: ModelValidatorMode;
        fn: (...args: unknown[]) => unknown;
      }>) ?? [];

    existing.push({ mode: options.mode, fn: descriptor.value as (...args: unknown[]) => unknown });
    defineMetadata(MODEL_VALIDATORS_KEY, existing, ctor);
  };
}

export function computedField(): (
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => void {
  return (target, propertyKey, descriptor) => {
    const existing = (getMetadata(COMPUTED_FIELDS_KEY, target) as string[]) ?? [];
    existing.push(String(propertyKey));
    defineMetadata(COMPUTED_FIELDS_KEY, existing, target);
    descriptor.enumerable = true;
    return descriptor;
  };
}
