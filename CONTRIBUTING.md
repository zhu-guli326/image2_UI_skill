# Contributing

## Local checks

Use Node.js 20+, Python 3.10+, and run the complete local gate before opening a change:

```bash
npm test
npm run doctor
npm run pack:check
python3 -m py_compile scripts/image2_asset.py
git diff --check
```

When changing validation behavior, run `image2-ui validate` against a representative local demo. Gallery pages and case demos are maintained and tested in the separate [`ui_case`](https://github.com/zhu-guli326/ui_case) repository.

## Changes to the skill

Keep `SKILL.md`, `README.md`, `PRODUCTION.md`, and the relevant references aligned when changing an image channel, validation rule, or CLI command. Generated bitmap assets in user projects need a local provenance record. UI text and interaction glyphs stay code-rendered.

Do not commit `.image2-ui/` loop output, credentials, generated API responses, or local `node_modules` directories.

## Pull requests

Describe the user-facing behavior and list the checks you ran. Keep gallery and demo changes in `ui_case`; keep this repository focused on the Skill and CLI.
