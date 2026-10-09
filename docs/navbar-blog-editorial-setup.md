# Navbar and blog editorial setup

The module provides the rendering and optional fields. The labels, ordering, descriptions, links and side panels configured in the local Docker JCR are content: they are not deployed by this Git commit. Configure and publish them through the usual editorial workflow on each target site.

## Two-level navigation

- Configure the site's optional `utilityNavigationLinks` references for the upper level. Without this field, existing navigation remains available; no utility links are hard-coded.
- Existing pages and node/external links can use `navLabel`, `navDescription`, `navIcon` and `navUtilityLabel`. The supported icons are `cms`, `dxp` and `ai`.
- Existing navigation groups (`jnt:navMenuText`) can configure introductory and featured side panels, a footer, and two ordered columns through the new `navIntro*`, `navFeature*`, `navFooterText` and `navColumn*` fields. Missing optional fields preserve the existing menu structure. Configured columns retain destinations not explicitly assigned to them.
- The approved local Product grouping puts built-in AI below Jahia DXP. Solutions puts Global presence below Multichannel experiences and CMS migration with AI in the second column. Use translated descriptions consistently, and distinguish testimonials in Why Jahia from the main Customer stories destination.
- Search sits beside the demo CTA in the main level. Padding is `0.5rem`. Header and breadcrumb backgrounds are fully opaque at the top, become 75% opaque after scrolling, and return to full opacity on hover, focus or an open menu. Logo and search have no separate opaque background.

## Blog listing and dates

- On the blog content-folder reference, use the existing `jahiacommix:blogListingOptions` fields. If that mixin is absent on an existing node, it must be added through the site's normal content administration workflow to expose the options. Installing the module does not change that node automatically.
- `featuredArticles`: the first valid, published, currently visible selection becomes the single featured article. Other articles remain in the grid. The previous `featuredArticle` field remains a fallback, followed by automatic selection from the referenced folder.
- Without a manual selection, automatic selection uses publication dates. Enable `featuredIncludeUpdatedArticles` to also consider editorial updates identified by the existing article flag `useLastModifiedDate`.
- `useLastModifiedDate` off: display the publication date. On, with a valid last-modified date: display only “Updated on” / “Mis à jour le” and that date. Missing/invalid update dates fall back to the valid publication date. Technical modifications alone do not label an article as updated.
- Existing advanced filters remain supported. Without a configured advanced filter, the listing offers categories actually used by the non-featured articles, excluding technical classifications.

No existing CND property constraints are changed, no articles are deleted, and this change does not export or publish the local Docker content.
