import { getMetadata, defineMetadata } from '../internal/reflect.js';

const FIELD_SERIALIZER_KEY = Symbol('typedantic:fieldSerializers');
const MODEL_SERIALIZER_KEY = Symbol('typedantic:modelSerializers');

export function fieldSerializer(...fields: string[]) {
  return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const ctor = _target.constructor;
    const existing =
      (getMetadata(FIELD_SERIALIZER_KEY, ctor) as Array<{
        fields: string[];
        fn: (value: unknown) => unknown;
      }>) ?? [];
    existing.push({ fields, fn: descriptor.value as (value: unknown) => unknown });
    defineMetadata(FIELD_SERIALIZER_KEY, existing, ctor);
  };
}

export function modelSerializer(mode: 'plain' | 'wrap' = 'plain') {
  return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const ctor = _target.constructor;
    const existing =
      (getMetadata(MODEL_SERIALIZER_KEY, ctor) as Array<{
        mode: 'plain' | 'wrap';
        fn: (...args: unknown[]) => unknown;
      }>) ?? [];
    existing.push({ mode, fn: descriptor.value as (...args: unknown[]) => unknown });
    defineMetadata(MODEL_SERIALIZER_KEY, existing, ctor);
  };
}

export function applyFieldSerializers(
  ctor: Function,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const serializers =
    (getMetadata(FIELD_SERIALIZER_KEY, ctor) as Array<{
      fields: string[];
      fn: (value: unknown) => unknown;
    }>) ?? [];

  const result = { ...data };
  for (const ser of serializers) {
    for (const field of ser.fields) {
      if (field in result) {
        result[field] = ser.fn(result[field]);
      }
    }
  }
  return result;
}

export function getModelSerializers(ctor: Function) {
  return (getMetadata(MODEL_SERIALIZER_KEY, ctor) as Array<{
    mode: 'plain' | 'wrap';
    fn: (...args: unknown[]) => unknown;
  }>) ?? [];
}
