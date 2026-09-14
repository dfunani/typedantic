# Deep dive: CoreSchema intermediate representation

**File:** `packages/typedantic-core/src/schema/types.ts`

## Idea

```
Class + @Field metadata  →  CoreSchema  →  ValidatorFn  →  validated data
```

## Discriminated union on `type`

| `type` | Meaning | V1? |
|--------|---------|-----|
| `int` | Integer | Yes |
| `bool` / `str` | Boolean / string | Yes |
| `model-fields` | Object with named fields | **Required for V1** |
| `list`, `dict`, `union`, … | Collections / choices | V2 |

> Main uses `bool`/`str`. Pick one convention and keep builder + compiler aligned.

## Model field node

```ts
{
  type: 'model-fields',
  modelName: 'User',
  extra: 'forbid',
  fields: {
    age: { schema: { type: 'int', ge: 0 }, required: true },
  },
}
```

Without `model-fields`, `@Field` has nowhere to compile to.

## See also

- [../reference/core-schema-types.ts.md](../reference/core-schema-types.ts.md)
- [../phases/02-core/03-compiler-v1.md](../phases/02-core/03-compiler-v1.md)
