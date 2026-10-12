# Resource listing state

Blog pagination and category filters in blog, ListChildren and AdvancedListChildren lists are now stored in sessionStorage, keyed by the current pathname (including site/language) and the content component identifier. Each listing restores its own valid selections after reload or returning from an article. Reset clears the filters; changing a blog filter returns its grid to page one. Saved pages are clamped to the current result count and unavailable category options fall back to the default selection.

Article and breadcrumb links do not carry listing state. Old blogPage/filter1/filter2 links seed the initial client selection and are cleaned after hydration. Legacy cluster/theme parameters are removed, without deleting unrelated tracking/search parameters or anchors. Detail pages under the resource breadcrumb also clean legacy listing parameters.

The SSR response contains the full eligible content and default filters. Client effects restore filtering and paginate after hydration; no new CND property or content migration is needed. With JavaScript disabled the resource cards remain available, but session state is not restored. With sessionStorage blocked or malformed, controls still work and persistence falls back to memory until the page is unloaded. A shared clean link cannot transfer the sender's selections.

This change is developed on a separate checkout from origin/main. Global search and partner directory URL behavior remain outside this resource listing change. ResourceCarousel already uses in-page navigation without query parameters; its 3/2/1 responsive behavior is unchanged.

## Validation

- Six Node regression tests cover persistence, isolation, old URLs, invalid data, blocked storage and reset.
- Chrome interaction fixture uses the actual React components: blog filtering/pagination, reload, article return, independent resource lists, language isolation, legacy URL migration, anchors/tracking preservation, keyboard and 375 px viewport, blocked storage.
- Formatting, ESLint/Stylelint, TypeScript, full Vite/SSR build, package and diff checks are required before publication.
- UX scope: navigation continuity and control behavior. No visual styles, brand assets, editorial fields or CND constraints change. Full Jahia EDIT/LIVE and screen reader checks are not covered by the browser fixture; live Docker was not replaced because it also contains unrelated ongoing work.

Session lifetime and browser storage exceptions: [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).
