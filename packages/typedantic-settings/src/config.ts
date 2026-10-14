import type { ConfigDict } from '@typedantic/model';

export interface SettingsConfigDict extends ConfigDict {
    envPrefix?: string;
    envFile?: string | false;
    envNestedDelimiter?: string;
    caseSensitive?: boolean;
    populateByName?: boolean;
}
