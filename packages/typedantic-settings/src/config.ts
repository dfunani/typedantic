import type { ConfigDict } from 'typedantic';

export interface SettingsConfigDict extends ConfigDict {
    envPrefix?: string;
    envFile?: string | false;
    envNestedDelimiter?: string;
    caseSensitive?: boolean;
}



