import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Field } from '@typedantic/model';
import {
    BaseSettings,
    settingsConfig,
    settingsCustomiseSources,
    jsonFileSettingsSource,
    secretsDirectorySettingsSource,
    initSettingsSource,
    envSettingsSource,
    dotenvSettingsSource,
} from '../src/index.js';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('settingsCustomiseSources', () => {
    it('allows initData to override env', () => {
        @settingsConfig({ envPrefix: 'APP_', envFile: false })
        class AppSettings extends BaseSettings {
            @Field({ type: String, alias: 'HOST' })
            host!: string;
        }

        const settings = AppSettings.settingsValidate(
            { APP_HOST: 'from-env' },
            { initData: { host: 'from-init' } },
        );
        expect(settings.host).toBe('from-init');
    });

    it('can reorder / inject json file source', () => {
        const dir = mkdtempSync(join(tmpdir(), 'typedantic-src-'));
        const jsonPath = join(dir, 'settings.json');
        writeFileSync(jsonPath, JSON.stringify({ host: 'from-json', port: 1 }));

        try {
            @settingsCustomiseSources((init, env, dotenv) => [
                init,
                env,
                dotenv,
                jsonFileSettingsSource(jsonPath),
            ])
            @settingsConfig({ envPrefix: 'APP_', envFile: false })
            class AppSettings extends BaseSettings {
                @Field({ type: String, alias: 'HOST' })
                host!: string;

                @Field({ type: Number, default: 8080, alias: 'PORT' })
                port!: number;
            }

            const fromJson = AppSettings.settingsValidate({});
            expect(fromJson.host).toBe('from-json');
            expect(fromJson.port).toBe(1);

            const envWins = AppSettings.settingsValidate({ APP_HOST: 'from-env' });
            expect(envWins.host).toBe('from-env');
            expect(envWins.port).toBe(1);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('loads secretsDir file values', () => {
        const dir = mkdtempSync(join(tmpdir(), 'typedantic-sec-'));
        const secrets = join(dir, 'secrets');
        mkdirSync(secrets);
        writeFileSync(join(secrets, 'token'), 'abc123\n');

        try {
            @settingsConfig({ envFile: false, secretsDir: secrets })
            class AppSettings extends BaseSettings {
                @Field({ type: String })
                token!: string;
            }

            const settings = AppSettings.settingsValidate({});
            expect(settings.token).toBe('abc123');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('exports built-in source callables', () => {
        expect(typeof initSettingsSource).toBe('function');
        expect(typeof envSettingsSource).toBe('function');
        expect(typeof dotenvSettingsSource).toBe('function');
        expect(typeof secretsDirectorySettingsSource).toBe('function');
    });
});
