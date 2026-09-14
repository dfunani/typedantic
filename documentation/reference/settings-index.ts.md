# Reference: BaseSettings

Copied from `main`: `packages/typedantic-settings/src/index.ts`

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BaseModel, Field, modelConfig, collectModelFields } from 'typedantic';
import type { ConfigDict } from 'typedantic';

export interface SettingsConfigDict extends ConfigDict {
  envPrefix?: string;
  envFile?: string | false;
  envNestedDelimiter?: string;
  caseSensitive?: boolean;
}

export function settingsConfig(config: SettingsConfigDict): ClassDecorator {
  return modelConfig(config);
}

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, 'utf8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function flattenEnv(
  env: Record<string, string | undefined>,
  prefix: string,
  delimiter: string,
  caseSensitive: boolean,
): Record<string, string> {
  const result: Record<string, string> = {};
  const upperPrefix = prefix.toUpperCase();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (prefix && !(caseSensitive ? key.startsWith(prefix) : key.toUpperCase().startsWith(upperPrefix))) continue;
    const stripped = prefix ? key.slice(prefix.length) : key;
    const path = stripped.split(delimiter).map((p) => (caseSensitive ? p : p.toLowerCase()));
    result[path.join('__')] = value;
  }
  return result;
}

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
    collectModelFields(this);
    const fields = (this as { modelFields?: Record<string, { name: string; alias?: string; fieldInfo?: { alias?: string } }> }).modelFields ?? {};

    const data: Record<string, unknown> = {};
    for (const [name, meta] of Object.entries(fields)) {
      const envKey = (meta.fieldInfo?.alias ?? meta.alias ?? name).toUpperCase();
      const nestedKey = name;
      for (const [k, v] of Object.entries(flat)) {
        if (k === nestedKey || k.endsWith(`__${nestedKey}`)) {
          data[name] = coerceEnvValue(v);
          break;
        }
      }

      if (!(name in data)) {
        const direct = merged[envKey] ?? merged[envKey.toLowerCase()];
        if (direct !== undefined) data[name] = coerceEnvValue(direct);
      }
    }

    return (this as unknown as typeof BaseModel).modelValidate(data) as InstanceType<typeof BaseSettings>;
  }
}

function coerceEnvValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export { Field, modelConfig };

```
