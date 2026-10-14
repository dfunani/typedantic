# `@typedantic/model`

Pydantic-style `BaseModel`, `@Field`, validators, serializers, and `TypeAdapter` for TypeScript.

```bash
npm install @typedantic/model reflect-metadata
```

```ts
import 'reflect-metadata';
import {
  BaseModel,
  Field,
  modelConfig,
  fieldValidator,
  computedField,
  TypeAdapter,
  EmailStr,
  createModel,
  RootModel,
} from '@typedantic/model';

@modelConfig({ extra: 'forbid' })
class User extends BaseModel {
  @Field({ type: String, minLength: 1 })
  name!: string;

  @Field({ type: Number, ge: 0 })
  age!: number;

  @computedField()
  get isAdult(): boolean {
    return this.age >= 18;
  }

  @fieldValidator('name', { mode: 'after' })
  static trimName(v: unknown) {
    return typeof v === 'string' ? v.trim() : v;
  }
}

const user = User.modelValidate({ name: '  Ada  ', age: 36 });
// or: new User({ name: 'Ada', age: 36 })
console.log(user.modelDump(), User.modelJsonSchema());
```

### TypeScript (required)

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

**Related:** [`@typedantic/core`](https://www.npmjs.com/package/@typedantic/core) · [`@typedantic/settings`](https://www.npmjs.com/package/@typedantic/settings)

**Docs:** [GitHub documentation](https://github.com/dfunani/typedantic/tree/main/documentation) · [Distribution](https://github.com/dfunani/typedantic/blob/main/documentation/phases/05-ship/distribution.md)

**License:** MIT
