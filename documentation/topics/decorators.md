# Deep dive: TypeScript decorators in Typedantic

## Why decorators?

```ts
class User extends BaseModel {
  @Field({ minLength: 3 })
  username!: string;
}
```

Decorators run when the class is **defined** — the right time to register fields.

## Legacy vs stage-3

Typedantic uses **legacy** (`experimentalDecorators`). Do not mix with stage-3.

## `@Field` execution order

1. Class body evaluated
2. `Field(options)` returns a decorator function
3. That function receives `(target, propertyKey)`
4. Reads `design:type`, calls `registerModelField`
5. Later `BaseModel.modelValidate` builds CoreSchema from registry

**Nothing validates in the decorator** — decorators only collect metadata.

## Static validators

```ts
@fieldValidator('username', { mode: 'before' })
static normalize(v: unknown): unknown {
  return typeof v === 'string' ? v.trim() : v;
}
```

## Further reading

- [reflect-metadata.md](./reflect-metadata.md)
- [../phases/03-typedantic/02-field-and-registry.md](../phases/03-typedantic/02-field-and-registry.md)
