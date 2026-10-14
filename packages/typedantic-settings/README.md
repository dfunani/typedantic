# `@typedantic/settings`

Environment and `.env` backed settings on top of `@typedantic/model`.

```bash
npm install @typedantic/settings @typedantic/model reflect-metadata
```

```ts
import 'reflect-metadata';
import { Field } from '@typedantic/model';
import {
  BaseSettings,
  settingsConfig,
  settingsCustomiseSources,
  jsonFileSettingsSource,
} from '@typedantic/settings';

@settingsCustomiseSources((init, env, dotenv) => [
  init,
  env,
  dotenv,
  jsonFileSettingsSource('settings.json'),
])
@settingsConfig({ envPrefix: 'APP_', envFile: '.env' })
class AppSettings extends BaseSettings {
  @Field({ type: String, alias: 'HOST' })
  host!: string;

  @Field({ type: Number, default: 8080, alias: 'PORT' })
  port!: number;
}

const settings = AppSettings.settingsValidate(process.env, {
  initData: { host: 'override' },
});
```

**Docs:** [Settings phase](https://github.com/dfunani/typedantic/blob/main/documentation/phases/04-settings/README.md) · [Distribution](https://github.com/dfunani/typedantic/blob/main/documentation/phases/05-ship/distribution.md)

**License:** MIT
