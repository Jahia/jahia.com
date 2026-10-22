# Dependency security

## braces — GHSA-vfj7-8cjw-p6xm

The build tools resolve `braces@3.0.3` through `micromatch` and `chokidar`.
As checked on 2026-10-22, npm publishes no newer version and the
[GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched release.

A Yarn patch in `.yarn/patches/` bounds parser nesting and recursive AST walks
to 128 levels. Excessive braces, parentheses and caller-supplied ASTs throw
`SyntaxError` with code `BRACES_MAX_DEPTH` before exhausting the JavaScript stack.
Normal globs, ranges, escaping and nested expressions retain their behavior;
pathological inputs exceeding this limit are deliberately rejected.

`package.json` resolutions and `yarn.lock` apply the patch to both consumers.
Use `yarn install --immutable` and `yarn test:security` to verify installation
and the regression cases. Keep the patch in Git: it is required build tooling,
not a local migration or test report. It is outside the Jahia package file list.

The patch retains the upstream version. Version-based audits and Dependabot
can still flag 3.0.3; no advisory is ignored or suppressed. This is a maintained
local mitigation, not an upstream fixed release or a vulnerability-free audit.
Replace it with an official fix when available, then rerun the regression tests,
format/lint, TypeScript, build/package and both development/production audits.
