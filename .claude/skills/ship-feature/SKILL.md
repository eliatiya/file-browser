---
name: ship-feature
description: Finish and commit a feature in this file explorer project. Use when the user says a feature is done, asks to wrap up, finish, or commit their work.
---

# Ship a feature

1. Run `npm run check`. If it fails, fix the cause and run it again until it
   is green. Don't commit with a red check.
2. Make sure the prompt used for this feature is saved under prompts/
   (e.g. prompts/ex04-image-preview.md). If it isn't, ask me for it.
3. Run `git status` and confirm .claude/settings.local.json is not staged.
4. Commit all related changes, including the prompts/ file, with a
   conventional message: feat(<area>): <short summary>.
5. Report: commit hash, files committed, and the final check result.
