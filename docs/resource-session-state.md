# Resource listing state

## Blog pagination

Blog pages use server-rendered pagination with explicit URLs: the clean listing URL is page one and ?blogPage=2 is page two. Previous/next controls are real HTML links; the page selector navigates to the same URLs. Each response contains only its selected article slice, with the existing featured article retained. The article sequence, editorial page size, eligibility rules and category matching are preserved.

The URL takes precedence over any old sessionStorage state. A reload, shared link, browser back navigation or return from an article restores the same page and filters. Filter forms use GET and offer an Apply button for browsers without JavaScript; JavaScript submits on selection changes. Applying or resetting filters returns to page one. Category availability still uses metadata for the whole eligible collection, not just the current page.

The clean first page retains Jahia's native canonical and language alternates. Pages two and later provide exactly one canonical containing their normalized page number; the native site-settings-seo filter detects that existing tag and does not add another. Pagination numbers are not assumed to be equivalent translations: the actual FR/EN collections have different lengths, so numbered pages do not emit misleading hreflang links to other collections. Filter combinations remain navigable but are marked noindex,follow to preserve the previous intent that private filter combinations are not separate indexed landing pages.

Malformed page numbers resolve to page one. Numbers beyond the last result page resolve to the final available slice and its canonical URL. The blog view and basic page template declare blogPage/filter1/filter2 as module cache-key parameters, preventing page/filter fragments from being reused for another URL. This is module code, not server cache configuration. No CND change or content migration is required.

## Other resource lists and detail pages

ListChildren and AdvancedListChildren keep their existing sessionStorage behavior, keyed by pathname and component identifier. Their valid selections survive reload and article return. Malformed or blocked storage still falls back to in-memory state. Legacy filter and listing parameters continue to be cleaned on those lists and detail pages without deleting unrelated tracking parameters or anchors.

Global search, the partner directory, glossary suggestions and ResourceCarousel pagination are outside this change. The carousel's 3/2/1 responsive behavior is unchanged.

## Validation

- Unit tests cover URL normalization, page boundaries, complete non-overlapping slices and the initial previous/next link tree. Existing session-state tests remain applicable to other resource lists.
- On the isolated clone, crawl every unfiltered FR/EN blog page as HTML without JavaScript; check one canonical per page, complete original article order and no duplicate/missing articles.
- Browser checks cover page selector, previous/next, browser back, filter submission/reset, reload, return from an article, mobile and no-JavaScript navigation.
- Formatting, ESLint/Stylelint, TypeScript, Vite/SSR build, package generation and diff checks are required. Validate representative EDIT/preview paths and record any checks not performed; this is not a complete Content Editor or accessibility audit.

Source: [Google pagination recommendations](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading), checked 21 October 2026. Technical crawlability does not establish actual indexing or a traffic improvement.

## Glossary metadata cache

Public guest LIVE glossary suggestions reuse plain resource metadata, bilingual term profiles and editorial text traversals. The service is owned by the active module bundle and unregisters its two JCR listeners when that bundle stops or updates. Its shared budget is 2,048 entries and 2,000,000 characters; entries expire after 30 seconds. Editorial traversals have a separate limit of 1,000 roots and 12,000,000 characters with the same expiry; they preserve the 160-node/six-level traversal rules. Jahia saves in DEFAULT or LIVE invalidate both caches. Internal Jackrabbit maintenance writes bypass these Jahia events and must be followed by module reload or explicit invalidation. No sessions, JCR nodes or user access decisions are stored.

Resource queries, read access, language visibility and publication eligibility are checked on each request. Bilingual profiles are separated by site, language, node identity and currently readable translations. Current nodes still resolve public URLs; the existing ranking and card algorithms remain authoritative. Failed initialization, concurrent invalidation or exceeded cache limits use normal JCR reads. EDIT/DEFAULT and authenticated requests bypass the service. No preparation endpoint or background HTTP crawler is part of the module.
