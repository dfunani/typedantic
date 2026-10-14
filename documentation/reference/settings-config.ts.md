# `packages/typedantic-settings/src/config.ts`

**Package:** `@typedantic/settings`  
**Note:** Live source (0.1) — authoritative for rebuild. Prefer phase pages for teaching order.

```ts
import type { ConfigDict } from '@typedantic/model';

export interface SettingsConfigDict extends ConfigDict {
    envPrefix?: string;
    envFile?: string | false;
    envNestedDelimiter?: string;
    caseSensitive?: boolean;
    populateByName?: boolean;
}
```
