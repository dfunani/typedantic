import type { DumpOptions, JsonSchema } from '@typedantic/core';
import { toJsonSchema } from '@typedantic/core';
import { getModelConfig } from '../config/model-config.js';
import type { ConfigDict, ModelFieldMeta } from '../fields/types.js';
import { getComputedFields, getModelSerializer } from '../serializers/decorators.js';
import {
    buildBaseModelInstance,
    buildBaseModelSchema,
    buildBaseModelValidator,
    dumpModelInstance,
} from './factories.js';

export type ModelDumpOptions = DumpOptions;
export type ModelCopyOptions = { update?: Record<string, unknown>; deep?: boolean };

export class BaseModel {
    static modelConfig: ConfigDict = {};
    static modelFields: Record<string, ModelFieldMeta> = {};

    constructor(data?: unknown) {
        if (data !== undefined) {
            const validated = (this.constructor as typeof BaseModel).modelValidate(data);
            Object.assign(this, validated);
        }
    }

    static modelValidate<T extends typeof BaseModel>(this: T, data: unknown): InstanceType<T> {
        const schema = buildBaseModelSchema(this);
        const validator = buildBaseModelValidator(this, schema);
        const config = getModelConfig(this);
        const validated = validator.validateModel(data, { strict: config.strict });
        const fieldsSet =
            data !== null && typeof data === 'object' && !Array.isArray(data)
                ? new Set(Object.keys(data as object))
                : new Set<string>();
        return buildBaseModelInstance(
            this,
            validated as Record<string, unknown>,
            fieldsSet,
        );
    }

    static modelValidateJson<T extends typeof BaseModel>(
        this: T,
        json: string,
    ): InstanceType<T> {
        const schema = buildBaseModelSchema(this);
        const validator = buildBaseModelValidator(this, schema);
        const config = getModelConfig(this);
        const validated = validator.validateJson(json, { strict: config.strict });
        const fieldsSet =
            validated !== null && typeof validated === 'object' && !Array.isArray(validated)
                ? new Set(Object.keys(validated as object))
                : new Set<string>();
        return buildBaseModelInstance(
            this,
            validated as Record<string, unknown>,
            fieldsSet,
        );
    }

    static modelConstruct<T extends typeof BaseModel>(
        this: T,
        values: Record<string, unknown>,
    ): InstanceType<T> {
        const fields = (this as typeof BaseModel).modelFields;
        const data = { ...values };
        // Apply defaults when constructing without validation.
        for (const [name, meta] of Object.entries(
            (this as { modelFields?: Record<string, ModelFieldMeta> }).modelFields ?? {},
        )) {
            if (!(name in data)) {
                if (meta.default !== undefined) data[name] = meta.default;
                else if (meta.defaultFactory) data[name] = meta.defaultFactory();
            }
        }
        void fields;
        return buildBaseModelInstance(this, data, new Set(Object.keys(values)));
    }

    static modelJsonSchema<T extends typeof BaseModel>(this: T): JsonSchema {
        const schema = buildBaseModelSchema(this);
        const config = getModelConfig(this);
        return toJsonSchema(schema, { title: config.title ?? this.name });
    }

    modelDump(options: ModelDumpOptions = {}): Record<string, unknown> {
        const ctor = this.constructor as typeof BaseModel;
        let dumped = dumpModelInstance(ctor, this, options);
        const modelSer = getModelSerializer(ctor);
        if (modelSer) {
            if (modelSer.mode === 'wrap') {
                dumped = modelSer.fn(dumped, (v) => v as Record<string, unknown>) as Record<
                    string,
                    unknown
                >;
            } else {
                dumped = modelSer.fn(dumped) as Record<string, unknown>;
            }
        }
        return dumped;
    }

    modelDumpJson(options: ModelDumpOptions = {}): string {
        return JSON.stringify(this.modelDump({ ...options, mode: 'json' }));
    }

    modelCopy(options: ModelCopyOptions = {}): this {
        const ctor = this.constructor as typeof BaseModel;
        const computedNames = new Set(getComputedFields(ctor).map((c) => c.name));
        const fields = Object.keys(
            (ctor as { modelFields?: Record<string, unknown> }).modelFields ?? {},
        );
        const base: Record<string, unknown> = {};
        for (const name of fields) {
            if (computedNames.has(name)) continue;
            if (name in (this as object)) {
                let value = (this as Record<string, unknown>)[name];
                if (options.deep && value instanceof BaseModel) {
                    value = value.modelCopy({ deep: true });
                }
                base[name] = value;
            }
        }
        const merged = { ...base, ...options.update };
        return ctor.modelValidate(merged) as this;
    }
}
