# Editorial glossary pack

## Automatic structured data and social metadata

The page layout generates separate JSON-LD scripts for glossary entries:
`DefinedTerm`, `WebPage`, `BreadcrumbList` (when an index is configured), and
`FAQPage` (when the visible FAQ has nonempty h3 question/answer pairs). FAQ answers
come from the sanitized rich text; updating editorial FAQ content updates the
schema. Publication dates use `editorialDate`; modification dates use the current
translation's `jcr:lastModified`. Missing or invalid dates are omitted.

Pages containing the native Glossary component generate a localized
`DefinedTermSet` and a two-level breadcrumb, also shown in the existing header.
The set uses the same eligibility function and displayed labels as the directory;
merged, inaccessible and unavailable translations are omitted. Nested child-page
directories do not turn their ancestor pages into hubs.

URLs come from Jahia's native default vanity selection and site URL generator,
with native live URLs as a fallback when no vanity exists. No host or glossary
slug is hard-coded. FR and EN use separate set identifiers. Existing editorial
JSON-LD of these glossary types is replaced at render time, including blocks in
arrays or `@graph`; unrelated valid schemas remain. Stored content is unchanged.

Unlike the delivery ZIP examples, `inLanguage` is placed on `WebPage`, `FAQPage`
and `DefinedTermSet`, not `DefinedTerm`: the latter is not one of the types
supported by [Schema.org's inLanguage property](https://schema.org/inLanguage)
(checked 16 October 2026). Language-specific URLs and set membership identify
each translated term.

Glossary entries and hubs also generate `og:url`, `og:type`, `og:locale` and
Twitter card/title/description metadata. The existing `openGraphImage` field on
an entry wins; otherwise an entry inherits its configured glossary index's image.
Set the approved 1200 × 630 glossary image once on the hub to share it across
entries. Without an assigned image, no image URL is invented. Both Open Graph and
Twitter use the resolved image; Content Editor hints show the inherited image.

No content-model migration, content import or deployment is included. `yarn test:glossary` includes the
structured-data and server-adapter tests; these do not replace an HTTP rendering
check in Jahia after a separately authorized deployment.

Local integration of the editorial pack reviewed on 1 October 2026. Installing the module changes rendering and exposes the fields below; it does **not** import or replace editorial content.

## Editorial fields

- `indexLabel` (translated, optional): label displayed and alphabetically sorted in the hub. Falls back to the entry title.
- `editorialDate` (translated, optional): manually selected editorial revision date. Publishing or changing technical settings does not replace it.
- `autoTermLinks` (shared, default true): enables links on exact mentions of glossary titles, index labels and aliases. English technical titles can also match in French text; the destination stays in French.
- `mergedInto` (shared weak reference, hidden): migration marker for a retired entry. It removes the entry from the hub and redirects its former page to the surviving entry.

The first paragraph of `body` appears below the H1. `definitionTitle` introduces the remaining paragraphs. Empty practical examples remain hidden. The editorial date and return-to-glossary link follow the article. Resource
recommendations and related-term lists are no longer calculated or displayed.

## Automatic mentions

HTML is parsed on the server without rewriting stored rich text. Automatic links
require complete multi-word expressions from titles, index labels and aliases. Single
words and acronyms (including CMS, content, template, module, visitor and goal) never
trigger automatic links, even as table notions. Longest eligible expressions match first.
English technical names can match in French; destinations stay in the current language.

The first paragraph displayed below H1 contains no links. Outside that introduction,
only the first eligible occurrence per target is linked, across body, comparison,
example and FAQ together, with at most six automatic links per page. Existing glossary
links participate in target deduplication; external editorial source links are preserved.
Self-links, ambiguous labels shared by multiple targets, code and preformatted text
are excluded. Exact multi-word paragraph or cell labels split by emphasis are supported.
Known editorial glossary URLs are resolved through Jahia, including preview mode.

Every rich-text section is sanitized at the final render boundary with `xss`, using
an explicit tag/attribute allowlist. Scripts, active embeds, event handlers, inline
styles and unsafe URL schemes are removed from rendered HTML, not from stored content.
Tables, emphasis, safe links, source citations and percentages are preserved.
External links opening a new tab receive `noopener noreferrer`.

Headings h1-h6, column header cells, thead and captions remain
non-clickable. Row headers in the table body remain eligible for term links. Existing anchors in excluded headings and column headers are unwrapped at render time, even when automatic
mentions are disabled. Read permissions, language availability and merged entries are
checked; cache dependencies include the folder, entries, translations and URL mappings.
Creation of a new entry followed by cache invalidation still needs an end-to-end test.

## Local content migration

The local migration updates 66 entries in FR and EN by node name, preserving their local UUIDs. The pack's UUIDs must not be imported over a different instance. Back up both `default` and `live` workspaces before migrating another environment.

| Retired entry                 | Surviving entry                   |
| ----------------------------- | --------------------------------- |
| `headless-cms-vs-dam`         | `dam-vs-cms`                      |
| `headless-vs-traditional-cms` | `headless-vs-decoupled-vs-hybrid` |
| `intranet-vs-extranet`        | `intranet`                        |
| `types-of-web-portals`        | `web-portal`                      |
| `default-workspace`           | `workspace`                       |

The five original nodes retain their content for recovery. Set their `mergedInto` weak reference **and** native `jmix:cache` / `j:expiration = 0`. The latter is required because Jahia otherwise caches the empty redirect fragment without replaying its HTTP status. Active entries keep their normal cache. Validate each redirect repeatedly in both languages, not only on its first request.

The migration also registers the pack's URLs using native vanity mappings. On a local site without a matching virtual host, Jahia still builds native `/sites/mySite/...` URLs. The renderer resolves links to those URLs rather than relying on public-domain routing.

Local verification includes all 132 rendered translations and UUID/content comparison against the pack. Preproduction content migration, publication holds, structured data and public URL routing remain separate deployment work; none is automatically applied by this module.

## Checks

```sh
yarn test:glossary
yarn lint
yarn build
git diff --check
```

## Deferred automatic suggestions

Resource recommendations and related terms share a single automatic selection in a
separate request, triggered near the bottom of the article. The initial render keeps
only editorial content and in-text links. Existing ranking settings remain stored and
compatible; no migration or content transfer is needed. The independent autoTermLinks
option controls only links inside editorial text. Suggestions require JavaScript.

Web portal's detailed Eurostat list was restored in FR/EN on Docker, retaining the
Belgium 2025 scope and independent-usage interpretation. This editorial change is not
part of module installation.
