import { resolve } from 'node:path';
import { BaseModel, getModelFields } from 'typedantic';
import { loadEnvFile, flattenEnv, parseEnvValue } from './environment.js';
import { SettingsConfigDict } from './config.js';
import { modelConfig } from 'typedantic';

export abstract class BaseSettings extends BaseModel {
    static modelConfig: SettingsConfigDict = {
        extra: 'ignore',
        populateByName: true,
    };

    static settingsValidate(
        env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
    ): InstanceType<typeof BaseSettings> {
        const config = (this as { modelConfig?: SettingsConfigDict }).modelConfig ?? {};
        const envPrefix = config.envPrefix ?? '';
        const delimiter = config.envNestedDelimiter ?? '__';
        const envFile = config.envFile !== false ? (config.envFile ?? '.env') : null;

        let merged: Record<string, string | undefined> = { ...env };

        if (envFile) {
            const fileEnv = loadEnvFile(resolve(process.cwd(), envFile));
            merged = { ...fileEnv, ...merged };
        }

        const flat = flattenEnv(merged, envPrefix, delimiter, config.caseSensitive ?? false);
        getModelFields(this);
        const fields = (this as { modelFields?: Record<string, { name: string; alias?: string; fieldInfo?: { alias?: string } }> }).modelFields ?? {};

        const data: Record<string, unknown> = {};
        for (const [name, meta] of Object.entries(fields)) {
            const envKey = (meta.fieldInfo?.alias ?? meta.alias ?? name).toUpperCase();
            const nestedKey = name;
            for (const [k, v] of Object.entries(flat)) {
                if (k === nestedKey || k.endsWith(`__${nestedKey}`)) {
                    data[name] = parseEnvValue(v);
                    break;
                }
            }

            if (!(name in data)) {
                const direct = merged[envKey] ?? merged[envKey.toLowerCase()];
                if (direct !== undefined) data[name] = parseEnvValue(direct);
            }
        }

        return (this as unknown as typeof BaseModel).modelValidate(data) as InstanceType<typeof BaseSettings>;
    }
}

export function settingsConfig(config: SettingsConfigDict): ClassDecorator {
    return modelConfig(config);
}