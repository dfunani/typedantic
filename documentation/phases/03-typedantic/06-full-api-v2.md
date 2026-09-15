# Typedantic V2 — Field + schema builder how-to

V1 mapped `String` / `Number` / `Boolean` onto primitives.  
V2 teaches `inferSchemaFromType` to emit the V2 IR from [../../02-core/06-full-engine-v2.md](../02-core/06-full-engine-v2.md).

Do this **after** core V2 tests pass.

---

## What you will have

```ts
@modelConfig({ extra: 'forbid' })
class Order extends BaseModel {
  @Field({ type: Date })
  createdAt!: Date;

  @Field({ type: Array, items: String, minLength: 1 })
  tags!: string[];

  @Field({ type: 'object', values: Number, keys: String })
  scores!: Record<string, number>;

  @Field({ type: Address })
  shipping!: Address;

  @Field({ union: [Cat, Dog], discriminator: 'kind' })
  pet!: Cat | Dog;

  @Field({ type: String, nullable: true })
  note!: string | null;

  @Field({ type: 'number', ge: 0 })
  rating!: number;
}
```

`Number` stays **integer** (`type: 'int'`). Use `type: 'number'` for IEEE-754 fractions. JS has no `float`.

---

## FieldInfo extras

**Path:** `packages/typedantic/src/fields/types.ts`

Add to the V1 `FieldInfo`:

| Option | Emits |
|--------|--------|
| `items` | `array.itemsSchema` (with `type: Array` or `'array'`) |
| `values` / `keys` | `object` (also `type: 'object'`) |
| `enum` | `enum.members` |
| `literal` | `literal.expected` |
| `union` + `discriminator` | tagged or untagged `union` |
| `nullable` | wrap in `{ type: 'nullable', schema }` |

`minLength` / `maxLength` on an `Array` field apply to the **array**, not the item strings.

---

## Do not treat `Object` as an open object

`emitDecoratorMetadata` reports `Object` for `Record<string, number>`, nested POJOs, and many generics.

**Wrong:** `effective === Object` → `{ type: 'object', valuesSchema: string }`  
**Right:** emit `object` only when the caller passed `type: 'object'`, `values`, or `keys`.

```ts
if (effective === 'object' || fieldInfo?.values !== undefined || fieldInfo?.keys !== undefined) {
  return inferObjectSchema(fieldInfo);
}
```

A bare `@Field({ type: Object })` must **not** become a string-valued open object.

Nested models: if `type` is a class with `modelValidate`, emit `buildModelFieldSchema(type)` (plain objects, not nested class instances — the core engine has no constructors).

---

## `inferSchemaFromType`

**Path:** `packages/typedantic/src/fields/builders/fields.ts`

Order matters. Check `literal` / `enum` / `union` **before** `fieldInfo.type`, so `@Field({ literal: 'cat' })` does not fall through to string.

```ts
export function inferSchemaFromType(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
  const schema = inferBaseSchema(type, fieldInfo);
  return wrapNullable(schema, fieldInfo);
}

function inferBaseSchema(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
  if (fieldInfo?.literal !== undefined) {
    const expected = Array.isArray(fieldInfo.literal) ? fieldInfo.literal : [fieldInfo.literal];
    return { type: 'literal', expected };
  }
  if (fieldInfo?.enum) {
    return { type: 'enum', members: fieldInfo.enum };
  }
  if (fieldInfo?.union) {
    return {
      type: 'union',
      choices: fieldInfo.union.map((choice) => inferSchemaFromType(choice)),
      discriminator: fieldInfo.discriminator,
    };
  }

  const effective = fieldInfo?.type ?? type;

  if (effective === Date || effective === 'date') return { type: 'date' };
  if (effective === Array || effective === 'array') {
    return {
      type: 'array',
      itemsSchema: inferSchemaFromType(fieldInfo?.items ?? String),
      minLength: fieldInfo?.minLength,
      maxLength: fieldInfo?.maxLength,
    };
  }
  if (effective === 'object' || fieldInfo?.values !== undefined || fieldInfo?.keys !== undefined) {
    return {
      type: 'object',
      valuesSchema: inferSchemaFromType(fieldInfo?.values ?? String),
      keysSchema: fieldInfo?.keys ? inferSchemaFromType(fieldInfo.keys) : undefined,
    };
  }
  if (effective === 'number') {
    return getSchemaConstraints({ type: 'number' }, fieldInfo);
  }
  if (isModelConstructor(effective)) {
    return buildModelFieldSchema(effective);
  }

  return getSchemaConstraints(getBaseSchemaFromType(effective, fieldInfo), fieldInfo);
}
```

`getSchemaConstraints` must apply `ge` / `multipleOf` to **both** `int` and `number`.

`isModelConstructor` excludes `String` / `Number` / `Boolean` / `Date` / `Array` / `Object` and requires `modelValidate`.

---

## Defaults

Leave `default` / `defaultFactory` on `ModelFieldSchema` (V1). Core clones array / object `default` values. Prefer `defaultFactory: () => []` in application code.

Function wrappers (`function-before`, …) stay CoreSchema-only until field validators land. Do not invent decorator sugar in this chapter.

---

## Checkpoint

```bash
bun run build
bunx vitest run packages/typedantic
```

Then [07-tests-v2.md](./07-tests-v2.md) and the root functional scripts.
