# Complex schemas (V2)

How `@Field` options become CoreSchema, and how the compiler treats them.

Read after [../phases/02-core/06-full-engine-v2.md](../phases/02-core/06-full-engine-v2.md) and [../phases/03-typedantic/06-full-api-v2.md](../phases/03-typedantic/06-full-api-v2.md).

## Integer vs number

JavaScript has one numeric type: IEEE-754 `number`. There is no `float`. Integers are a predicate (`Number.isInteger`), not a language type.

| You write | IR | Accepts |
|-----------|-----|---------|
| `@Field({ type: Number })` or `'int'` | `{ type: 'int' }` | integers only (`1` yes, `1.5` no) |
| `@Field({ type: 'number' })` | `{ type: 'number' }` | any finite JS number |

This matches V1’s “Number → int” choice. Do not name the IEEE node `float` — that is Python, not JavaScript.

## Collections

IR nodes are `array` and `object` — the JS names. `array` is `Array.isArray`. `object` is a plain key/value map (`Record`), not the `Object` constructor and not a model.

```ts
@Field({ type: Array, items: LineItem, minLength: 1 })
items!: LineItem[];

@Field({ type: 'object', values: Number, keys: String })
scores!: Record<string, number>;
```

`type: Array` is accepted because `design:type` is `Array`. Prefer `type: 'array'` when you write the type yourself.

`keys` is compiled (`keysSchema`). Keys from `Object.entries` are strings, so `keys: String` plus `minLength` is the usual constraint.

Do **not** write `@Field({ type: Object })` and expect an open object. Pass `type: 'object'` or `values` / `keys`. `model-fields` is the shaped class; `'object'` is the open map.

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
