import 'reflect-metadata';

type ReflectMetadata = {
  getMetadata?(key: string, target: object, propertyKey?: string | symbol): unknown;
  defineMetadata?(key: string, value: unknown, target: object, propertyKey?: string | symbol): void;
};

const reflect = Reflect as ReflectMetadata;

export function getMetadata(key: string | symbol, target: object, propertyKey?: string | symbol): unknown {
  return reflect.getMetadata?.(key as string, target, propertyKey);
}

export function defineMetadata(
  key: string | symbol,
  value: unknown,
  target: object,
  propertyKey?: string | symbol,
): void {
  reflect.defineMetadata?.(key as string, value, target, propertyKey);
}
