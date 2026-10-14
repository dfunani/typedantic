import type { BaseSchema, JsonSchema } from '@typedantic/core';
import { SchemaValidator, SchemaSerializer, toJsonSchema } from '@typedantic/core';
import { inferSchemaFromType } from '../fields/builders/fields.js';
import type { FieldInfo } from '../fields/types.js';
import { getAnnotatedSchema } from '../types/annotated.js';

const ROOT_SCHEMA_KEY = Symbol('typedantic:rootSchema');
const ROOT_VALIDATOR_KEY = Symbol('typedantic:rootValidator');
const ROOT_SERIALIZER_KEY = Symbol('typedantic:rootSerializer');

const IR_TYPES = new Set([
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

export type RootTypeSpec = unknown | FieldInfo | BaseSchema;

function isBaseSchema(spec: unknown): spec is BaseSchema {
    return (
        spec !== null &&
        typeof spec === 'object' &&
        typeof (spec as { type?: unknown }).type === 'string' &&
        IR_TYPES.has((spec as { type: string }).type)
    );
}

function isFieldInfo(spec: unknown): spec is FieldInfo {
    if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) return false;
    if (isBaseSchema(spec)) return false;
    const keys = Object.keys(spec as object);
    return keys.some((k) =>
        [
            'type',
            'items',
            'values',
            'keys',
            'enum',
            'literal',
            'union',
            'minLength',
            'maxLength',
            'ge',
            'gt',
            'le',
            'lt',
            'pattern',
            'nullable',
        ].includes(k),
    );
}

/**
 * Pydantic-style RootModel: validates a single root value (not a named-field object).
 *
 * @example
 * class IntList extends RootModel {
 *   static rootType = { type: Array, items: Number } satisfies FieldInfo;
 *   root!: number[];
 * }
 * IntList.modelValidate([1, 2, 3]);
 */
export class RootModel<T = unknown> {
    root!: T;

    /** Override on subclasses — constructor, FieldInfo, annotated type, or BaseSchema. */
    static rootType: RootTypeSpec = String;

    constructor(data?: unknown) {
        if (arguments.length > 0) {
            const built = (this.constructor as typeof RootModel).modelValidate(data);
            this.root = built.root as T;
        }
    }

    static getRootSchema(this: typeof RootModel): BaseSchema {
        const self = this as typeof RootModel & {
            [ROOT_SCHEMA_KEY]?: BaseSchema;
        };
        if (self[ROOT_SCHEMA_KEY]) return self[ROOT_SCHEMA_KEY]!;

        const spec = this.rootType;
        let schema: BaseSchema;
        if (isBaseSchema(spec)) {
            schema = spec;
        } else if (isFieldInfo(spec)) {
            schema = inferSchemaFromType(spec.type ?? String, spec);
        } else {
            schema = getAnnotatedSchema(spec) ?? inferSchemaFromType(spec);
        }

        Object.defineProperty(self, ROOT_SCHEMA_KEY, { value: schema, configurable: true });
        return schema;
    }

    static modelValidate<R extends typeof RootModel>(
        this: R,
        data: unknown,
    ): InstanceType<R> {
        const schema = this.getRootSchema();
        const self = this as typeof RootModel & { [ROOT_VALIDATOR_KEY]?: SchemaValidator };
        let validator = self[ROOT_VALIDATOR_KEY];
        if (!validator) {
            validator = new SchemaValidator(schema);
            Object.defineProperty(self, ROOT_VALIDATOR_KEY, { value: validator });
        }
        const validated = validator.validateModel(data);
        const instance = Object.create(this.prototype) as InstanceType<R>;
        instance.root = validated as InstanceType<R>['root'];
        return instance;
    }

    static modelValidateJson<R extends typeof RootModel>(
        this: R,
        json: string,
    ): InstanceType<R> {
        return this.modelValidate(JSON.parse(json));
    }

    static modelConstruct<R extends typeof RootModel>(
        this: R,
        value: unknown,
    ): InstanceType<R> {
        const instance = Object.create(this.prototype) as InstanceType<R>;
        instance.root = value as InstanceType<R>['root'];
        return instance;
    }

    static modelJsonSchema(this: typeof RootModel): JsonSchema {
        return toJsonSchema(this.getRootSchema(), { title: this.name });
    }

    modelDump(): T {
        const ctor = this.constructor as typeof RootModel;
        const schema = ctor.getRootSchema();
        const self = ctor as typeof RootModel & { [ROOT_SERIALIZER_KEY]?: SchemaSerializer };
        let serializer = self[ROOT_SERIALIZER_KEY];
        if (!serializer) {
            serializer = new SchemaSerializer(schema);
            Object.defineProperty(self, ROOT_SERIALIZER_KEY, { value: serializer });
        }
        return serializer.dump(this.root) as T;
    }

    modelDumpJson(): string {
        return JSON.stringify(this.modelDump());
    }
}
