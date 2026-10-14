import { BaseModel, modelConfig } from '@typedantic/model';
import type { SettingsConfigDict } from './config.js';
import {
    SETTINGS_CUSTOMISE_SOURCES_KEY,
    defaultSettingsSources,
    mergeSettingsSources,
    resolveSettingsSources,
    initSettingsSource,
    envSettingsSource,
    dotenvSettingsSource,
    jsonFileSettingsSource,
    secretsDirectorySettingsSource,
    envMapToSettingsData,
    type SettingsSource,
    type SettingsSourceContext,
    type CustomiseSourcesFn,
} from './sources.js';

export type { SettingsConfigDict } from './config.js';
export type { SettingsSource, SettingsSourceContext, CustomiseSourcesFn };
export {
    initSettingsSource,
    envSettingsSource,
    dotenvSettingsSource,
    jsonFileSettingsSource,
    secretsDirectorySettingsSource,
    envMapToSettingsData,
    defaultSettingsSources,
    mergeSettingsSources,
};

export type SettingsValidateOptions = {
    /** Explicit field values (highest priority by default). */
    initData?: Record<string, unknown>;
};

export abstract class BaseSettings extends BaseModel {
    static modelConfig: SettingsConfigDict = {
        extra: 'ignore',
        populateByName: true,
    };

    static settingsValidate<T extends typeof BaseSettings>(
        this: T,
        env: Record<string, string | undefined> = process.env as Record<
            string,
            string | undefined
        >,
        options: SettingsValidateOptions = {},
    ): InstanceType<T> {
        const config = (this as { modelConfig?: SettingsConfigDict }).modelConfig ?? {};
        const ctx: SettingsSourceContext = {
            settingsCls: this,
            config,
            env,
            initData: options.initData ?? {},
        };

        let sources = resolveSettingsSources(this);
        // Secrets dir from config, appended as lowest priority when set.
        if (config.secretsDir) {
            sources = [...sources, secretsDirectorySettingsSource(config.secretsDir)];
        }

        const data = mergeSettingsSources(sources, ctx);
        return (this as unknown as typeof BaseModel).modelValidate(data) as InstanceType<T>;
    }
}

export function settingsConfig(config: SettingsConfigDict): ClassDecorator {
    return modelConfig(config);
}

/**
 * Customise the settings source pipeline (Pydantic-style).
 * Callback receives default sources and must return the ordered list
 * (highest priority first).
 *
 * @example
 * @settingsCustomiseSources((init, env, dotenv) => [init, env, dotenv, jsonFileSettingsSource('settings.json')])
 * class AppSettings extends BaseSettings { ... }
 */
export function settingsCustomiseSources(customise: CustomiseSourcesFn): ClassDecorator {
    return (target) => {
        Object.defineProperty(target, SETTINGS_CUSTOMISE_SOURCES_KEY, {
            value: customise,
            configurable: true,
        });
    };
}
