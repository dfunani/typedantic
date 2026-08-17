import type { CoreSchema } from '@typedantic/core';

export const FIELD_INFO_KEY = Symbol('typedantic:fieldInfo');
export const MODEL_CONFIG_KEY = Symbol('typedantic:modelConfig');
export const FIELD_VALIDATORS_KEY = Symbol('typedantic:fieldValidators');
export const MODEL_VALIDATORS_KEY = Symbol('typedantic:modelValidators');
export const CORE_SCHEMA_KEY = Symbol('typedantic:coreSchema');
export const VALIDATOR_KEY = Symbol('typedantic:validator');
export const SERIALIZER_KEY = Symbol('typedantic:serializer');

export interface FieldInfo<T = unknown> {
  type?: new (...args: unknown[]) => T;
  default?: T;
  defaultFactory?: () => T;
  alias?: string;
  title?: string;
  description?: string;
  examples?: unknown[];
  deprecated?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multipleOf?: number;
  strict?: boolean;
  jsonSchemaExtra?: Record<string, unknown>;
}

export interface ConfigDict {
  strict?: boolean;
  frozen?: boolean;
  extra?: 'ignore' | 'allow' | 'forbid';
  populateByName?: boolean;
  validateAssignment?: boolean;
  useEnumValues?: boolean;
  jsonSchemaExtra?: Record<string, unknown>;
  strStripWhitespace?: boolean;
  strToLower?: boolean;
  strToUpper?: boolean;
}

export type ValidatorMode = 'before' | 'after' | 'wrap' | 'plain';
export type ModelValidatorMode = 'before' | 'after' | 'wrap';

export interface FieldValidatorMeta {
  fields: string[];
  mode: ValidatorMode;
  fn: (...args: unknown[]) => unknown;
}

export interface ModelValidatorMeta {
  mode: ModelValidatorMode;
  fn: (...args: unknown[]) => unknown;
}

export interface ModelFieldMeta {
  name: string;
  fieldInfo?: FieldInfo;
  schema: CoreSchema;
  required: boolean;
  alias?: string;
  default?: unknown;
  defaultFactory?: () => unknown;
}

export type ModelClass<T extends new (...args: unknown[]) => object = new (...args: unknown[]) => object> =
  T & {
  modelFields: Record<string, ModelFieldMeta>;
  modelConfig: ConfigDict;
  [CORE_SCHEMA_KEY]?: CoreSchema;
  [VALIDATOR_KEY]?: import('@typedantic/core').SchemaValidator;
  [SERIALIZER_KEY]?: import('@typedantic/core').SchemaSerializer;
  modelValidate(data: unknown): InstanceType<T>;
  modelValidateJson(json: string): InstanceType<T>;
  modelJsonSchema(): Record<string, unknown>;
  modelConstruct(values: Record<string, unknown>): InstanceType<T>;
};

export const modelRegistry = new Map<string, ModelClass>();
