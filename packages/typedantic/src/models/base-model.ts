import { getModelConfig } from "../config/model-config.js";
import type { ConfigDict, ModelFieldMeta } from "../fields/types.js";
import { getOrBuildSchema, getOrBuildValidator, instantiateModel } from "./factories.js";

export class BaseModel {
    static modelConfig: ConfigDict = {};
    static modelFields: Record<string, ModelFieldMeta> = {};

    static modelValidate<T extends typeof BaseModel>(this: T, data: unknown): InstanceType<T> {
        const schema = getOrBuildSchema(this);
        const validator = getOrBuildValidator(this, schema);
        const config = getModelConfig(this);
        const validated = validator.validateModel(data, { strict: config.strict });
        return instantiateModel(this, validated as Record<string, unknown>);
    }

    static modelConstruct<T extends typeof BaseModel>(
        this: T,
        values: Record<string, unknown>,
    ): InstanceType<T> {
        return instantiateModel(this, values);
    }

    modelDump(): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(this as Record<string, unknown>)) {
            out[key] = value;
        }
        return out;
    }

    modelDumpJson(): string {
        return JSON.stringify(this.modelDump());
    }
}
