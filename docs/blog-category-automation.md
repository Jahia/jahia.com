# Blog categories and related resources

## Editorial workflow

1. Create or open a blog entry in Content Editor.
2. Enter its title, summary and body. After a short pause, an initially empty Categories field is filled with matching editorial/product categories, up to five detected topics, their existing ancestors, and the existing `resourcestypes/blog` and `pageTypes/blog_post` categories. For example, a DAM article gets its DAM and Integrations categories in addition to the two blog format categories.
3. Review the classification and SEO draft, and correct them using the native fields. Existing values are preserved. A manual change, including clearing a field, stops automatic updates to that field for the current session. Save the article normally.
4. Leave the resource carousel in **Automatic** mode to use the article's topics. Changes to the article's categories update the selection on subsequent renders; normal publication rules still apply to the live site.

Classification uses existing categories below `/sites/systemsite/categories/topics`, their labels and names, and a small French/English synonym dictionary. The complete category tree is read to resolve format categories and ancestors to their real UUIDs. Matching happens in the browser; the text is not sent to an AI service. These are keyword-based choices, not semantic AI classification, and require editorial review. No category or cluster is created automatically and no content is saved automatically.

The ranking now separates title, summary, HTML headings (h1–h6), and body. A title match contributes 20 points, a summary match 10, and headings contribute 6 per occurrence (at most two). Headings and script/style blocks are removed from body scoring. Body matches contribute their occurrence count up to three, then increase logarithmically to a maximum of six. A topic needs three points; incidental single body mentions remain excluded. Overlapping aliases do not add duplicate counts. Equal scores follow first mention in title/summary/headings/body, then stable category path, rather than translated label alphabetization. More specific eligible topics replace their ancestors in the suggestion list.

Existing CMS topics also recognize jContent/Content Editor, and Multilingual recognizes translation/traduction. These are explicit bilingual aliases, not AI inference. No new category is created. The maximum remains five topics; eligible topics beyond that limit are omitted, so editorial review remains important. Unavailable suggestions do not disable manual category selection.

## SEO draft

Only fields actually exposed by the blog form are filled, and read-only fields are skipped:

- `htmlTitle`: article title, with markup removed.
- `jcr:description`: readable summary, falling back to the article opening, shortened at a word boundary to at most 160 characters. This is an excerpt, not an AI-written summary; 160 is an editorial limit, not a guarantee about Google's displayed snippet.
  Meta Keywords (`seoKeywords`) is not filled automatically. Existing values remain untouched.
- `openGraphImage`: the selected article cover image reference.

Initially empty fields follow subsequent source edits until manually changed. Existing nonempty values are preserved, including when reopening an article or changing languages. The shared category field is therefore not replaced when switching between French and English. Manual corrections are protected during pending category requests too. A taxonomy error leaves title, description and image prefilling available. If no category matches confidently, only the existing blog format categories are selected.

## Carousel behavior

- On blogs in Automatic mode: use the most specific assigned topics; if none exist, use legacy `blogType` clusters. Match at least one of these topics/clusters, then order eligible resources by date.
- Technical categories such as resource type `blog` and page type `blog_post` do not establish thematic relevance.
- Categorized blogs show fewer cards when necessary, rather than completing with unrelated resources. If no related resource exists, the carousel is hidden outside edit mode.
- Articles without topics or clusters retain the previous latest-resources behavior.
- Automatic carousels on ordinary pages, manually curated selections and explicit category filters retain their existing behavior.
- Older migrated blog carousels may already be in **By categories** mode. Switch those to **Automatic** to enable inheritance; their existing editorial settings are not overwritten by a migration.
- Glossary entries (`jahiacom:glossaryEntry`) remain outside the automatic resource pool.

## Validation and rollout

Run `node --test scripts/test-blog-automation.mjs`, formatting, ESLint, Stylelint, TypeScript and `yarn build`.

Before release, validate the extension in the installed Content Editor: new and existing articles, French/English switching, automatic classification, manual removal, SEO prefill and manual overrides, native category selection, read-only access, save/reopen, and published carousel updates after changing categories. Automated tests mock the editor/JCR contracts and do not replace this integration check.

No CND property or constraint changes are required. Installation and publication follow the project's normal GitHub release workflow.

## Local combined validation — 28 September 2026

The Docker package now combines this automation with the glossary changes and
technical-category badge filtering. Its source is the `jahia-glossary` working
checkout; do not redeploy an older package from the separate main checkout.

All 39 blog/glossary tests pass. Real Content Editor checks on an unsaved French
blog confirmed DAM + Integrations + blog format classification, SEO description
and keyword prefilling, and preservation of manually edited descriptions and
manually cleared categories. Test drafts were discarded without saving. The
lightweight taxonomy query uses Apollo `no-cache`; results are already retained
for the current form/language, and must not populate the global JCR node cache
with an incomplete projection. No browser error was observed after this fix.

HTML title and social-image behavior are covered by automated tests; their full
editor save/reopen workflow remains part of preproduction release validation.
The Docker script was verified byte-for-byte against this combined source.

## Ranking refinement — local Docker

Validated on the imported jContent 3.7.1 article in both languages: CMS,
Multilingual and Security (same category IDs, same order). The public French
static/dynamic article yields DXP, CMS, Personalization, JavaScript and
Integrations. Its dedicated DXP heading explains the leading DXP score; this
is a first editorial calibration, not a claim of semantic certainty.
43 regression tests pass, including new heading, product vocabulary,
repetition, and tie-breaking cases. Existing/manual categories and SEO remain
protected; opening an already classified article does not overwrite its values.

## Product classification and keywords — 28 September 2026

Classification also recognizes the existing `blogTypes/product-updates` and
`products/enterprise_cms_and_dxp_for_organizations` categories. Product updates
require announcement wording in the title/summary or a versioned Jahia product
in the title; tutorial/upgrade titles are excluded. jContent identifies the Jahia
CMS product, as does Jahia with CMS/DXP/Content Editor vocabulary. A generic CMS
article does not identify the Jahia product. These dimensions are additional to
the maximum of five topics and only use categories that exist in the taxonomy.

For jContent 3.7.1, Product Updates and the Jahia CMS/DXP product are now
suggested alongside the relevant topics. An already populated category field
is preserved; missing categories are offered in the suggestion panel. Meta
Keywords prefilling has been removed, superseding the earlier local check above.

Existing Blog and Article de blog categories alone no longer lock automatic topic filling. IDs are resolved from their exact taxonomy paths. Existing editorial or unknown categories remain protected, as do manual edits during the current form session.

## Glossary pilot — 30 September 2026

Glossary entries now inherit native jmix:categorized, as blogs do. No existing
property constraints change. Their empty Meta Description uses the summary,
falling back to the definition body, with the same 160-character excerpt rule.
Existing descriptions and manual edits remain authoritative. Meta Keywords
remain untouched. Blog description prefilling continues unchanged.

Glossary category suggestions require equality between the normalized term title
and an existing topic name/label or a curated exact synonym. Broad blog aliases
are deliberately excluded. Definition, comparison, example, FAQ, and resource
text never qualify a glossary category. No blog formats or parent categories are
added. No match means no automatic tag; existing categories are preserved.
The pilot updates the editor draft, not all existing entries in bulk, and does
not save or publish automatically.

## Complete glossary descriptions — 30 September 2026

Glossary descriptions now keep only complete sentences within 160 characters,
using sentence segmentation rather than cutting at a word boundary. If the first
sentence is too long or the source is unfinished, a short complete sentence
introduces the named term instead. Existing editorial descriptions remain
protected. This change applies to glossary entries; blog excerpt behavior is
unchanged. The existing 71 FR/EN entries have separately reviewed, concise full
sentences stored as descriptions, without changing their summary or body.

## Complete blog descriptions — 30 September 2026

Blogs now use the same complete-sentence extraction as glossary entries. No
word-boundary truncation or trailing ellipsis is generated. If no full source
sentence fits 160 characters, a complete sentence introduces the article by its
title; very long titles use a short generic article introduction. Existing
editorial descriptions remain protected during editing. A separate local audit
corrects existing truncated descriptions without changing summaries or bodies.

## Form initialization fix — 30 September 2026

Content Editor invokes selector change handlers for initial values and sends
`undefined` when a field unmounts. Cleanup notifications must not invalidate
analysis scheduled by another field. Replayed initial values after a section
refresh are deduplicated by the source fields, preventing suggestion updates
from triggering another loading/ready cycle.

Opening a populated blog or glossary form analyses its current content without
requiring a text edit. Empty SEO fields and empty/default-only classification
fields can be filled in the draft. Existing editorial categories remain selected,
with missing matches offered as suggestions. Existing SEO and manual edits remain
protected. Saving and publishing are still explicit editorial actions. This fix
does not require importing content or changing the content model.
