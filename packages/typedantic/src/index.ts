import { BaseModel } from './models/base-model.js';
import { Field, isFieldInfo, type Annotated } from './fields/field.js';
import { modelConfig, getModelConfig } from './config/model-config.js';
import { fieldValidator, modelValidator, computedField } from './validators/field-validator.js';
import { fieldSerializer, modelSerializer } from './serializers/field-serializer.js';
import { EmailStr, HttpUrl, UUID, SecretStr, isSpecialType } from './types/special.js';
import { RootModel, RootModelOf } from './models/root-model.js';
import { createModel } from './models/create-model.js';
import { TypeAdapter, generateJsonSchema } from './json-schema/generator.js';
import { ValidationError } from '@typedantic/core';
import {
  Literal,
  Union,
  Nullable,
  Optional,
  Enum,
  ModelRef,
  DiscriminatedUnion,
  buildModelSchema,
  collectModelFields,
  inferSchemaFromType,
} from './internal/schema-builder.js';

export {
  BaseModel,
  Field,
  isFieldInfo,
  modelConfig,
  getModelConfig,
  fieldValidator,
  modelValidator,
  computedField,
  fieldSerializer,
  modelSerializer,
  TypeAdapter,
  generateJsonSchema,
  ValidationError,
  EmailStr,
  HttpUrl,
  UUID,
  SecretStr,
  isSpecialType,
  RootModel,
  RootModelOf,
  createModel,
  Literal,
  Union,
  DiscriminatedUnion,
  Nullable,
  Optional,
  Enum,
  ModelRef,
  buildModelSchema,
  collectModelFields,
  inferSchemaFromType,
};

export type { Annotated };
export type { FieldInfo } from './internal/metadata.js';
export type { ConfigDict } from './internal/metadata.js';

export type { CoreSchema, ValidationErrorDetail, DumpOptions, ValidateOptions } from '@typedantic/core';
export { SchemaValidator, SchemaSerializer, validate } from '@typedantic/core';
