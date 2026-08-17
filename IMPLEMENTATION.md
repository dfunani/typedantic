# Typedantic — Implementation Plan

> Phased roadmap from zero to production-ready Pydantic-for-TypeScript.

---

## Phase 0: Project Scaffolding (Week 1)

### 0.1 Repository Setup

```
typedantic/
├── package.json              # Bun workspace root (also supports npm)
├── pnpm-workspace.yaml       # pnpm compatibility
├── turbo.json
├── tsconfig.base.json
├── packages/
│   ├── typedantic-core/
│   └── typedantic/
├── vitest.config.ts
├── eslint.config.js
└── .github/workflows/ci.yml
```

**Tasks:**
- [ ] Initialize a Bun workspace monorepo with `typedantic` and `@typedantic/core`
- [ ] Verify the workspace scripts with pnpm and npm
- [ ] Configure TypeScript 5.5+, strict mode, ESM
- [ ] Set up Vitest for unit tests
- [ ] Set up tsup for bundling (ESM + .d.ts)
- [ ] Configure changesets for versioning
- [ ] CI: lint → typecheck → test → build

**Dependencies (core):**
- None for runtime (zero-deps goal for `@typedantic/core`)

**Dependencies (typedantic):**
- `@typedantic/core` (workspace)
- `reflect-metadata` (optional peer, for decorator metadata)

---

## Phase 1: CoreSchema & Validator Engine (Weeks 2–4)

> Build `@typedantic/core` — the validation runtime.

### 1.1 CoreSchema Type System

**File:** `packages/typedantic-core/src/schema/types.ts`

Implement the full CoreSchema tagged union (see DESIGN.md §2.2).

**Tasks:**
- [ ] Define all CoreSchema node types with TypeScript discriminated unions
- [ ] Schema builder helpers: `intSchema()`, `strSchema()`, `modelSchema()`, etc.
- [ ] Schema serialization/deserialization (for debugging & caching)
- [ ] Unit tests for schema construction

**Acceptance criteria:**
- Can programmatically build a CoreSchema for `{ name: string, age: number }`
- Schema is JSON-serializable

### 1.2 Schema Compiler

**File:** `packages/typedantic-core/src/compiler/compile.ts`

Compile CoreSchema → ValidatorTree (runtime validator graph).

```typescript
interface ValidatorNode {
  validate(input: unknown, ctx: ValidationContext): unknown;
  type: string;
  children?: ValidatorNode[];
}

interface ValidationContext {
  path: (string | number)[];
  config: ValidationConfig;
  errors: ValidationErrorDetail[];
}
```

**Tasks:**
- [ ] Implement compiler for primitive types: `int`, `str`, `bool`, `float`, `literal`, `enum`
- [ ] Implement `list`, `tuple`, `dict`, `set`
- [ ] Implement `union` with branch trying + error aggregation
- [ ] Implement `nullable`, `optional`, `default`, `default-factory`
- [ ] Implement `function-before`, `function-after`, `function-wrap`, `function-plain`
- [ ] Implement `model` and `model-fields` nodes
- [ ] Cache compiled trees by schema hash

**Acceptance criteria:**
- Validate `{ name: "Alice", age: 30 }` against a hand-built schema
- Union validation tries all branches
- Error paths are correct: `['address', 'zip']`

### 1.3 SchemaValidator & SchemaSerializer

**Files:**
- `packages/typedantic-core/src/validator/schema-validator.ts`
- `packages/typedantic-core/src/serializer/schema-serializer.ts`

```typescript
class SchemaValidator {
  constructor(schema: CoreSchema);
  validate_python(input: unknown, options?: ValidateOptions): unknown;
  validate_json(json: string, options?: ValidateOptions): unknown;
  get_errors(): ValidationErrorDetail[];
}

class SchemaSerializer {
  constructor(schema: CoreSchema);
  to_python(instance: unknown, options?: DumpOptions): unknown;
  to_json(instance: unknown, options?: DumpOptions): string;
}
```

**Tasks:**
- [ ] `validate_python` with strict/coerce modes
- [ ] `validate_json` with JSON parsing
- [ ] `to_python` / `to_json` with exclude/include/alias options
- [ ] Throw `ValidationError` on failure (collect all errors, not fail-fast by default)

### 1.4 ValidationError

**File:** `packages/typedantic-core/src/errors/validation-error.ts`

**Tasks:**
- [ ] `ValidationError` class with `errors[]`, `error_count()`, `json()`
- [ ] Error detail builder with `loc`, `type`, `msg`, `input`, `ctx`
- [ ] Error type constants matching Pydantic (`string_type`, `greater_than`, etc.)

**Milestone 1 deliverable:** Core engine validates primitives, objects, and unions without BaseModel.

---

## Phase 2: BaseModel & Public API (Weeks 5–7)

> Build `typedantic` package — user-facing Pydantic-like API.

### 2.1 Decorator Infrastructure

**Files:**
- `packages/typedantic/src/internal/decorators.ts`
- `packages/typedantic/src/internal/metadata.ts`

**Tasks:**
- [ ] Support Stage 3 decorators (TC39) as primary
- [ ] Fallback for `experimentalDecorators` + `emitDecoratorMetadata`
- [ ] Metadata storage: field name → FieldInfo, validators, config
- [ ] Class decorator registry for `@modelConfig`

### 2.2 Field & FieldInfo

**File:** `packages/typedantic/src/fields/field.ts`

```typescript
function Field<T>(options?: FieldOptions): FieldInfo<T>;

interface FieldOptions {
  default?: T;
  default_factory?: () => T;
  alias?: string;
  title?: string;
  description?: string;
  examples?: unknown[];
  deprecated?: boolean;
  // constraints
  min_length?: number;
  max_length?: number;
  pattern?: string | RegExp;
  ge?: number;
  gt?: number;
  le?: number;
  lt?: number;
  multiple_of?: number;
  strict?: boolean;
  json_schema_extra?: Record<string, unknown>;
}
```

**Tasks:**
- [ ] `Field()` factory returning FieldInfo marker
- [ ] `Annotated<T, Field(...)>` pattern support
- [ ] FieldInfo → CoreSchema field node conversion
- [ ] Default value resolution (`undefined` vs missing vs `null`)

### 2.3 BaseModel

**File:** `packages/typedantic/src/models/base-model.ts`

**Tasks:**
- [ ] Class extends hook: on subclass definition, collect fields, build CoreSchema, compile validator
- [ ] `model_validate(data)` / `model_validate_json(json)`
- [ ] `model_dump(options?)` / `model_dump_json(options?)`
- [ ] `model_copy(update?, options?)`
- [ ] `model_construct(**values)` — skip validation
- [ ] `model_fields` static property
- [ ] `model_config` / `@modelConfig`
- [ ] `extra` handling: ignore / allow / forbid
- [ ] `frozen` mode — throw on attribute mutation
- [ ] `validate_assignment` — re-validate on set

**Acceptance criteria:**
```typescript
class User extends BaseModel {
  name: string = Field({ min_length: 1 });
  age: number = Field({ ge: 0 });
}

const u = User.model_validate({ name: 'Alice', age: 30 });
expect(u.model_dump()).toEqual({ name: 'Alice', age: 30 });
```

### 2.4 Validators

**Files:**
- `packages/typedantic/src/validators/field-validator.ts`
- `packages/typedantic/src/validators/model-validator.ts`

**Tasks:**
- [ ] `@fieldValidator('field', { mode: 'before' | 'after' | 'wrap' | 'plain' })`
- [ ] `@modelValidator({ mode: 'before' | 'after' | 'wrap' })`
- [ ] Multi-field validators: `@fieldValidator('a', 'b')`
- [ ] Ordering: model before → field before → core → field after → model after
- [ ] Wrap handler: `handler(value)` triggers inner validation

### 2.5 TypeAdapter

**File:** `packages/typedantic/src/adapters/type-adapter.ts`

**Tasks:**
- [ ] `new TypeAdapter<T>(schemaOrType)`
- [ ] `validate_python`, `validate_json`, `dump_python`, `dump_json`
- [ ] `json_schema()`

### 2.6 Special Types

**File:** `packages/typedantic/src/types/special.ts`

**Tasks (incremental):**
- [ ] `EmailStr`, `HttpUrl`, `AnyUrl`
- [ ] `UUID`
- [ ] `PositiveInt`, `NegativeInt`, `NonNegativeInt`, etc.
- [ ] `SecretStr`
- [ ] `Json<T>`

**Milestone 2 deliverable:** Full BaseModel with validators works end-to-end.

---

## Phase 3: JSON Schema & Serialization (Weeks 8–9)

### 3.1 JSON Schema Generator

**File:** `packages/typedantic/src/json-schema/generator.ts`

**Tasks:**
- [ ] CoreSchema → JSON Schema Draft 2020-12
- [ ] `$defs` / `$ref` for nested models
- [ ] Field constraints → schema keywords
- [ ] `title`, `description`, `examples`, `deprecated`
- [ ] Discriminated unions → `oneOf` + `discriminator`
- [ ] `model_json_schema(mode='validation' | 'serialization')`
- [ ] `json_schema_extra` passthrough

### 3.2 Computed Fields & Serializers

**Files:**
- `packages/typedantic/src/fields/computed.ts`
- `packages/typedantic/src/serializers/field-serializer.ts`

**Tasks:**
- [ ] `@computedField()` decorator
- [ ] `@fieldSerializer('field')` decorator
- [ ] Include computed fields in dump + JSON Schema (readOnly)
- [ ] `@modelSerializer` for whole-model custom serialization

### 3.3 Alias & Population

**Tasks:**
- [ ] Field aliases (`Field({ alias: 'userName' })`)
- [ ] `populate_by_name: true` — accept both alias and field name
- [ ] `by_alias` in serialization

**Milestone 3 deliverable:** OpenAPI-compatible JSON Schema from any model.

---

## Phase 4: Advanced Features (Weeks 10–12)

### 4.1 Generic & Inheritance

**Tasks:**
- [ ] Model inheritance — child extends parent fields
- [ ] Generic models with type parameters
- [ ] `createModel(name, fields, options?)` — dynamic model creation (like Pydantic's `create_model`)

### 4.2 Discriminated Unions

```typescript
class Cat extends BaseModel {
  pet_type: Literal['cat'] = 'cat';
  meows: boolean;
}

class Dog extends BaseModel {
  pet_type: Literal['dog'] = 'dog';
  barks: boolean;
}

type Pet = Cat | Dog;  // discriminated on pet_type
```

**Tasks:**
- [ ] Tagged union validation via discriminator field
- [ ] JSON Schema `discriminator` mapping

### 4.3 RootModel

```typescript
class UserList extends RootModel<User[]> {
  root: User[];
}
```

**Tasks:**
- [ ] `RootModel<T>` — validate a bare type, not an object wrapper

### 4.4 Settings (typedantic-settings)

**New package:** `packages/typedantic-settings`

**Tasks:**
- [ ] `BaseSettings` extends BaseModel
- [ ] Load from env vars, `.env` files
- [ ] Field → env var name mapping (`Field({ alias: 'DATABASE_URL' })`)
- [ ] Nested settings via delimiter (`DB__HOST`)

### 4.5 Performance & Benchmarks

**Tasks:**
- [ ] Benchmark suite: Typedantic vs Zod vs class-validator
- [ ] Profile hot paths, optimize validator tree dispatch
- [ ] `defer_build` support for large schemas
- [ ] Optional: investigate WASM compilation of validator trees

**Milestone 4 deliverable:** Feature parity with Pydantic v2 core (no dataclass/TypedDict).

---

## Phase 5: Polish & Release (Weeks 13–14)

### 5.1 Documentation

- [ ] VitePress docs site
- [ ] API reference (auto-generated from TSDoc)
- [ ] Migration guide from Zod
- [ ] fastypeapi integration guide

### 5.2 Release

- [ ] npm publish `typedantic` and `@typedantic/core`
- [ ] README with badges, quick start
- [ ] CHANGELOG
- [ ] License (MIT)

---

## Implementation Order Summary

```
Phase 0: Scaffolding
    ↓
Phase 1: @typedantic/core (CoreSchema → ValidatorTree → SchemaValidator)
    ↓
Phase 2: typedantic (BaseModel, Field, validators, TypeAdapter)
    ↓
Phase 3: JSON Schema + serialization
    ↓
Phase 4: Advanced (generics, unions, settings, perf)
    ↓
Phase 5: Docs + npm release
    ↓
Phase 6: fastypeapi integration (parallel track — see fastypeapi/IMPLEMENTATION.md)
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Validation engine | Custom CoreSchema compiler | Pydantic parity, OpenAPI integration |
| No Zod dependency | — | Different architecture; avoid layering Zod under classes |
| Decorators | Stage 3 + legacy fallback | Future-proof + ecosystem compat |
| Type metadata | `emitDecoratorMetadata` + Annotated | Best DX for simple & complex cases |
| Error format | Pydantic-compatible | fastypeapi 422 responses |
| Test framework | Vitest | Fast, ESM-native, TS-first |
| Bundler | tsup | Simple ESM + d.ts generation |

---

## File-by-File Build Order (Phase 1–2 Critical Path)

```
1.  typedantic-core/src/schema/types.ts
2.  typedantic-core/src/schema/builders.ts
3.  typedantic-core/src/errors/validation-error.ts
4.  typedantic-core/src/compiler/compile.ts
5.  typedantic-core/src/validator/primitives.ts      (int, str, bool, float)
6.  typedantic-core/src/validator/collections.ts     (list, dict, tuple)
7.  typedantic-core/src/validator/union.ts
8.  typedantic-core/src/validator/model.ts
9.  typedantic-core/src/validator/schema-validator.ts
10. typedantic-core/src/serializer/schema-serializer.ts
11. typedantic/src/internal/metadata.ts
12. typedantic/src/internal/decorators.ts
13. typedantic/src/fields/field.ts
14. typedantic/src/config/model-config.ts
15. typedantic/src/models/base-model.ts
16. typedantic/src/validators/field-validator.ts
17. typedantic/src/validators/model-validator.ts
18. typedantic/src/adapters/type-adapter.ts
19. typedantic/src/index.ts                          (public exports)
```

---

## Testing Milestones

| Phase | Test Count Target | Key Test |
|-------|-------------------|----------|
| 1 | 80+ | Primitive + union validation |
| 2 | 200+ | BaseModel + all validator modes |
| 3 | 280+ | JSON Schema snapshot tests |
| 4 | 400+ | Pydantic parity port subset |
| 5 | 400+ | + integration tests |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| TS decorator instability | High | Support both Stage 3 and legacy; document requirements |
| `emitDecoratorMetadata` limitations with unions | Medium | Promote `Annotated` pattern in docs |
| Performance vs Zod | Medium | Compile-once architecture; benchmark early |
| Scope creep (full Pydantic parity) | High | Strict phase gates; v1 = core only |
| Circular model dependencies | Medium | Lazy schema resolution + `$ref` |
