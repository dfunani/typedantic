# Deep dive: why TypeScript imports use `.js` extensions

With `moduleResolution: NodeNext`:

```ts
import { BaseModel } from './models/base-model.js';
```

You write `.js` even though the file is `.ts`, so emitted ESM loads correctly in Node.

Tutorial convention: follow **main** — NodeNext + `.js` specifiers.
