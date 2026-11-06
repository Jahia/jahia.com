# Glossary FAQ rollout

The package adds `faqData` (translated string) without changing `faq`. The entry editor exposes Question / Answer rows with native RichText and reorder controls. Existing `faq` remains readable as a fallback but is hidden in the form. Rendering and metadata share the same selection; the generic Accordion schema wrapper is not used on glossary entries, so there is only one generated FAQPage.

## Migration

Run from the checked-out release with dependencies installed and Node **22.18+** (or 24). Install the new package first. The tool uses Jahia’s authenticated Groovy console, which must be available to the operator; it does not enable it or grant permissions. Supply `JAHIA_URL` and `JAHIA_AUTHORIZATION` as process environment variables. Never put credentials in tracked files, command history, or PR comments.

Start with a simulation:

```sh
node scripts/migrate-glossary-faq.mjs --site /sites/jahiacom --workspace both --backup-dir /secure/backups/glossary-faq-review
```

Inspect `plan.json`. Complete H3/answer pairs are converted in order, with links, lists and safe inline formatting. Scripts, event handlers and unsafe HTML are removed using the same sanitizer as the rendered glossary. Ambiguous text, incomplete answers and **any existing non-empty structured value** are skipped for editorial review. Skipped values are never deleted.

Apply with a **new** backup directory:

```sh
node scripts/migrate-glossary-faq.mjs --site /sites/jahiacom --workspace both --backup-dir /secure/backups/glossary-faq-apply --apply
```

`default` is the default workspace. `live` or `both` must be requested explicitly: LIVE is transformed independently, without publishing unrelated draft content. The tool writes only `faqData` and removes the successfully converted `faq`; no publication, versioning or editorial-date metadata is copied. Each workspace uses one save after checking every original value for concurrent edits. Workspaces are separate transactions: inspect the output after any failure before retrying. Re-running is safe; converted entries have no legacy value left.

`backup.json` contains the original field values and target paths for each workspace; `plan.json` contains expected replacements. Keep these private and outside Git. If rollback is needed, an administrator must compare the current `faqData` against `nextData` in the applied plan, restore only matching `faq` / `faqData` fields from the backup in the same workspace, and flush the affected pages. Never import whole-node exports or overwrite newer editorial changes. An entry that was created after the backup must not be touched.

Afterwards, run simulation again, review skips, and verify the published FR/EN pages: questions/answers and order must match, and exactly one FAQPage must be present. Exported content also requires the matching package on the target environment; package installation alone does not migrate repository content.

## Other scope

Press Room code includes optional PDF, media/source and author fields and revised cards. Existing editorial content and media are not packaged: export/import them separately through Jahia, with referenced assets. Demo PDFs and local content backups are excluded.

NavBar includes mouse hover intent and optional native landing-page references while preserving keyboard and mobile controls. No site-specific reference is provisioned automatically. The local AI summary prototype, direct-access hub experiment, credentials and Docker configuration are excluded.
