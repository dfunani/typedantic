# Typedantic — Design Document

> **Pydantic for TypeScript** — class-based data validation, serialization, and schema generation.

---

## 1. Vision & Goals

### 1.1 What Typedantic Is

Typedantic is a TypeScript validation library that mirrors **Pydantic v2**'s mental model, API surface, and architecture — not Zod's functional/compositional style. It replaces Zod in ecosystems where you want:

- **Class-based models** with decorators (`@fieldValidator`, `@modelValidator`)
- **Declarative field constraints** via `Field()` and the `Annotated` pattern
- **Compile-once, validate-many** performance via a CoreSchema IR
- **First-class JSON Schema** generation for OpenAPI integration (used by fastypeapi)
- **Strict separation** between model definition (TypeScript) and validation runtime

### 1.2 What Typedantic Is Not

- Not a 1:1 port of Pydantic's Rust core (we stay in TypeScript; optional WASM/native later)
- Not a Zod clone with class syntax slapped on
- Not a runtime ORM or database layer

### 1.3 Design Principles (from Pydantic)

| Principle | Typedantic Expression |
|-----------|----------------------|
| Type annotations drive validation | Reflect on class field types + `reflect-metadata` / TS 5+ decorators |
| Validation is separate from definition | CoreSchema IR → compiled `SchemaValidator` / `SchemaSerializer` |
| Fail fast with structured errors | `ValidationError` with `errors[]` containing `loc`, `type`, `msg`, `input` |
| Coercion where sensible, strict when configured | `model_config.strict`, per-field `strict` |
| Validators are explicit and ordered | `before` → core → `after`; model validators similarly staged |
| Immutable by default | `model_config.frozen`; `model_copy()` for updates |
| JSON Schema is a first-class output | Every model exposes `.model_json_schema()` |

### 1.4 Non-Goals (v1)

- Python `dataclass` / `TypedDict` parity (we focus on class models first)
- Full `pydantic-settings` parity (Phase 3)
- Rust/WASM acceleration (Phase 4, optional)

---

## 2. Architecture Overview

Pydantic v2 splits into two layers. Typedantic follows the same split:

```
┌─────────────────────────────────────────────────────────────────┐
│  typedantic (user-facing, TypeScript)                           │
│  BaseModel · Field · validators · model_config · TypeAdapter    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ builds CoreSchema (IR)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  typedantic-core (validation runtime)                           │
│  SchemaValidator · SchemaSerializer · CoreSchema types          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Package Structure

```
typedantic/
├── packages/
│   ├── typedantic/           # Public API (npm: typedantic)
│   │   ├── src/
│   │   │   ├── models/       # BaseModel, createModel
│   │   │   ├── fields/       # Field(), FieldInfo
│   │   │   ├── validators/   # fieldValidator, modelValidator
│   │   │   ├── config/       # modelConfig, ConfigDict
│   │   │   ├── types/        # EmailStr, PositiveInt, etc.
│   │   │   ├── adapters/     # TypeAdapter
│   │   │   ├── json-schema/  # model_json_schema
│   │   │   └── errors/       # ValidationError
│   │   └── package.json
│   │
│   └── typedantic-core/      # Internal runtime (npm: @typedantic/core)
│       ├── src/
│       │   ├── schema/       # CoreSchema type definitions
│       │   ├── compiler/     # CoreSchema → ValidatorTree
│       │   ├── validator/    # SchemaValidator
│       │   ├── serializer/   # SchemaSerializer
│       │   └── errors/       # Core validation errors
│       └── package.json
│
├── examples/
├── benchmarks/
└── docs/
```

### 2.2 CoreSchema — Intermediate Representation

Mirroring Pydantic's CoreSchema, every type resolves to a tagged union node:

```typescript
type CoreSchema =
  | { type: 'int'; ge?: number; le?: number; strict?: boolean }
  | { type: 'str'; min_length?: number; max_length?: number; pattern?: string }
  | { type: 'bool'; strict?: boolean }
  | { type: 'float'; ... }
  | { type: 'literal'; expected: readonly unknown[] }
  | { type: 'enum'; members: readonly string[] }
  | { type: 'list'; items_schema: CoreSchema; min_length?: number }
  | { type: 'tuple'; items_schema: CoreSchema[] }
  | { type: 'dict'; keys_schema?: CoreSchema; values_schema: CoreSchema }
  | { type: 'union'; choices: CoreSchema[]; discriminator?: string }
  | { type: 'nullable'; schema: CoreSchema }
  | { type: 'optional'; schema: CoreSchema }
  | { type: 'model'; class: Function; fields: Record<string, ModelFieldSchema> }
  | { type: 'model-fields'; fields: Record<string, ModelFieldSchema> }
  | { type: 'default'; schema: CoreSchema; default: unknown | (() => unknown) }
  | { type: 'default-factory'; schema: CoreSchema; factory: () => unknown }
  | { type: 'computed-field'; return_schema: CoreSchema; property_key: string }
  | { type: 'function-before'; schema: CoreSchema; function: ValidatorFn }
  | { type: 'function-after'; schema: CoreSchema; function: ValidatorFn }
  | { type: 'function-wrap'; schema: CoreSchema; function: WrapValidatorFn }
  | { type: 'function-plain'; function: PlainValidatorFn }
  | { type: 'ref'; schema_ref: string }
  | { type: 'any' }
  | { type: 'never' };
```

**Compilation:** When a `BaseModel` subclass is defined, Typedantic:
1. Collects field metadata from decorators + `reflect-metadata` type hints
2. Builds a CoreSchema tree
3. Compiles it into a cached `ValidatorTree` on the class (`__validator__`)
4. Compiles a parallel `SerializerTree` (`__serializer__`)

Subsequent `model_validate()` calls traverse the pre-built tree — no re-introspection.

---

## 3. Public API Design

### 3.1 BaseModel

```typescript
import { BaseModel, Field, fieldValidator, modelValidator, modelConfig } from 'typedantic';

@modelConfig({ strict: false, frozen: false, extra: 'ignore' })
class UserCreate extends BaseModel {
  username: string = Field({ min_length: 3, max_length: 50 });
  email: string = Field({ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ });
  age: number = Field({ ge: 0, le: 150 });
  tags: string[] = Field({ default: [] });

  @fieldValidator('username', { mode: 'before' })
  static stripUsername(v: unknown): unknown {
    return typeof v === 'string' ? v.trim().toLowerCase() : v;
  }

  @modelValidator({ mode: 'after' })
  checkAge(this: UserCreate): UserCreate {
    if (this.age < 13) throw new ValidationError([...]);
    return this;
  }
}
```

**Key methods (Pydantic parity):**

| Method | Purpose |
|--------|---------|
| `UserCreate.model_validate(data)` | Validate arbitrary input → instance |
| `UserCreate.model_validate_json(json)` | Parse JSON then validate |
| `instance.model_dump()` | Serialize to plain object |
| `instance.model_dump_json()` | Serialize to JSON string |
| `UserCreate.model_json_schema()` | Generate JSON Schema |
| `instance.model_copy(update?)` | Immutable copy with updates |
| `UserCreate.model_fields` | Field metadata map |
| `UserCreate.model_construct(...)` | Skip validation (trusted data) |

### 3.2 Field & Annotated Pattern

Two equivalent styles (Pydantic parity):

```typescript
// Style 1: assignment with Field()
class Item extends BaseModel {
  name: string = Field({ min_length: 1 });
  price: number = Field({ gt: 0 });
}

// Style 2: Annotated (preferred for generics/unions)
import { Annotated } from 'typedantic';

class Item extends BaseModel {
  name: Annotated<string, Field({ min_length: 1 })>;
  price: Annotated<number, Field({ gt: 0 })];
}
```

### 3.3 Validators

#### Field Validators

```typescript
type ValidatorMode = 'before' | 'after' | 'wrap' | 'plain';

function fieldValidator(
  field: string | string[],
  options?: { mode?: ValidatorMode }
): MethodDecorator;
```

- **`before`**: receives raw input, runs before type coercion
- **`after`**: receives coerced value, runs after core validation
- **`wrap`**: receives `(value, handler)` — call `handler(value)` for inner validation
- **`plain`**: replaces core validation entirely

Field validators MUST be `static` methods (TypeScript equivalent of `@classmethod`).

#### Model Validators

```typescript
function modelValidator(options?: { mode: 'before' | 'after' | 'wrap' }): MethodDecorator;
```

- **`before`**: receives raw dict/object, returns transformed dict
- **`after`**: receives constructed instance, returns instance (post-init hook)
- **`wrap`**: middleware around entire model validation

#### Execution Order

```
model_validator(before)
  → for each field:
      field_validator(before) → core type validation → field_validator(after)
  → model_validator(after)
```

### 3.4 Model Configuration

```typescript
interface ConfigDict {
  strict?: boolean;              // no coercion
  frozen?: boolean;              // immutable instances
  extra?: 'ignore' | 'allow' | 'forbid';
  populate_by_name?: boolean;    // accept alias or field name
  validate_assignment?: boolean; // re-validate on property set
  use_enum_values?: boolean;
  json_schema_extra?: Record<string, unknown>;
  defer_build?: boolean;         // lazy schema compilation
  ser_json_timedelta?: 'iso8601' | 'float';
  str_strip_whitespace?: boolean;
  str_to_lower?: boolean;
  str_to_upper?: boolean;
}
```

Applied via `@modelConfig({ ... })` class decorator or static `model_config` property.

### 3.5 TypeAdapter

For validating non-BaseModel types (primitives, unions, arrays):

```typescript
const IntList = new TypeAdapter<number[]>({ type: 'list', items: Number });
IntList.validate_python([1, 2, 3]);
IntList.validate_json('[1,2,3]');
IntList.json_schema();
```

Also supports inferring from a TypeScript type + schema when used with decorators.

### 3.6 ValidationError

```typescript
class ValidationError extends Error {
  errors: ValidationErrorDetail[];

  error_count(): number;
  json(): string;  // FastAPI-compatible error format
}

interface ValidationErrorDetail {
  type: string;       // e.g. 'string_type', 'greater_than'
  loc: (string | number)[];  // ['body', 'user', 'email']
  msg: string;
  input: unknown;
  ctx?: Record<string, unknown>;
}
```

Error format intentionally matches Pydantic/FastAPI so fastypeapi can return identical 422 responses.

### 3.7 JSON Schema Generation

Every model generates Draft 2020-12 compatible JSON Schema:

```typescript
UserCreate.model_json_schema()
// → { type: 'object', properties: { ... }, required: [...], title: 'UserCreate' }
```

Supports:
- `$ref` / `$defs` for nested models
- `discriminator` for tagged unions
- Field constraints → `minimum`, `pattern`, etc.
- `json_schema_extra` for OpenAPI extensions

### 3.8 Special Types (typedantic.types)

| Type | Behavior |
|------|----------|
| `EmailStr` | Email format validation |
| `HttpUrl` / `AnyUrl` | URL parsing & validation |
| `PositiveInt`, `NegativeFloat`, etc. | Constrained numerics |
| `SecretStr` | Masked in repr/serialization |
| `UUID` | UUID v4 validation |
| `PastDate`, `FutureDate` | Date constraints |
| `Json<T>` | Parse JSON string into T |
| `constr()`, `conint()`, etc. | Legacy constrained types |

---

## 4. TypeScript Integration

### 4.1 Decorators Requirement

Typedantic requires **Stage 3 decorators** (TS 5.0+) or `experimentalDecorators` + `emitDecoratorMetadata`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false
  }
}
```

Stage 3 decorators (preferred for new code):

```json
{
  "compilerOptions": {
    "experimentalDecorators": false,
    "target": "ES2022"
  }
}
```

### 4.2 Type Inference Strategy

TypeScript types are **compile-time only**. Typedantic uses:

1. **`emitDecoratorMetadata`** — runtime `design:type` for field types
2. **Explicit `Field()` generics** — when metadata is insufficient
3. **`Annotated<T, Field(...)>`** — preferred, no metadata dependency
4. **`static model_fields` builder** — manual override for edge cases

```typescript
// Inference from metadata (works for simple types)
class M extends BaseModel {
  name: string;  // design:type → String
}

// Explicit when metadata loses info (unions, generics)
class M extends BaseModel {
  id: Annotated<string | number, Field({ description: 'ID' })>;
}
```

### 4.3 Generic Models

```typescript
class Response<T extends BaseModel> extends BaseModel {
  data: T;
  meta: PaginationMeta;
}

// Usage with concrete type parameter
class UserResponse extends Response<User> {}
```

---

## 5. Serialization Design

### 5.1 model_dump Options

```typescript
interface DumpOptions {
  mode?: 'python' | 'json';       // json mode converts Date→string, etc.
  include?: Set<string>;
  exclude?: Set<string>;
  exclude_unset?: boolean;
  exclude_defaults?: boolean;
  exclude_none?: boolean;
  by_alias?: boolean;
}
```

### 5.2 Computed Fields

```typescript
class Rectangle extends BaseModel {
  width: number;
  height: number;

  @computedField()
  get area(): number {
    return this.width * this.height;
  }
}
```

Included in `model_dump()` and JSON Schema as `readOnly`.

### 5.3 Custom Serializers

```typescript
@fieldSerializer('created_at')
serializeDate(v: Date): string {
  return v.toISOString();
}
```

---

## 6. Relationship to fastypeapi

Typedantic is a **standalone library**. fastypeapi depends on it for:

- Request body / query / path / header model parsing
- Response model serialization & filtering
- OpenAPI schema generation (`model_json_schema()`)
- 422 validation error responses

fastypeapi should never re-implement validation logic — it delegates entirely to Typedantic.

---

## 7. Comparison: Typedantic vs Zod vs Pydantic

| Aspect | Zod | Pydantic v2 | Typedantic |
|--------|-----|-------------|------------|
| Model style | `z.object({...})` chains | `class Model(BaseModel)` | `class Model extends BaseModel` |
| Validators | `.refine()`, `.transform()` | `@field_validator`, `@model_validator` | Same as Pydantic |
| Schema IR | ZodTypeDef internal | CoreSchema | CoreSchema (same concept) |
| JSON Schema | zod-to-json-schema (addon) | Built-in | Built-in |
| Ecosystem | React Hook Form, tRPC | FastAPI, SQLModel | fastypeapi |
| Runtime types | Inferred via `z.infer<>` | Class instance | Class instance + TS types |

---

## 8. Performance Strategy

Pydantic v2 achieves speed via Rust. Typedantic's strategy:

1. **Compile once** — CoreSchema → ValidatorTree at class definition time
2. **Avoid re-reflection** — cache everything on the class
3. **Fast paths** — specialized validators for common types (string, number, bool)
4. **Lazy compilation** — `defer_build: true` for large model graphs
5. **Future: WASM module** — compile ValidatorTree to WASM for hot paths (Phase 4)

Target: within 3–5× of Zod for typical models (acceptable tradeoff for API parity).

---

## 9. Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Missing required field | `ValidationError`, loc `['fieldname']` |
| Wrong type | `type` error with expected/actual |
| Extra fields (`extra: 'forbid'`) | Validation error on unknown keys |
| Union ambiguity | Try each branch, aggregate errors if all fail |
| Circular model refs | `$ref` in schema; lazy validator resolution |
| `undefined` vs missing | `undefined` treated as missing unless field has default |
| `null` vs missing | Configurable; default: `null` is valid for nullable fields |

---

## 10. Testing Strategy

- **Unit tests**: every CoreSchema node type, every validator mode
- **Parity tests**: port Pydantic's test cases to TypeScript (where applicable)
- **JSON Schema tests**: validate output against meta-schema
- **Benchmarks**: vs Zod, vs manual validation, vs class-validator
- **Property-based tests**: fast-check for round-trip validate → dump → validate

---

## 11. Documentation Plan

1. Getting Started — first model in 5 minutes
2. Models — fields, defaults, optional, nested
3. Validators — field & model, all modes
4. Serialization — dump, JSON, computed fields
5. JSON Schema — generation, customization
6. TypeAdapter — non-model validation
7. Settings (Phase 3) — env var loading
8. Migration from Zod — conceptual guide
9. Integration with fastypeapi

---

## 12. Open Questions

| Question | Recommendation |
|----------|----------------|
| Monorepo tool? | **Bun workspaces**; pnpm and npm supported |
| Min Node version? | **Node 20+** (native fetch, performance) |
| ESM-only? | **Yes** — CJS via dual publish if demand |
| Decorator standard? | Stage 3 primary, legacy fallback |
| Branding | `typedantic` npm, `@typedantic/core` internal |

---

## 13. Success Criteria

- [ ] API surface matches Pydantic v2 docs for core features (>90% parity)
- [ ] fastypeapi can build a CRUD app with zero Zod usage
- [ ] JSON Schema output validates in Swagger UI
- [ ] ValidationError format identical to FastAPI 422 responses
- [ ] Published docs with interactive examples
- [ ] Benchmark published comparing Zod and Typedantic
