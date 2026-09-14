# Public exports + V1 smoke test

## `packages/typedantic/src/index.ts` (V1)

```ts
export { BaseModel, ValidationError } from './models/base-model.js';
export { Field } from './fields/field.js';
export { modelConfig, getModelConfig } from './config/model-config.js';
export type { FieldInfo, ConfigDict } from './internal/metadata.js';
export type { CoreSchema, ValidationErrorDetail } from '@typedantic/core';
export { SchemaValidator, validate } from '@typedantic/core';
```

## Build

```bash
bun run --filter @typedantic/core build
bun run --filter typedantic build
```

## Smoke test — replace root `test.ts`

```ts
import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from 'typedantic';

@modelConfig({ extra: 'forbid' })
class Test extends BaseModel {
  @Field({ type: Number, ge: 0 })
  flag!: number;

  @Field({ type: String, minLength: 1 })
  name!: string;

  @Field({ type: Boolean })
  active!: boolean;
}

const ok = Test.modelValidate({ flag: 10, name: 'Ada', active: true });
console.log(ok.modelDump());

try {
  Test.modelValidate({ flag: 'nope', name: 'Ada', active: true });
} catch (e) {
  console.log('expected error', e);
}
```

Run (after workspace link resolves `typedantic`):

```bash
bun test.ts
```

If package name resolution fails from repo root, temporarily:

```ts
import { BaseModel, Field } from './packages/typedantic/src/index.ts';
```

…but the **goal** is package imports.

## Acceptance for Milestone V1

- [ ] Core tests for int/bool/str/model-fields pass
- [ ] `Test.modelValidate` returns instance with fields
- [ ] Bad types throw `ValidationError` with `json()` → `{ detail: [...] }`
- [ ] `extra: 'forbid'` rejects unknown keys
- [ ] `bun run build` succeeds for core + typedantic

Next: [06-full-api-v2.md](./06-full-api-v2.md) or [../04-settings/README.md](../04-settings/README.md)
