# Deep dive: `reflect.ts` and `reflect-metadata`

**File (main):** `packages/typedantic/src/internal/reflect.ts`  
**Related:** [decorators.md](./decorators.md), [../phases/03-typedantic/01-reflect-and-metadata.md](../phases/03-typedantic/01-reflect-and-metadata.md)

## What problem does it solve?

TypeScript types (`string`, `number`) **erase at runtime**. After compile, a class has no knowledge that `name` is a string.

Pydantic-for-TypeScript needs runtime type info to build a `CoreSchema`.  
`reflect-metadata` + `emitDecoratorMetadata` recovers a limited form of that info.

## What `emitDecoratorMetadata` emits

With tsconfig:

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
  "useDefineForClassFields": false
}
```

a decorated property `@Field() age!: number` causes TypeScript to emit metadata equivalent to:

```js
__metadata("design:type", Number)
```

Then at runtime:

```ts
Reflect.getMetadata('design:type', User.prototype, 'age') // → Number
```

## Limits (critical)

| You write | `design:type` at runtime |
|-----------|--------------------------|
| `name!: string` | `String` |
| `age!: number` | `Number` (cannot distinguish `int` vs IEEE `number`) |
| `ok!: boolean` | `Boolean` |
| `tags!: string[]` | `Array` — **element type lost** |
| `value!: string \| null` | often `Object` |
| Vitest/esbuild | sometimes **missing** |

**Rule:** always allow explicit `@Field({ type: String })` and prefer it in tests.

## What `reflect.ts` is

A thin wrapper so the rest of the codebase does not call `Reflect.*` directly:

```ts
import 'reflect-metadata';

type ReflectMetadata = {
  getMetadata?(key: string | symbol, target: object, propertyKey?: string | symbol): unknown;
  defineMetadata?(
    key: string | symbol,
    value: unknown,
    target: object,
    propertyKey?: string | symbol,
  ): void;
};

const reflect = Reflect as ReflectMetadata;

export function getMetadata(
  key: string | symbol,
  target: object,
  propertyKey?: string | symbol,
): unknown {
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
```

### Why wrap?

1. Side effect import loads the polyfill once
2. Optional chaining if APIs missing
3. Single place to swap storage later

### Constructor vs prototype

| Decorator on | `target` is |
|--------------|-------------|
| Instance property/method | **prototype** |
| Static method | **constructor** |

Always normalize:

```ts
function ctorOf(target: object): Function {
  return typeof target === 'function' ? target : target.constructor;
}
```

## Where to learn more

- [reflect-metadata on npm](https://www.npmjs.com/package/reflect-metadata)
- TypeScript handbook: Decorators (legacy)

## Checklist

- [ ] `experimentalDecorators: true`
- [ ] `emitDecoratorMetadata: true`
- [ ] `useDefineForClassFields: false`
- [ ] `import 'reflect-metadata'` once at app entry
- [ ] Prefer explicit `type` in `@Field({ type: ... })`
