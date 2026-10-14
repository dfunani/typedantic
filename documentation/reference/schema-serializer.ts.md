# `packages/typedantic-core/src/serializer/schema-serializer.ts`

**Package:** `@typedantic/core`  
**Note:** Live source (0.2) — authoritative for rebuild. Prefer phase pages for teaching order.

Public API: `SchemaSerializer`, `serializeValue`, type `DumpOptions`.

```ts
import type { SerializationOptionsSchema } from '../schema/models/configurations.js';
import type { BaseSchema } from '../schema/types.js';

export type DumpOptions = SerializationOptionsSchema & {
  fieldsSet?: Set<string>;
  fieldSerializers?: Record<
    string,
    (value: unknown, info: { mode: 'json' | 'model' }) => unknown
  >;
  computed?: Record<string, () => unknown>;
};

export class SchemaSerializer {
  constructor(private readonly schema: BaseSchema) {}
  dump(value: unknown, options?: DumpOptions): unknown;
  dumpJson(value: unknown, options?: DumpOptions): string;
  getSchema(): BaseSchema;
}

export function serializeValue(
  schema: BaseSchema,
  value: unknown,
  options?: DumpOptions,
): unknown;
```

See live file for full walk implementation (model-fields, unions, dates, wrappers).
