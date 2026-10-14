import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { BaseModel, Field } from '@typedantic/model';
import { BaseSettings, settingsConfig } from '../src/index.js';
import {
    flattenEnv,
    parseEnvValue,
    setNestedValue,
    lookupPrefixedEnv,
    loadEnvFile,
} from '../src/environment.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('parseEnvValue', () => {
    it('coerces booleans, numbers, null, and JSON', () => {
        expect(parseEnvValue('true')).toBe(true);
        expect(parseEnvValue('false')).toBe(false);
        expect(parseEnvValue('null')).toBe(null);
        expect(parseEnvValue('42')).toBe(42);
        expect(parseEnvValue('3.14')).toBe(3.14);
        expect(parseEnvValue('{"a":1}')).toEqual({ a: 1 });
        expect(parseEnvValue('[1,2]')).toEqual([1, 2]);
        expect(parseEnvValue('hello')).toBe('hello');
    });
});

describe('flattenEnv', () => {
    it('strips prefix and normalizes delimiter segments', () => {
        const flat = flattenEnv(
            { APP_DB__HOST: 'localhost', APP_PORT: '8080', OTHER: 'x' },
            'APP_',
            '__',
            false,
        );
        expect(flat).toEqual({
            db__host: 'localhost',
            port: '8080',
        });
    });

    it('ignores keys that do not match prefix', () => {
        const flat = flattenEnv({ HOST: 'a', APP_HOST: 'b' }, 'APP_', '__', false);
        expect(flat).toEqual({ host: 'b' });
    });
});

describe('setNestedValue / lookupPrefixedEnv', () => {
    it('builds nested objects from path segments', () => {
        const data: Record<string, unknown> = {};
        setNestedValue(data, ['db', 'host'], 'localhost');
        setNestedValue(data, ['db', 'port'], 5432);
        expect(data).toEqual({ db: { host: 'localhost', port: 5432 } });
    });

    it('finds prefixed keys case-insensitively', () => {
        expect(lookupPrefixedEnv({ APP_HOST: 'x' }, 'APP_', 'host', false)).toBe('x');
        expect(lookupPrefixedEnv({ APP_HOST: 'x' }, 'APP_', 'HOST', false)).toBe('x');
        expect(lookupPrefixedEnv({ OTHER: 'x' }, 'APP_', 'host', false)).toBeUndefined();
    });
});

describe('loadEnvFile', () => {
    it('parses KEY=value, quotes, and comments', () => {
        const dir = mkdtempSync(join(tmpdir(), 'typedantic-settings-'));
        const path = join(dir, '.env');
        writeFileSync(
            path,
            ['# comment', 'A=1', "B='two'", 'C="three"', '', 'INVALID'].join('\n'),
        );
        try {
            expect(loadEnvFile(path)).toEqual({ A: '1', B: 'two', C: 'three' });
            expect(loadEnvFile(join(dir, 'missing.env'))).toEqual({});
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('BaseSettings.settingsValidate', () => {
    it('returns InstanceType of the subclass with prefixed aliases', () => {
        @settingsConfig({ envPrefix: 'APP_', envFile: false, caseSensitive: false })
        class AppSettings extends BaseSettings {
            @Field({ type: String, alias: 'HOST' })
            host!: string;

            @Field({ type: Number, default: 8080, alias: 'PORT' })
            port!: number;
        }

        const settings = AppSettings.settingsValidate({
            APP_HOST: 'localhost',
            APP_PORT: '9090',
        });

        expect(settings).toBeInstanceOf(AppSettings);
        expect(settings.host).toBe('localhost');
        expect(settings.port).toBe(9090);
    });

    it('does not load unprefixed keys when prefix is set', () => {
        @settingsConfig({ envPrefix: 'APP_', envFile: false })
        class AppSettings extends BaseSettings {
            @Field({ type: String, alias: 'HOST' })
            host!: string;
        }

        expect(() =>
            AppSettings.settingsValidate({ HOST: 'localhost' }),
        ).toThrow();
    });

    it('rebuilds nested models from delimiter segments', () => {
        class DbSettings extends BaseModel {
            @Field({ type: String })
            host!: string;

            @Field({ type: Number })
            port!: number;
        }

        @settingsConfig({
            envPrefix: 'APP_',
            envNestedDelimiter: '__',
            envFile: false,
            caseSensitive: false,
        })
        class AppSettings extends BaseSettings {
            @Field({ type: DbSettings })
            db!: DbSettings;
        }

        const settings = AppSettings.settingsValidate({
            APP_DB__HOST: 'db.internal',
            APP_DB__PORT: '5432',
        });

        expect(settings.db).toBeInstanceOf(DbSettings);
        expect(settings.db.host).toBe('db.internal');
        expect(settings.db.port).toBe(5432);
    });

    it('prefers explicit env over .env file values', () => {
        const dir = mkdtempSync(join(tmpdir(), 'typedantic-settings-'));
        const path = join(dir, 'test.env');
        writeFileSync(path, 'APP_HOST=from-file\n');

        @settingsConfig({
            envPrefix: 'APP_',
            envFile: path,
            caseSensitive: false,
        })
        class AppSettings extends BaseSettings {
            @Field({ type: String, alias: 'HOST' })
            host!: string;
        }

        try {
            const settings = AppSettings.settingsValidate({ APP_HOST: 'from-env' });
            expect(settings.host).toBe('from-env');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
