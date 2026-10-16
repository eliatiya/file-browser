Goal: make eslint enforce the src/lib boundary, so a violation fails
`npm run check` at the lint step with a clear message, not only in
tests/rules.test.js.

Situation: I already tried this by hand. First run `git status` and
`git log -1 --oneline`. If my manual eslint change is uncommitted, stash it
with `git stash push -m "manual eslint version"`. If the last commit is my
manual eslint change, run `git reset --soft HEAD~1` and stash it the same way.
Tell me which case it was. Then build the feature fresh from the clean state.

Use context7 to look up the current ESLint flat-config docs for the version
in package.json before editing eslint.config, because the config format and
rule options have changed across recent versions.

Scope: in eslint.config, for files in src/lib/** only, report an error on
imports from src/ui (any relative path into ../ui) and on the globals
document, window and navigator. Built-in ESLint rules only, no new
dependencies. Don't change rules.test.js.

Done when:
- `npm run check` is green.
- Temporarily adding `import '../ui/x.js'` to a src/lib file makes
  `npx eslint src/lib` fail with your message; remove it afterwards and confirm.
- prompts/ex10-eslint-boundaries.md contains this prompt (create it if missing).
- Commit everything as "feat(lint): enforce src/lib boundary in eslint".

Note other bugs you see, don't fix them. Report: which git case it was,
files changed, which context7 docs you used, how your config differs from
my stashed version, and the check result.
