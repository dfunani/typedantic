# Corrections vs `main`

| Area | `main` issue | Tutorial fix |
|------|--------------|--------------|
| Field validators | Metadata target mismatch | Always `ctorOf(target)` |
| Caches | Subclass inherits parent schema | `Object.hasOwn` before read |
| `modelDumpJson` | Skips computed/serializers | `JSON.stringify(this.modelDump({mode:'json'}))` |
| Discriminator | Falls back to open union | Unknown tag → error |
| JSON Schema pattern | `String(/re/)` | use `.source` |
| `number` `multipleOf` | Declared unused | Enforce |
| Object `keysSchema` | Declared unused | Validate keys |
| Settings typing | Returns `BaseSettings` | `InstanceType<T>` |
| Settings prefix | Aliases ignore prefix | Prefixed lookup |
| Nested env | Flatten only | Rebuild nested objects |
| Mutable defaults | Shared `default: []` | Clone on apply; prefer `defaultFactory` |
| CI | Incomplete workflow | Full workflow file |

When reading [reference/](../../reference/) copies of `main`, apply these corrections as noted in phase chapters.
