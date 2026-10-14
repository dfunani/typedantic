# Common pitfalls when rebuilding

## Build before consume

Packages import each other via **`dist`**. Always:

```bash
bun run build
bun run test
bun run functional-test
```

If you change `@typedantic/core`, rebuild before testing `@typedantic/model`.

## Import the public packages

```ts
import 'reflect-metadata'; // once, before any model class loads
import { BaseModel, Field } from '@typedantic/model';
import { BaseSettings, settingsConfig } from '@typedantic/settings';
import { ValidationError } from '@typedantic/core'; // or from @typedantic/model
```

Do **not** import private source paths like `packages/.../src/...` from consumers.

## Decorators need tsconfig flags

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

Under Vitest, `design:type` is often missing — pass explicit
`@Field({ type: String })` (or `Number` / `Boolean` / nested class).

## IR names vs Field constructors

| Write in `@Field` | Emit in IR |
|-------------------|------------|
| `type: String` | `{ type: 'string' }` |
| `type: Number` | `{ type: 'int' }` |
| `type: 'number'` | `{ type: 'number' }` |
| `type: Boolean` | `{ type: 'boolean' }` |

If the compiler switches on `'str'` / `'bool'` but the builder emits `'string'` /
`'boolean'`, nothing validates.

## Validator API

Use **`validateModel`**, not `validatePython`. Errors use **`location`** /
**`message`**. Serialize with **`toJson()`** → `{ detail }`.

## Nested models stay plain until hydration

Core returns plain objects. `@typedantic/model` must call
`buildBaseModelInstance` → `hydrateFieldValue` so nested fields, unions, and
array items become class instances. Settings nested env tests depend on this.

## Mutable defaults

Prefer `defaultFactory: () => []` over `default: []` so instances do not share
the same array.

## Smoke entrypoints

There is no root `test.ts` in this repo. Use:

```bash
bun tests/basic.ts
bun run functional-test
```

## See also

- [../phases/05-ship/README.md](../phases/05-ship/README.md) troubleshooting table
- [../tutorial.md](../tutorial.md)
