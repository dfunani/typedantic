# 3.2 — `@Field` and registry

Files:

- `packages/typedantic/src/fields/decorator.ts`
- `packages/typedantic/src/fields/registry.ts`

## Field decorator

`decorator.ts`:

```ts
import { getFieldPropertyMetadata } from './properties.js';
import { registerModelField } from './registry.js';
import type { FieldInfo } from './types.js';

export function Field<T = unknown>(options: FieldInfo<T> = {}) {
    return (target: object, propertyKey: string | symbol): void => {
        const designType = getFieldPropertyMetadata('design:type', target, propertyKey);
        const fieldOptions: FieldInfo<T> = { ...options };
        if (!fieldOptions.type && designType && designType !== Object) {
            fieldOptions.type = designType;
        }
        registerModelField(target.constructor, String(propertyKey), fieldOptions);
    };
}
```

Order of precedence for runtime type:

1. Explicit `options.type` from `@Field({ type: Number })`
2. Else `design:type` from TypeScript emit (when present)
3. Finalized later in `finalizeRegisteredFields` if still missing

## Register and finalize

`registry.ts`:

```ts
export function registerModelField(ctor: Function, name: string, fieldInfo: FieldInfo): void {
    const registry = (getFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, ctor) as Record<string, ModelFieldMeta>) ?? {};
    const hasDefault = fieldInfo.default !== undefined || fieldInfo.defaultFactory !== undefined;

    registry[name] = {
        name,
        fieldInfo,
        schema: { type: 'string' }, // placeholder until getModelFields runs
        required: !hasDefault,
        alias: fieldInfo.alias,
        default: fieldInfo.default,
        defaultFactory: fieldInfo.defaultFactory,
    };

    defineFieldPropertyMetadata(MODEL_FIELDS_REGISTRY, registry, ctor);
    defineFieldProperty(ctor, 'modelFields', registry);
}

export function finalizeRegisteredFields(
    ctor: Function,
    buildSchema: (type: unknown, fieldInfo?: FieldInfo) => BaseSchema,
): Record<string, ModelFieldMeta> {
    const registry = getRegisteredFields(ctor);
    const prototype = ctor.prototype as object;

    for (const [, meta] of Object.entries(registry)) {
        const designType = getFieldPropertyMetadata('design:type', prototype, meta.name);
        const fieldType = meta.fieldInfo?.type ?? (designType !== Object ? designType : undefined);
        meta.schema = buildSchema(fieldType ?? String, meta.fieldInfo);
    }

    defineFieldProperty(ctor, 'modelFields', registry);
    return registry;
}
```

**Note:** `buildSchema` is `inferSchemaFromType` from `fields/builders/fields.ts` (next chapter).

## Example model (explicit types for tests)

```ts
import 'reflect-metadata';
import { BaseModel, Field } from '@typedantic/model';

class Profile extends BaseModel {
    @Field({ type: String, minLength: 1 })
    name!: string;

    @Field({ type: Number, ge: 0 })
    score!: number;
}
```

After `getModelFields(Profile)`, each `meta.schema` should reflect IR (`string`, `int`, constraints merged).

## Checklist

- [ ] `@Field()` registers on `target.constructor`, not prototype instance
- [ ] Fields with `default` / `defaultFactory` are not `required`
- [ ] `modelFields` property exposed on constructor for debugging

Next: [03-schema-builder-v1.md](./03-schema-builder-v1.md)
