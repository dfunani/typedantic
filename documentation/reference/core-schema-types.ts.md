# `packages/typedantic-core/src/schema/types.ts` (+ schema model tags)

**Package:** `@typedantic/core`  
**Note:** Live source (0.1) — authoritative for rebuild. Prefer phase pages for teaching order.

`BaseSchema` is the discriminated union of all IR node types. Model tag interfaces live under `schema/models/`.

## `schema/types.ts`

```ts
import { IntSchema, NumbersSchema, StringSchema, BooleanSchema, LiteralSchema, AnySchema, NeverSchema } from "./models/primitives.js";
import { ModelFieldsSchema } from "./models/fields.js";
import { ArraySchema } from "./models/complex/arrays.js";
import { ObjectSchema } from "./models/complex/objects.js";
import { UnionSchema } from "./models/complex/field-properties.js";
import { NullableSchema } from "./models/complex/field-properties.js";
import { OptionalSchema } from "./models/complex/field-properties.js";
import { DefaultSchema } from "./models/complex/field-properties.js";
import { DefaultFactorySchema } from "./models/complex/field-functions.js";
import { FunctionBeforeSchema } from "./models/complex/field-functions.js";
import { FunctionAfterSchema } from "./models/complex/field-functions.js";
import { FunctionWrapSchema } from "./models/complex/field-functions.js";
import { FunctionPlainSchema } from "./models/complex/field-functions.js";
import { DateSchema } from "./models/complex/dates.js";
import { EnumsSchema } from "./models/complex/enums.js";

export type BaseSchema =
    | IntSchema
    | NumbersSchema
    | StringSchema
    | BooleanSchema
    | LiteralSchema
    | EnumsSchema
    | ModelFieldsSchema
    | ArraySchema
    | ObjectSchema
    | UnionSchema
    | NullableSchema
    | OptionalSchema
    | DefaultSchema
    | DefaultFactorySchema
    | FunctionBeforeSchema
    | FunctionAfterSchema
    | FunctionWrapSchema
    | FunctionPlainSchema
    | DateSchema
    | AnySchema
    | NeverSchema;
```

## Schema model type tags (summary)

| `type` field | Source file |
|--------------|-------------|
| `int`, `number`, `string`, `boolean`, `literal`, `any`, `never` | `schema/models/primitives.ts` |
| `model-fields` | `schema/models/fields.ts` |
| `array` | `schema/models/complex/arrays.ts` |
| `object` | `schema/models/complex/objects.ts` |
| `union`, `nullable`, `optional`, `default` | `schema/models/complex/field-properties.ts` |
| `default-factory`, `function-before`, `function-after`, `function-wrap`, `function-plain` | `schema/models/complex/field-functions.ts` |
| `date` | `schema/models/complex/dates.ts` |
| `enum` | `schema/models/complex/enums.ts` |
| Config / error detail shapes | `schema/models/configurations.ts` |

## `schema/models/primitives.ts`

```ts
export interface IntSchema {
    type: 'int';
    strict?: boolean;
    ge?: number;
    gt?: number;
    le?: number;
    lt?: number;
    multipleOf?: number;
}

export interface NumbersSchema {
    type: 'number';
    strict?: boolean;
    ge?: number;
    gt?: number;
    le?: number;
    lt?: number;
    multipleOf?: number;
}

export interface StringSchema {
    type: 'string';
    strict?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp | string;
}

export interface BooleanSchema {
    type: 'boolean';
    strict?: boolean;
}

export interface LiteralSchema {
    type: 'literal';
    expected: unknown[];
}

export interface AnySchema {
    type: 'any';
}

export interface NeverSchema {
    type: 'never';
}
```

## `schema/models/fields.ts`

```ts
import { BaseSchema } from "../types.js";

export interface ModelFieldSchema {
    schema: BaseSchema;
    required: boolean;
    alias?: string;
    default?: unknown;
    defaultFactory?: () => unknown;
}
export interface ModelFieldsSchema {
    type: 'model-fields';
    fields: Record<string, ModelFieldSchema>;
    modelName?: string;
    extra?: 'ignore' | 'allow' | 'forbid';
    strict?: boolean;
}
```

## `schema/models/configurations.ts`

```ts
export interface ValidationConfigSchema {
    strict?: boolean;
}

export interface ValidationErrorDetailSchema {
    type: string;
    location: (string | number)[];
    message: string;
    input: unknown;
    context?: Record<string, unknown>;
}

export interface ValidationOptionsSchema {
    strict?: boolean;
}

export interface SerializationOptionsSchema {
    mode?: 'model' | 'json';
    include?: Set<string>;
    exclude?: Set<string>;
    excludeUnset?: boolean;
    excludeDefaults?: boolean;
    excludeNone?: boolean;
    byAlias?: boolean;
}
```

## `schema/models/complex/arrays.ts`

```ts
import { BaseSchema } from "../../types.js";

export interface ArraySchema {
    type: 'array';
    itemsSchema: BaseSchema;
    minLength?: number;
    maxLength?: number;
}
```

## `schema/models/complex/objects.ts`

```ts
import { BaseSchema } from "../../types.js";


export interface ObjectSchema {
    type: 'object';
    valuesSchema: BaseSchema;
    keysSchema?: BaseSchema;
}
```

## `schema/models/complex/field-properties.ts`

```ts
import { BaseSchema } from "../../types.js";


export interface UnionSchema {
    type: 'union';
    choices: BaseSchema[];
    discriminator?: string;
}

export interface NullableSchema {
    type: 'nullable';
    schema: BaseSchema;
}

export interface OptionalSchema {
    type: 'optional';
    schema: BaseSchema;
}

export interface DefaultSchema {
    type: 'default';
    schema: BaseSchema;
    defaultValue: unknown;
}
```

## `schema/models/complex/field-functions.ts`

```ts
import { DecoratorValidatorFunction, ValidatorFunction } from "../../../compiler/compile.js";
import { BaseSchema } from "../../types.js";


export interface DefaultFactorySchema {
    type: 'default-factory';
    schema: BaseSchema;
    factory: () => unknown;
}


export interface FunctionBeforeSchema {
    type: 'function-before';
    schema: BaseSchema;
    fn: ValidatorFunction;
}

export interface FunctionAfterSchema {
    type: 'function-after';
    schema: BaseSchema;
    fn: ValidatorFunction;
}

export interface FunctionWrapSchema {
    type: 'function-wrap';
    schema: BaseSchema;
    fn: DecoratorValidatorFunction;
}

export interface FunctionPlainSchema {
    type: 'function-plain';
    fn: ValidatorFunction;
}
```

## `schema/models/complex/dates.ts`

```ts
export interface DateSchema {
    type: 'date';
}
```

## `schema/models/complex/enums.ts`

```ts
export interface EnumsSchema {
    type: 'enum';
    members: readonly string[];
}
```
