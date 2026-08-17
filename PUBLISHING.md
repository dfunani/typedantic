# Publishing

See the full guide: [../PUBLISHING.md](../PUBLISHING.md)

Quick publish order:

```bash
pnpm build && pnpm test
npm publish --access public -C packages/typedantic-core
npm publish --access public -C packages/typedantic
npm publish --access public -C packages/typedantic-settings
```
