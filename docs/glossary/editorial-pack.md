# Editorial glossary pack

Local integration of the editorial pack reviewed on 1 October 2026. Installing the module changes rendering and exposes the fields below; it does **not** import or replace editorial content.

## Editorial fields

- `indexLabel` (translated, optional): label displayed and alphabetically sorted in the hub. Falls back to the entry title.
- `editorialAuthor` (translated, optional): author displayed at the bottom of the entry.
- `editorialDate` (translated, optional): manually selected editorial revision date. Publishing or changing technical settings does not replace it.
- `autoTermLinks` (shared, default true): enables links on exact mentions of glossary titles, index labels and aliases. English technical titles can also match in French text; the destination stays in French.
- `mergedInto` (shared weak reference, hidden): migration marker for a retired entry. It removes the entry from the hub and related-term selection and redirects its former page to the surviving entry.

The first paragraph of `body` appears below the H1. `definitionTitle` introduces the remaining paragraphs. Empty practical examples remain hidden. Three, six or nine matching resources appear initially (default six); the existing disclosure exposes the rest. Related terms share the final “Explore related concepts” section. Author, editorial date and a link to the glossary follow it.

## Automatic mentions

HTML is parsed on the server without rewriting stored rich text. Every unambiguous,
whole-term occurrence links to the corresponding entry, longest labels first. Titles,
index labels and aliases are recognized; English technical names also match in French.
Short uppercase acronyms require exact case. Self-links, ambiguous labels, code and
preformatted text are excluded. Exact paragraph or cell labels split by emphasis markup
are supported. Existing links in ordinary text are preserved and known glossary URLs
are resolved through Jahia, including preview mode.

Generic short labels (`vue/view`, `champ/field`, `zone/area`, `enfant/child`) do not
automatically link within prose. They remain eligible as exact standalone paragraph
or table labels. Longer concepts such as `Zone absolue` and explicit editorial links
are unaffected. This conservative rule avoids linking everyday uses such as
`version vue` to a technical entry.

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
node --test scripts/test-glossary-inline.mjs scripts/test-glossary-links.mjs scripts/test-glossary-related.mjs
yarn lint
yarn build
git diff --check
```

## Resource selection and form controls

`linkSelection.ts` defines bilingual vocabulary profiles for Absolute Area, Content
Reference, content properties, Visibility Condition, jExperience events and jExperience
properties. These profiles contain expressions, not resource identifiers or URLs.
Required groups must match within a nearby passage (250 characters before / 350 after
the anchor). These six profiles disable generic context and related-term fallbacks.
Other entries retain the existing ranking. Direct matches precede concept matches.
Readability, language, theme filters, exclusions and the 24-resource cap still apply.
No minimum resource count is imposed.

Stored `conceptTerms`, `conceptScope` and `conceptSignals` override the built-in profile
when the subject group is nonempty. The six Docker profiles were initialized from their
primary built-in rule without overwriting custom values. These fields and `linkThemes`
are now hidden, with values and behavior retained for compatibility.

`preferEducational` favors relevant guides and explanations within the same relevance
tier. It never makes an unrelated candidate eligible. `resourceDisplayCount` controls
3, 6 or 9 initially visible cards (default 6); the disclosure reveals the remaining ones.
The final CTA uses the first ranked resource and automatic related terms. The rejected
manual CTA destination customization has been removed. Section 4 remains Author and date.
Section 3 exposes the optional translated resource button label and two shared
Primary/Secondary selectors using the existing CTA component. Absent styles preserve
the filled resource button and outline related terms. No custom CTA CSS is added.

`rankLinksWithEvidence` supplies both ranking and diagnostics. Run
`scripts/report-glossary-concepts.mjs <corpus.json> <config.json> <output-directory>`
with a published-content snapshot and matching configuration. The read-only report
compares actual Docker live links with selection evidence, writes HTML/JSON outside
the repository and fails for unexplained links. It covers the six configured concepts
in FR/EN; normalized evidence passages are not verbatim quotations. Regenerate after
content/configuration changes. This is an audit snapshot, not a live dashboard.

Web portal's detailed Eurostat list was restored in FR/EN on Docker, retaining the
Belgium 2025 scope and independent-usage interpretation. This editorial change is not
part of module installation.
