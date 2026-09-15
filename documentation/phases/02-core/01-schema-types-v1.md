# Core V1 — Schema types (minimal IR)

**Path:** `packages/typedantic-core/src/schema/types.ts`

Start with only what V1 needs. You can later replace this file with the full main version from [../../reference/core-schema-types.ts.md](../../reference/core-schema-types.ts.md).

```ts
export type ValidatorFn = (value: unknown) => unknown;
export type WrapValidatorFn = (
  value: unknown,
  handler: (v: unknown) => unknown,
) => unknown;

export interface ModelFieldSchema {
  schema: CoreSchema;
  required: boolean;
  alias?: string;
  default?: unknown;
  defaultFactory?: () => unknown;
}

export interface IntSchema {
  type: 'int';
  strict?: boolean;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
}

export interface StrSchema {
  type: 'str';
  strict?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
}

export interface BoolSchema {
  type: 'bool';
  strict?: boolean;
}

export interface ModelFieldsSchema {
  type: 'model-fields';
  fields: Record<string, ModelFieldSchema>;
  modelName?: string;
  extra?: 'ignore' | 'allow' | 'forbid';
  strict?: boolean;
}

/** V1 union — expand in V2 */
export type CoreSchema = IntSchema | StrSchema | BoolSchema | ModelFieldsSchema;

export interface ValidationConfig {
  strict?: boolean;
}

export interface ValidationErrorDetail {
  type: string;
  loc: (string | number)[];
  msg: string;
  input: unknown;
  ctx?: Record<string, unknown>;
}

export interface ValidateOptions {
  strict?: boolean;
}

export interface DumpOptions {
  mode?: 'python' | 'json';
  include?: Set<string>;
  exclude?: Set<string>;
  excludeUnset?: boolean;
  excludeDefaults?: boolean;
  excludeNone?: boolean;
  byAlias?: boolean;
}
```

### Why `str` / `bool` not `string` / `boolean`?

Main uses short names matching pydantic-core vibes. Your schema builder must emit the **same** strings the compiler switches on.

### Checkpoint

```bash
bunx tsc -p packages/typedantic-core --noEmit
```

Next: [02-validation-error.md](./02-validation-error.md)
