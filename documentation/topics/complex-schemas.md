# Complex schemas (V2)

How `@Field` options become CoreSchema, and how the compiler treats them.

Read after [../phases/02-core/06-full-engine-v2.md](../phases/02-core/06-full-engine-v2.md) and [../phases/03-typedantic/06-full-api-v2.md](../phases/03-typedantic/06-full-api-v2.md).

## Integer vs float

| You write | IR | Accepts |
|-----------|-----|---------|
| `@Field({ type: Number })` | `{ type: 'number' }` | integers only (`1` yes, `1.5` no) |
| `@Field({ type: 'float' })` | `{ type: 'float' }` | any finite number |

This matches V1’s “Number → int” choice and main’s separate `int` / `float` compilers.

## Collections

```ts
@Field({ type: Array, items: LineItem, minLength: 1 })
items!: LineItem[];

@Field({ type: 'dict', values: Number, keys: String })
scores!: Record<string, number>;
```

`keys` is compiled (`keysSchema`). Keys from `Object.entries` are strings, so `keys: String` plus `minLength` is the usual constraint.

Do **not** write `@Field({ type: Object })` and expect a dict. Pass `type: 'dict'` or `values` / `keys`.

## Tagged unions

```ts
@Field({ union: [Cat, Dog], discriminator: 'kind' })
pet!: Cat | Dog;
```

Each variant needs a `literal` (or default) on the discriminator field. An unknown tag errors; the compiler does not try the other models.

## Nested models

`@Field({ type: Address })` inlines Address’s `model-fields` schema. Validated nested values are **plain objects**, not `Address` instances.

## Nullable vs optional vs default

| Option | Missing key | `null` | `undefined` value |
|--------|-------------|--------|-------------------|
| required field | error | inner schema | inner schema |
| `nullable: true` | error if required | allowed | inner schema |
| `default` / `defaultFactory` | fill then validate | inner schema | fill then validate |

Core clones array / object `default` values. Prefer `defaultFactory: () => []`.

## Errors

Messages include the **constraint** (`ge: 1` → “greater than or equal to 1”).  
`location` is a path array (`['items', 0, 'qty']`).  
`ValidationError.toJson()` is `{ detail: [...] }`.
