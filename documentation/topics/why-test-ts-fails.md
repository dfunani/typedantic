# Why `test.ts` cannot work yet

## The failing consumer

```ts
import { Field } from "./packages/typedantic/src/private/field";
import { Model } from "./packages/typedantic/src/private/model";

class Test extends Model {
  @Field({ type: Number })
  flag: number;
}

const test = new Test({ flag: 10 });
console.log(test.flag);
```

## Failure chain

| Step | What happens | Why |
|------|--------------|-----|
| 1 | Bun: `Cannot find module .../model` | `Model` / `BaseModel` file was never written |
| 2 | Even with a stub Model | Constructor does not validate or assign |
| 3 | `@Field` only registers metadata | Registry stores `schema: { type: 'any' }` |
| 4 | Core has no `any` / no `model-fields` | Cannot validate a whole object of fields |
| 5 | No public `index.ts` / `dist` | Package import fails |
| 6 | Importing private source paths | Bypasses package boundary |

## What V1 must connect

```
@Field({ type: Number })
        │
        ▼
registerModelField(ctor, 'flag', { type: Number, ... })
        │
        ▼
buildModelSchema(ctor)
  → { type: 'model-fields', fields: { flag: { schema: { type: 'int', ... }, required: true } } }
        │
        ▼
compileValidator(schema) → ValidatorFn
        │
        ▼
SchemaValidator.validatePython({ flag: 10 })
        │
        ▼
instantiateModel(Test, { flag: 10 })
```

## Working V1 smoke test (target)

```ts
import 'reflect-metadata';
import { BaseModel, Field } from 'typedantic';

class Test extends BaseModel {
  @Field({ type: Number })
  flag!: number;
}

const test = Test.modelValidate({ flag: 10 });
console.log(test.flag); // 10
```

See [../tutorial.md](../tutorial.md) Milestone V1 checkpoint.
