export type ValidatorFn = (value: unknown) => unknown;
export type WrapValidatorFn = (value: unknown, handler: (v: unknown) => unknown) => unknown;

export interface ModelFieldSchema {
  schema: CoreSchema;
  required: boolean;
  alias?: string;
  default?: unknown;
  defaultFactory?: () => unknown;
}

export interface CoreSchemaBase {
  type: string;
}

export interface AnySchema extends CoreSchemaBase {
  type: 'any';
}

export interface NeverSchema extends CoreSchemaBase {
  type: 'never';
}

export interface IntSchema extends CoreSchemaBase {
  type: 'int';
  strict?: boolean;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
}

export interface FloatSchema extends CoreSchemaBase {
  type: 'float';
  strict?: boolean;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
}

export interface StrSchema extends CoreSchemaBase {
  type: 'str';
  strict?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
}

export interface BoolSchema extends CoreSchemaBase {
  type: 'bool';
  strict?: boolean;
}

export interface LiteralSchema extends CoreSchemaBase {
  type: 'literal';
  expected: readonly unknown[];
}

export interface EnumSchema extends CoreSchemaBase {
  type: 'enum';
  members: readonly string[];
}

export interface ListSchema extends CoreSchemaBase {
  type: 'list';
  itemsSchema: CoreSchema;
  minLength?: number;
  maxLength?: number;
}

export interface DictSchema extends CoreSchemaBase {
  type: 'dict';
  valuesSchema: CoreSchema;
  keysSchema?: CoreSchema;
}

export interface UnionSchema extends CoreSchemaBase {
  type: 'union';
  choices: CoreSchema[];
  discriminator?: string;
}

export interface NullableSchema extends CoreSchemaBase {
  type: 'nullable';
  schema: CoreSchema;
}

export interface OptionalSchema extends CoreSchemaBase {
  type: 'optional';
  schema: CoreSchema;
}

export interface DefaultSchema extends CoreSchemaBase {
  type: 'default';
  schema: CoreSchema;
  defaultValue: unknown;
}

export interface DefaultFactorySchema extends CoreSchemaBase {
  type: 'default-factory';
  schema: CoreSchema;
  factory: () => unknown;
}

export interface ModelFieldsSchema extends CoreSchemaBase {
  type: 'model-fields';
  fields: Record<string, ModelFieldSchema>;
  modelName?: string;
  extra?: 'ignore' | 'allow' | 'forbid';
  strict?: boolean;
}

export interface FunctionBeforeSchema extends CoreSchemaBase {
  type: 'function-before';
  schema: CoreSchema;
  fn: ValidatorFn;
}

export interface FunctionAfterSchema extends CoreSchemaBase {
  type: 'function-after';
  schema: CoreSchema;
  fn: ValidatorFn;
}

export interface FunctionWrapSchema extends CoreSchemaBase {
  type: 'function-wrap';
  schema: CoreSchema;
  fn: WrapValidatorFn;
}

export interface FunctionPlainSchema extends CoreSchemaBase {
  type: 'function-plain';
  fn: ValidatorFn;
}

export interface DateSchema extends CoreSchemaBase {
  type: 'date';
}

export type CoreSchema =
  | AnySchema
  | NeverSchema
  | IntSchema
  | FloatSchema
  | StrSchema
  | BoolSchema
  | LiteralSchema
  | EnumSchema
  | ListSchema
  | DictSchema
  | UnionSchema
  | NullableSchema
  | OptionalSchema
  | DefaultSchema
  | DefaultFactorySchema
  | ModelFieldsSchema
  | FunctionBeforeSchema
  | FunctionAfterSchema
  | FunctionWrapSchema
  | FunctionPlainSchema
  | DateSchema;

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
