# 3.3 — Schema builder (`getModelFields`)

Files:

- `packages/typedantic/src/fields/builders/schema.ts` — **`getModelFields`**, type → primitive IR
- `packages/typedantic/src/fields/builders/fields.ts` — `buildModelFieldSchema`, `inferSchemaFromType`

There is no `collectModelFields` — the public API name is **`getModelFields`**.

## `getModelFields`

`schema.ts`:

```ts
export function getModelFields(ctor: Function): Record<string, ModelFieldMeta> {
    const registered = getRegisteredFields(ctor);
    if (Object.keys(registered).length === 0) return {};
    return finalizeRegisteredFields(ctor, inferSchemaFromType);
}
```

Call this before building a model-level schema or when hydrating nested unions (factories use it internally).

## JS constructors → IR (`getBaseSchemaFromType`)

```ts
export function getBaseSchemaFromType(type: unknown, fieldInfo?: FieldInfo): BaseSchema {
    if (type === String || type === 'string') return { type: 'string' };
    if (type === Number || type === 'int') return { type: 'int' };
    if (type === 'number') return { type: 'number' };
    if (type === Boolean || type === 'boolean') return { type: 'boolean' };
    if (type === Date || type === 'date') return { type: 'date' };

    if (!fieldInfo) return { type: 'string' };

    if (isNumberConstraint(fieldInfo)) return { type: 'int' };
    if (isStringConstraint(fieldInfo)) return { type: 'string' };

    return { type: 'string' };
}
```

Merge constraints via `getSchemaConstraints` for string/int/number schemas (`minLength`, `ge`, `strict`, etc.).

## Model-level schema

`fields.ts` — `buildModelFieldSchema`:

```ts
export function buildModelFieldSchema(ctor: Function, config?: ConfigDict): BaseSchema {
    const fields = getModelFields(ctor);
    const modelConfig = config ?? ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {});

    const modelFields: Record<string, ModelFieldSchema> = {};
    for (const [name, meta] of Object.entries(fields)) {
        modelFields[name] = {
            schema: meta.schema,
            required: meta.required,
            alias: meta.alias,
            default: meta.default,
            defaultFactory: meta.defaultFactory,
        };
    }

    return {
        type: 'model-fields',
        fields: modelFields,
        modelName: ctor.name,
        extra: modelConfig.extra ?? 'ignore',
        strict: modelConfig.strict,
    };
}
```

## `inferSchemaFromType` (V1 subset)

For rebuild V1, ensure these paths work:

- Primitives via `getBaseSchemaFromType` + constraints
- Nested model: constructor with `modelValidate` → recursive `buildModelFieldSchema`
- V2 in same file: `literal`, `enum`, `union`, `array`, `object`, `nullable` wrappers

Detection of nested models:

```ts
function isModelConstructor(type: unknown): type is Function {
    return typeof type === 'function'
        && type !== String && type !== Number && type !== Boolean
        && type !== Date && type !== Array && type !== Object
        && typeof (type as { modelValidate?: unknown }).modelValidate === 'function';
}
```

## Manual check

```ts
import { getModelFields } from '@typedantic/model';

const fields = getModelFields(User);
console.log(fields.email.schema); // { type: 'string', minLength: 1, ... }
```

## Checklist

- [ ] Export `getModelFields` from package `index.ts`
- [ ] `Number` → `{ type: 'int' }`, `'number'` → `{ type: 'number' }`
- [ ] `buildModelFieldSchema` passes `extra` / `strict` from `modelConfig`

Next: [04-base-model-v1.md](./04-base-model-v1.md)
