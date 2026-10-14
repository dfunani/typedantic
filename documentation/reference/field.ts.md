# `packages/typedantic/src/fields/decorator.ts`

**Package:** `@typedantic/model`  
**Note:** Live source (0.1) — authoritative for rebuild. Prefer phase pages for teaching order.

```ts
import { getFieldPropertyMetadata } from "./properties.js";
import { registerModelField } from "./registry.js";
import type { FieldInfo } from "./types.js";

export function Field<T = unknown>(options: FieldInfo<T> = {}) {
    return (target: object, propertyKey: string | symbol): void => {
        const designType = getFieldPropertyMetadata('design:type', target, propertyKey);
        const fieldOptions: FieldInfo<T> = { ...options };
        if (!fieldOptions.type && designType && designType !== Object) {
            fieldOptions.type = designType;
        }
        registerModelField(target.constructor, String(propertyKey), fieldOptions);
    };
}
```
