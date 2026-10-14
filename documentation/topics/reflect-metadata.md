# Deep dive: `fields/properties.ts` and `reflect-metadata`

**File:** `packages/typedantic/src/fields/properties.ts`  
**Related:** [decorators.md](./decorators.md), [../phases/03-typedantic/01-reflect-and-metadata.md](../phases/03-typedantic/01-reflect-and-metadata.md)

There is no separate `internal/reflect.ts` in the current tree — metadata helpers live next to the field registry.

## What problem does it solve?

TypeScript types (`string`, `number`) **erase at runtime**. After compile, a class has no knowledge that `name` is a string.

Typedantic needs runtime type info to build a `BaseSchema`.  
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

## What `properties.ts` provides

Side-effect import loads the polyfill once, then thin wrappers:

```ts
import 'reflect-metadata';

export function getFieldPropertyMetadata(key, target, propertyKey?): unknown;
export function defineFieldPropertyMetadata(key, value, target, propertyKey?): void;
export function getRegisteredFields(ctor): Record<string, ModelFieldMeta>;
export function defineFieldProperty(ctor, name, value): void;
```

Optional chaining on `Reflect` keeps tests from crashing if metadata APIs are absent.

### Constructor vs prototype

| Decorator on | `target` is |
|--------------|-------------|
| Instance property/method | **prototype** |
| Static method | **constructor** |

Field registration normalizes to the **constructor** (`ctorOf`) so metadata and `MODEL_FIELDS_REGISTRY` stay on the class function, not the prototype.

## Where to learn more

- [reflect-metadata on npm](https://www.npmjs.com/package/reflect-metadata)
- TypeScript handbook: Decorators (legacy)

## Checklist

- [ ] `experimentalDecorators: true`
- [ ] `emitDecoratorMetadata: true`
- [ ] `useDefineForClassFields: false`
- [ ] `import 'reflect-metadata'` once at app entry
- [ ] Prefer explicit `type` in `@Field({ type: ... })`
