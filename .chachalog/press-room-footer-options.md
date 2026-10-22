---
"jahiacom": major
---

Add an editable FR/EN Press Room using native Jahia heroes, sections and cards. Add optional localized footer labels and reusable internal/external links, preserving the footer links property and its existing constraints; the footer options require no content migration.

Simplify Content Editor forms, navigation, partner classification, resource selection and glossary editing. Retire unused properties and readers; these schema removals require the qualified content migration and a backup before upgrading an existing site. Keep the migration tools and restoration archives outside the module.

Batch guest LIVE glossary resource metadata and reuse bilingual term profiles through a bounded, module-owned cache. Preserve selection rules and current summaries, reread publication/access eligibility, invalidate on repository changes, and fall back to normal JCR reads when caching is unavailable. DEFAULT and authenticated renders bypass these caches.

Bound recursive braces parsing in build tooling through a maintained Yarn patch for GHSA-vfj7-8cjw-p6xm, with regression tests. No upstream fixed release is available; retain version-scanner and migration caveats in the delivery notes.
