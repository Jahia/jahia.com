# Jahia glossary

## Current module

The glossary uses the existing Basic page layout, navbar and footer. Compose the
index with a native Hero With Image, a separate native Section containing three
Cards, and the Glossary component. The glossary listing itself does not render a
hero or an H1. Keep the page title in the native hero.

Select a content folder using `entriesFolder`. Each `jahiacom:glossaryEntry`
provides a title, summary, aliases, definition, comparison, example, FAQ, selected
resources and related terms. The client-side filter searches titles, aliases and
summaries; the alphabet is calculated from the visible entries. Search labels,
placeholder and help text are editable and translated.

## Editorial setup

Create the page under Resources and add its reference to the existing footer
Resources column. Configure the folder with the `jahiacommix:glossaryFolder`
mixin and its `glossaryIndexPage` reference. Entries inherit the nearest configured
ancestor folder; the legacy per-entry `indexPage` remains a compatibility fallback.
Jahia generates term URLs and the breadcrumb. Vanity URLs require separate CMS
configuration and are not created by the module.

The term form keeps the title followed by the system name. Optional section
headings sit beside the rich text they describe. Search settings belong to the
index form. Help and labels are available in French and English; the Content
Editor interface language controls the form labels.

Use three native Cards with `glossaryMetric` set to `entries`, `letters` and
`updated`, pointing at the same `glossaryFolder`. Their titles remain editable
labels. Counts and the latest modification date are calculated from readable,
available translations in the current workspace. Dates use UTC and the page
language. The legacy manual `updatedLabel` is retained but hidden and ignored.
Existing Cards without a glossary metric keep their previous behavior.

Each term uses the site Layout and a common article view with definition,
comparison, example, FAQ, resources, related terms and update information.
References that are missing, inaccessible or unavailable in the current language
are omitted. Publish referenced pages and content along with the entries.

## Local content versus module release

The Docker site currently contains 71 entries in English and French under
`/sites/mySite/contents/glossary`, with its index at
`/sites/mySite/home/resources/glossary`. These JCR contents, media, menu/footer
configuration and editorial enrichments are not embedded in the module package.
They need a separately reviewed content transfer for another environment.
The editorial proposals require marketing review.

`wave1.json` and `wave1.xml` retain the original 30-entry mockup as fixtures, not a
current 71-entry export or a production migration. Do not import them over edited
content. `Preview.tsx`, `navigation-preview.json` and `footer-preview.json` are for
the standalone review only; they are excluded from the published package. The
preview snapshots are not the site's editable navigation configuration.

The ReadingAssistant prototype is not part of this feature or its module package.

## Validation and security review

Run `node --test scripts/test-glossary.mjs scripts/test-glossary-date.mjs`, the
project lint checks and `yarn build` (TypeScript, Vite client/SSR and package).
Validate translated forms, index filtering, links, native metric Cards and term
pages in Jahia after deployment.

Security Check 0.1.43, default profile, reports BLOCK on the current feature:
`Entry.tsx` renders the four editorial rich-text fields with
`dangerouslySetInnerHTML`. The values originate in JCR, not directly in visitor
request parameters. The CMS write/import sanitization and contribution boundary
still require security review; no local exception has been added. The dependency
audit found no new dependency advisories against the 1.5.2 main baseline, but
existing dependency alerts remain. A successful build is not security approval.
