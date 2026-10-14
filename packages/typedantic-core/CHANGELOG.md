# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-25

### Added

- `@typedantic/core` — zero-dependency schema IR, compiler, and `SchemaValidator`
- `@typedantic/model` — Pydantic-style `BaseModel`, `@Field`, and `modelConfig` (decorators)
- `@typedantic/settings` — `BaseSettings` / `settingsConfig` with env + `.env` loading
- ESM-only packages targeting Node.js ≥ 20
- Unit tests (Vitest) and functional smoke scripts

### Notes

- Public npm name is scoped (`@typedantic/*`) because the unscoped name `typedantic` is already taken on the registry.
- 0.1 does **not** include JSON Schema export, `TypeAdapter`, field/model validators, computed fields, or custom serializers. Those are planned for later minor releases.
