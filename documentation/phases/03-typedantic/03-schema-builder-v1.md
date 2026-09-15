# Schema builder V1

**Path:** `packages/typedantic/src/internal/schema-builder.ts`  
Full main (V2): [../../reference/schema-builder.ts.md](../../reference/schema-builder.ts.md)

## Responsibility

Map runtime types + `FieldInfo` → `CoreSchema`, and assemble `model-fields`.

## V1 implementation

```ts
import type { CoreSchema } from '@typedantic/core';
import type { ConfigDict, FieldInfo, ModelFieldMeta } from './metadata.js';
import { finalizeRegisteredFields, getRegisteredFields } from './field-registry.js';

export function inferSchemaFromType(type: unknown, fieldInfo?: FieldInfo): CoreSchema {
  const effective = fieldInfo?.type ?? type;
  let base = buildBaseSchema(effective);

  // Constraint hints can force str/int when design:type is missing
  if (
    fieldInfo &&
    (fieldInfo.ge !== undefined ||
      fieldInfo.gt !== undefined ||
      fieldInfo.le !== undefined ||
      fieldInfo.lt !== undefined ||
      fieldInfo.multipleOf !== undefined)
  ) {
    base = { type: 'int' };
  }
  if (
    fieldInfo &&
    (fieldInfo.minLength !== undefined ||
      fieldInfo.maxLength !== undefined ||
      fieldInfo.pattern !== undefined)
  ) {
    base = { type: 'str' };
  }

  return applyFieldConstraints(base, fieldInfo);
}

function buildBaseSchema(type: unknown): CoreSchema {
  if (type === String || type === 'string') return { type: 'str' };
  if (type === Number || type === 'number') return { type: 'int' }; // V1 choice: Number → int
  if (type === Boolean || type === 'boolean') return { type: 'bool' };
  return { type: 'str' }; // safe fallback for V1 (never emit unsupported nodes)
}

function applyFieldConstraints(schema: CoreSchema, fieldInfo?: FieldInfo): CoreSchema {
  if (!fieldInfo) return schema;
  if (schema.type === 'str') {
    return {
      ...schema,
      minLength: fieldInfo.minLength,
      maxLength: fieldInfo.maxLength,
      pattern: fieldInfo.pattern,
      strict: fieldInfo.strict,
    };
  }
  if (schema.type === 'int') {
    return {
      ...schema,
      ge: fieldInfo.ge,
      gt: fieldInfo.gt,
      le: fieldInfo.le,
      lt: fieldInfo.lt,
      multipleOf: fieldInfo.multipleOf,
      strict: fieldInfo.strict,
    };
  }
  return schema;
}

export function collectModelFields(ctor: Function): Record<string, ModelFieldMeta> {
  const registered = getRegisteredFields(ctor);
  if (Object.keys(registered).length === 0) return {};
  return finalizeRegisteredFields(ctor, (fieldInfo, designType) =>
    inferSchemaFromType(designType ?? String, fieldInfo),
  );
}

export function buildModelSchema(ctor: Function, config?: ConfigDict): CoreSchema {
  const fields = collectModelFields(ctor);
  const modelConfig = config ?? ((ctor as { modelConfig?: ConfigDict }).modelConfig ?? {});

  const modelFields: Record<string, import('@typedantic/core').ModelFieldSchema> = {};
  for (const [name, meta] of Object.entries(fields)) {
    let schema = meta.schema;

    // V1: apply defaults as schema wrappers if you already added default nodes to CoreSchema.
    // If not, rely on ModelFieldSchema.default / defaultFactory (supported by compileModelFields).
    modelFields[name] = {
      schema,
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

### Mapping table (memorize)

| TS / Field type | CoreSchema |
|-----------------|------------|
| `String` | `{ type: 'str' }` |
| `Number` | `{ type: 'int' }` (V1) |
| `Boolean` | `{ type: 'bool' }` |
| `ge`/`le` present | force `int` |
| `minLength` present | force `str` |

Next: [04-base-model-v1.md](./04-base-model-v1.md)
