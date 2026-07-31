# Contributing

## Local checks

Use Node.js 20+, Python 3.10+, and run the complete local gate before opening a change:

```bash
npm test
npm run validate:all:static
npm run validate:demo
python3 -m py_compile scripts/image2_asset.py
git diff --check
```

`npm run validate:all` also exercises browser checks when Playwright is available. The command reports every demo and preserves warnings; it exits non-zero only when a demo has a validation failure or the audit process cannot produce a report.

## Changes to the skill

Keep `SKILL.md`, `README.md`, `PRODUCTION.md`, and the relevant references aligned when changing an image channel, validation rule, or CLI command. New generated bitmap assets need a local provenance record and must be wired into a demo. UI text and interaction glyphs stay code-rendered.

Do not commit `.image2-ui/` loop output, credentials, generated API responses, or local `node_modules` directories.

## Pull requests

Describe the user-facing behavior, list the checks you ran, and call out any accepted warning baseline changes. Keep unrelated demo redesigns separate from CLI or skill changes.
