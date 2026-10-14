# `@typedantic/core`

Zero-dependency schema IR, compiler, `SchemaValidator`, `SchemaSerializer`, and JSON Schema for Typedantic.

```bash
npm install @typedantic/core
```

```ts
import { SchemaValidator, SchemaSerializer, toJsonSchema, ValidationError } from '@typedantic/core';

const schema = {
  type: 'model-fields' as const,
  fields: {
    age: { schema: { type: 'int' as const, ge: 0 }, required: true },
  },
  extra: 'forbid' as const,
};

const v = new SchemaValidator(schema);
console.log(v.validateModel({ age: 36 }));
console.log(toJsonSchema(schema));
console.log(new SchemaSerializer(schema).dump({ age: 36 }, { mode: 'json' }));
```

Most apps should use [`@typedantic/model`](https://www.npmjs.com/package/@typedantic/model).

**Docs:** [GitHub documentation](https://github.com/dfunani/typedantic/tree/main/documentation)

**License:** MIT
