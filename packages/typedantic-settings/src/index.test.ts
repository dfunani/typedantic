import 'reflect-metadata';
import { describe, it, expect, afterEach } from 'vitest';
import { BaseSettings, Field, settingsConfig } from './index.js';

@settingsConfig({ envPrefix: 'APP_' })
class AppSettings extends BaseSettings {
  @Field({ alias: 'APP_NAME' })
  appName!: string;

  @Field({ alias: 'DEBUG', type: Boolean })
  debug!: boolean;

  @Field({ alias: 'PORT', type: Number })
  port!: number;
}

describe('BaseSettings', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads settings from environment variables', () => {
    process.env.APP_NAME = 'MyApp';
    process.env.DEBUG = 'true';
    process.env.PORT = '8080';

    const settings = AppSettings.settingsValidate();
    expect(settings.appName).toBe('MyApp');
    expect(settings.debug).toBe(true);
    expect(settings.port).toBe(8080);
  });
});
