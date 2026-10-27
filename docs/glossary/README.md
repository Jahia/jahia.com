# Jahia glossary

## Current module

The glossary uses the existing Basic page layout, navbar and footer. Compose the
index with the native Hero Without Image using its compact view, followed by
the Glossary component. The compact hero reads the existing theme and background
settings. The previous image and counter cards are no longer part of this layout. The glossary listing itself does not render a
hero or an H1. Keep the page title in the native hero.

Select a content folder using `entriesFolder`. Each `jahiacom:glossaryEntry`
provides a title, summary, aliases, definition, comparison, example and FAQ. The client-side filter searches titles, aliases and
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
comparison, example and FAQ. The About this entry
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

An earlier Security Check 0.1.43 report flagged editorial `dangerouslySetInnerHTML`
and dependency alerts against the older 1.5.2 baseline. It is historical evidence,
not a current scan result. Every editorial rich-text field in the current `Entry.tsx`
passes through `sanitizeHtml` at the final render boundary. Regression tests cover
scripts, handlers, unsafe URLs and rich-text preservation. The deferred payload is
escaped data; the client rejects cross-origin and executable suggestion links.
Shared memoization uses guest LIVE reads with current permission checks and bounded
storage. The audit CLI requires HTTPS outside localhost before sending credentials.
Repeat the dependency/security checks against the release being deployed; no blanket
security certification or exception to an external review is implied.

## Entry performance and links

Entry pages render editorial content and in-text links without calculating suggestions.
A single client Island loads Resources on this term and Explore related concepts as
it approaches the viewport. Both blocks share one request to the native, language-
and workspace-aware .suggestions.html template and one automatic selection.
The existing ranking, published/readable content checks and bilingual term profiles
are preserved. No selected result is written to JCR.

The separate template has per-user Jahia fragment caching, invalidates when content
changes anywhere in the current site, and expires after five minutes at most.
Its compact escaped payload contains only IDs, titles, native URLs and resource kinds.
The client validates same-origin links, uses a 25-second timeout, cancels on unmount,
and offers a translated retry control with focus restored after a successful retry.
Without JavaScript, the editorial content and in-text links remain readable, but the
two suggestion blocks are unavailable. This changes the discoverability of those
secondary links in initial HTML; no search-indexing benefit is claimed.

Legacy selection properties remain defined in CND for compatible module upgrades.
Stored ranking settings continue to apply; manual selections and obsolete CTA settings
remain hidden. Existing autoLinks=false disables the deferred blocks, autoTermLinks
independently controls links inside editorial text. Installation neither migrates
nor deletes editorial content.

Run `yarn test:glossary` for in-text links, full-page rendering and metadata tests.
With process-scoped `JAHIA_AUTHORIZATION` or `JAHIA_USER`, the read-only audit is:

```sh
yarn check:glossary --base-url http://localhost:8081 --site mySite --workspace live
```

It checks FR/EN renders, the deferred placeholder and the absence of synchronously selected recommendation links. Reports
are written outside the repository by default. Its HTTP timing includes the whole
response, not an isolated calculation. A clone before/after comparison is needed to
quantify gains; cached HTML and authenticated previews must be measured separately.

The module-owned guest LIVE cache retains metadata and the shared term vocabulary
for at most five minutes. JCR events invalidate records whose dependency paths are
affected, including both locations of a moved node. ACL, identity and unknown global
changes conservatively clear the cache. Concurrent invalidation prevents stale
writes; cached vocabulary rechecks guest read access before reuse. No sessions or
JCR nodes are retained. DEFAULT and authenticated rendering keep direct JCR reads.
Disabling automatic in-text links skips vocabulary construction for plain text;
authored links still resolve through the vocabulary to preserve native preview URLs.

Resource editorial text is read in batches of at most 128 candidates through one
guest session per batch. Prepared plain text is shared between entries in the
existing five-minute, bounded cache; access checks still run before every reuse.
The original fields, traversal limits and candidate pool are unchanged. Cache
generation and source-record tokens reject stale prepared writes. A failed batch
falls back to the original per-resource reader, without dropping candidates or
changing ranking. No prepared text is added to JCR content or the browser payload.
The guest text reader obtains stored values through already accessible properties,
without resolving HTML link/image attributes discarded by plain-text conversion.
Definitions and authenticated/preview rendering retain their normal URL resolution.
Suggestion rendering keeps the same scores and ordering without preparing audit
excerpts or rereading selected terms' bodies. Only the displayed resources have
their URLs resolved; the complete candidate pool still participates in ranking.

## Compact layout and preproduction transfer

The index displays dense rows and a search/alphabet toolbar. The shared boolean
`showUnusedLetters` is editable under Alphabetical index in Content Editor.
Missing or false hides empty letters; true shows the complete alphabet with
non-clickable empty letters. Search results update availability in both modes.
Return-to-index links sit beside each letter heading with a 44px target.

Entry pages retain in-text links and the return-to-index link. Resource cards and
related-term CTAs appear together through the deferred template.

Install the official package before transferring the glossary page. The package
does not replace JCR content or apply Docker-only editorial edits. Back up the
preproduction page, inspect the export dependencies, exclude the glossary entry
folder, and reconnect entriesFolder and the folder's glossaryIndexPage to the
existing preproduction nodes. Do not overwrite entries currently being edited.
A page import/publication is separate from module installation. Verify FR/EN,
form options, existing autoLinks settings, term links and breadcrumbs afterward.
