# 3.5 — Public exports and smoke test

## Package exports (`packages/typedantic/src/index.ts`)

0.1 **exact** surface:

```ts
export { BaseModel } from './models/base-model.js';
export { Field } from './fields/decorator.js';
export { modelConfig, getModelConfig } from './config/model-config.js';
export type { FieldInfo, ConfigDict } from './fields/types.js';
export { getModelFields } from './fields/builders/schema.js';
export { ValidationError } from '@typedantic/core';
```

**Not exported** (even if files exist elsewhere):

- TypeAdapter
- Field / model validator decorators
- JSON Schema export
- SchemaSerializer

Core’s serializer under `packages/typedantic-core/src/serializer/` is likewise not re-exported from `@typedantic/core` in 0.1.

## Build and test

```bash
bun run build
bun run test -- packages/typedantic
```

Package tests live in `packages/typedantic/tests/` (`base-model.test.ts`, `field-schema.test.ts`, …).

## Functional smoke — `tests/basic.ts`

Root script: `"functional-test": "bun run --parallel tests/*.ts"`.

There is **no** root `test.ts`. Smoke is **`tests/basic.ts`**:

```ts
import 'reflect-metadata';
import { BaseModel, Field, modelConfig } from '@typedantic/model';

@modelConfig({ extra: 'ignore' })
class Test extends BaseModel {
    @Field({ type: Number, ge: 0, strict: false })
    flag!: number;

    @Field({ type: String, minLength: 1 })
    name!: string;

    @Field({ type: Boolean })
    active!: boolean;
}

const ok = Test.modelValidate({ flag: 10, name: 'Ada', active: true, extra_field: 'ignore' });
console.log(ok.modelDump());

try {
    Test.modelValidate({ flag: '1', name: 'Ada', active: true });
} catch (e) {
    console.log('expected error', e);
}
```

Run:

```bash
bun run functional-test
```

CI runs the same sequence after unit tests (see [Phase 1 CI](../01-scaffold/README.md)).

## Consumer imports

```ts
import 'reflect-metadata';
import { BaseModel, Field, modelConfig, getModelFields } from '@typedantic/model';
import { ValidationError } from '@typedantic/core'; // or from @typedantic/model
```

Do not import from `packages/typedantic/src/...` in app code.

## Pitfalls

- Stale `dist/` after core changes → [common-pitfalls.md](../../topics/common-pitfalls.md)
- Missing decorator tsconfig flags
- Forgetting `reflect-metadata` side effect import

## Next phases

- [Phase 4 — `@typedantic/settings`](../04-settings/README.md)
- [Phase 5 — Ship](../05-ship/README.md)
