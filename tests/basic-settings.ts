import 'reflect-metadata';
import { Field } from 'typedantic';
import { BaseSettings, settingsConfig } from 'typedantic-settings';

@settingsConfig({ caseSensitive: false })
class AppSettings extends BaseSettings {
    @Field({ type: String })
    app_host!: string;

    @Field({ type: Number, default: 8080 })
    app_port!: number;
}

const settings = AppSettings.settingsValidate(process.env);
console.log(settings.modelDumpJson());
// settings is InstanceType<typeof AppSettings>, not a bare BaseSettings
