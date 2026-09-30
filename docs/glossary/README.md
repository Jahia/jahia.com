# Jahia glossary

## Current module

The glossary uses the existing Basic page layout, navbar and footer. Compose the
index with the native Hero Without Image using its compact view, followed by
the Glossary component. The compact hero reads the existing theme and background
settings. The previous image and counter cards are no longer part of this layout. The glossary listing itself does not render a
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
comparison, example, FAQ, resources and related terms. The About this entry
panel is no longer rendered.
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

## Automatic useful links

Resources and related terms are automatic: up to 24 resources and 6 terms.
The editor exposes `autoLinks` (enabled by default for new entries) and optional
`linkThemes`. Disabling automatic selection hides both lists. Themes restrict
resource candidates to at least one selected category; relevance is still required.
Without themes, resources are searched across the site. Related terms remain
based on the entry content. Legacy `resources`, `relatedTerms`, `linkKeywords`
and `excludedLinks` values are preserved in JCR but hidden and ignored.

Ranking prioritizes direct title/summary/body mentions, explicit comparison
concepts. Broader candidates need several distinctive words
shared with the definition; their weight depends on frequency in the candidate
pool. Common French/English words and generic content vocabulary are discounted.
Related entries are derived independently from the current definition and
comparison, without reading the previous manual references. A few of the highest
ranked concepts can broaden resource title/summary matches. No unrelated recent
content is added merely to fill a quota.

Candidates are constrained to readable, published content in the current site and
language. Resources reuse carousel metadata, category lineage and future-date
checks. Editorial text extraction is bounded to 160 nodes and six levels, does
not follow references and stops at child pages. The result is a deterministic
first-pass vocabulary ranking, not semantic AI; themes can narrow its scope.

Both highlighted reading links use the first ranked resource: direct matches
precede related matches. Resource kind (article or solution) never overrides
relevance. A related resource keeps the block visible when no direct match exists.

## Related-term coverage

Related terms use a separate selector: minimum 4, maximum 6 eligible entries.
Exact comparison concepts come first, followed by mentions in either direction
and weighted vocabulary similarity. Broad title-based domains prevent ambiguous
words from joining unrelated technical and marketing concepts. French/English
vocabulary equivalents cover common Jahia concepts (for example Zone / Area).
When fewer than four strong matches exist, the nearest eligible neighbours
complete the minimum. With no lexical evidence, glossary connectivity breaks ties;
these are general discovery suggestions, not asserted semantic equivalences.
The minimum cannot override permissions, publication, language, the current-entry
exclusion or the automatic-selection switch. If fewer than four other eligible
entries exist, only those available are shown. No manual references are used.

FR and EN share one related-term selection: merge both translations into a
stable profile, rank once conceptually, then use the selected UUIDs to render
localized titles, summaries and URLs. Both languages must be readable, present
and enabled on candidates. Their translation nodes are cache dependencies.
This prevents language-specific counts or ordering while preserving the 4–6 bounds.

Related-domain rules distinguish hosting, delivery, platform architecture, multisite,
assets, portals, rendering, content structure, workflow, taxonomy and personalization.
Native entry categories, when populated, are a secondary shared-category signal.
Explicit comparisons and distinctive mentions form an undirected concept graph;
shared neighbours strengthen nearby matches, with high-degree hubs discounted.
Diagnostic reasons are exposed by the pure selector for auditing. The standalone
form preview was removed; no Content Editor field or extension was installed.

## Calculation cache and read-only monitoring

Related-term ranking keeps a bounded in-memory cache per JavaScript runtime:
up to four corpora and 128 selections per corpus. Corpora above 300 entries or
one million key characters are calculated without being retained. Exact keys
include the eligible UUIDs and every bilingual ranking input (titles, aliases,
definitions, comparisons, concepts and category IDs). An edit or eligibility
change therefore produces a new key on the next calculation. Redeployment clears
the runtime cache. Old versions are evicted; this is not a persistent index.

JCR permission, publication and translation checks still run before selection.
No JCR node, session, permission decision, localized URL or rendered HTML is cached
by this selector. Cached selection IDs are mapped to the current eligible objects.
Existing Jahia render dependencies remain responsible for rendered-page freshness.
Resources use the existing independent ranking; this optimization targets related
terms. Cache hits depend on reuse of the same JavaScript runtime.

Run `yarn test:glossary` for deterministic selection and invalidation tests.
With `JAHIA_AUTHORIZATION` or `JAHIA_USER` supplied only in the current process,
run the read-only live audit:

```sh
yarn check:glossary --base-url http://localhost:8081 --site mySite --workspace default
```

The audit checks FR/EN counts and identical ordered targets, duplicate/self links,
eligible targets and page rendering. A full run visits every published eligible
entry in both languages. It reports missing translations/render failures rather
than silently accepting them. An empty inventory fails. Disabled automatic
selection must render no associated terms. This verifies technical consistency,
not editorial relevance or every visitor permission profile.

Reports default to the OS temporary directory; `--out` can name an external JSON
file. `--limit 6` runs a smaller sample. `--budget-ms 15000` sets the HTTP p95
threshold; `--baseline <previous-report.json>` also flags a p95 increase above
50% plus 100 ms on the exact same pages/site/workspace. Failures and timing warnings
return exit code 1. HTTP timings include JCR/resource ranking and the whole server
response, with three concurrent requests; they are not isolated selector timings.
Compare like-for-like warm-up and machine load. No background schedule, new editor
field or public diagnostics endpoint is installed.

## Compact layout and preproduction transfer

The index displays dense rows and a search/alphabet toolbar. The shared boolean
`showUnusedLetters` is editable under Alphabetical index in Content Editor.
Missing or false hides empty letters; true shows the complete alphabet with
non-clickable empty letters. Search results update availability in both modes.
Return-to-index links sit beside each letter heading with a 44px target.

Term resources remain selected for the current term: three cards are shown in a
full-width section before the Night CTA. A native details control reveals the
remaining selected resources and shows the actual total, never a site-library
link. Existing rich-text content and stored manual reference properties are not
deleted. Resource and related-term rendering uses the automatic selector;
explicit `autoLinks=false` hides these blocks. New forms default it to true.

Install the official package before transferring the glossary page. The package
does not replace JCR content or apply Docker-only editorial edits. Back up the
preproduction page, inspect the export dependencies, exclude the glossary entry
folder, and reconnect entriesFolder and the folder's glossaryIndexPage to the
existing preproduction nodes. Do not overwrite entries currently being edited.
A page import/publication is separate from module installation. Verify FR/EN,
form options, existing autoLinks settings, term links and breadcrumbs afterward.
