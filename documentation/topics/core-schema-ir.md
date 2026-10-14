# CoreSchema / BaseSchema IR

Typedantic’s engine does not validate TypeScript types directly. The DX layer
builds a **JSON-like IR** (`BaseSchema`), then `compileValidator` turns that into
a `ValidatorFunction`.

```
Class + @Field metadata  →  BaseSchema  →  ValidatorFunction  →  validated data
```

In code the union type is named **`BaseSchema`** (`packages/typedantic-core/src/schema/types.ts`).
Docs sometimes say “CoreSchema” for the same idea — prefer **`BaseSchema`**.

## Discriminated union on `type`

| `type` | Meaning | Milestone |
|--------|---------|-----------|
| `int` | Integer (coerces numeric strings unless `strict`) | V1 |
| `number` | Float / number | V2 |
| `string` | String | V1 |
| `boolean` | Boolean | V1 |
| `literal` | Exact value set | V2 |
| `enum` | Closed string set | V2 |
| `model-fields` | Object with named fields | **V1 required** |
| `array`, `object`, `union` | Collections / choices | V2 |
| `nullable`, `optional`, `default`, `default-factory` | Wrappers | V2 |
| `date` | Date / ISO string | V2 |
| `function-*` | Before/after/wrap/plain hooks | V2 |
| `any`, `never` | Escape hatches | V2 |

> Field decorators use JS constructors (`String`, `Number`, `Boolean`). The IR
> uses lowercase strings (`string`, `int`, `boolean`). Align builder + compiler
> on the IR names.

## Model field node

```ts
{
  type: 'model-fields',
  modelName: 'User',
  extra: 'forbid',
  fields: {
    name: { schema: { type: 'string', minLength: 1 }, required: true },
    age: { schema: { type: 'int', ge: 0 }, required: true },
    active: { schema: { type: 'boolean' }, required: true },
  },
}
```

Without `model-fields`, `@Field` has nowhere to compile to.

## Error shape

Validation details use **`location`** / **`message`** (not `loc` / `msg`):

```ts
{
  type: 'missing',
  location: ['age'],
  message: 'Field required',
  input: undefined,
}
```

`ValidationError.toJson()` returns `{ detail: [...] }` (FastAPI-style).

## See also

- Live types: `packages/typedantic-core/src/schema/types.ts`
- [../reference/core-schema-types.ts.md](../reference/core-schema-types.ts.md)
- Compiler: [../phases/02-core/06-full-engine-v2.md](../phases/02-core/06-full-engine-v2.md)
