import type { ConfigDict } from '@typedantic/model';

export interface SettingsConfigDict extends ConfigDict {
    envPrefix?: string;
    envFile?: string | false;
    envNestedDelimiter?: string;
    caseSensitive?: boolean;
    populateByName?: boolean;
    /** Directory of secret files (field-name → file contents); lowest priority when set. */
    secretsDir?: string;
}
