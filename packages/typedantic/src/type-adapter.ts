import {
    BaseSchema,
    SchemaSerializer,
    SchemaValidator,
    type DumpOptions,
} from '@typedantic/core';
import { BaseModel } from './models/base-model.js';
import { buildBaseModelSchema } from './models/factories.js';
import { inferSchemaFromType } from './fields/builders/fields.js';
import type { FieldInfo } from './fields/types.js';
import { getAnnotatedSchema } from './types/annotated.js';

const IR_TYPE_TAGS = new Set([
    'int',
    'number',
    'string',
    'boolean',
    'literal',
    'enum',
    'model-fields',
    'array',
    'object',
    'union',
    'nullable',
    'optional',
    'default',
    'date',
    'any',
    'never',
    'function-before',
    'function-after',
    'function-wrap',
    'function-plain',
    'default-factory',
]);

export class TypeAdapter<T = unknown> {
    private readonly schema: BaseSchema;
    private readonly validator: SchemaValidator;
    private readonly serializer: SchemaSerializer;
    private readonly modelCtor?: typeof BaseModel;

    constructor(schemaOrModel: BaseSchema | typeof BaseModel | FieldInfo | unknown) {
        const annotated = getAnnotatedSchema(schemaOrModel);
        if (annotated) {
            this.schema = annotated;
        } else if (
            typeof schemaOrModel === 'function' &&
            schemaOrModel.prototype instanceof BaseModel
        ) {
            this.modelCtor = schemaOrModel as typeof BaseModel;
            this.schema = buildBaseModelSchema(schemaOrModel);
        } else if (
            schemaOrModel !== null &&
            typeof schemaOrModel === 'object' &&
            typeof (schemaOrModel as { type?: unknown }).type === 'string' &&
            IR_TYPE_TAGS.has((schemaOrModel as { type: string }).type)
        ) {
            this.schema = schemaOrModel as BaseSchema;
        } else if (
            schemaOrModel !== null &&
            typeof schemaOrModel === 'object' &&
            'type' in (schemaOrModel as object)
        ) {
            // FieldInfo-like object
            this.schema = inferSchemaFromType(
                (schemaOrModel as FieldInfo).type,
                schemaOrModel as FieldInfo,
            );
        } else {
            this.schema = inferSchemaFromType(schemaOrModel);
        }
        this.validator = new SchemaValidator(this.schema);
        this.serializer = new SchemaSerializer(this.schema);
    }

    validate(data: unknown): T {
        const result = this.validator.validateModel(data);
        if (this.modelCtor) {
            return this.modelCtor.modelConstruct(result as Record<string, unknown>) as T;
        }
        return result as T;
    }

    validateJson(json: string): T {
        const result = this.validator.validateJson(json);
        if (this.modelCtor) {
            return this.modelCtor.modelConstruct(result as Record<string, unknown>) as T;
        }
        return result as T;
    }

    dump(value: T, options?: DumpOptions): unknown {
        if (value instanceof BaseModel) {
            return value.modelDump(options);
        }
        return this.serializer.dump(value, options);
    }

    dumpJson(value: T, options?: DumpOptions): string {
        if (value instanceof BaseModel) {
            return value.modelDumpJson(options);
        }
        return this.serializer.dumpJson(value, options);
    }

    getSchema(): BaseSchema {
        return this.schema;
    }
}
