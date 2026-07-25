Read [CLAUDE.md](./CLAUDE.md) and follow the project instructions defined there.

Instructions are split by directory and are **not** all loaded automatically — read the ones covering the code you are touching:
- `Calculator/CLAUDE.md` + `Calculator/SPEC.md` — the damage calculator.
- `Manual/SPEC.md` — the interactive CoM2 manual.

When editing text that contains non-ASCII characters such as `→`, prefer `apply_patch` over PowerShell write/replace commands because `apply_patch` has preserved UTF-8 correctly in this repo.
