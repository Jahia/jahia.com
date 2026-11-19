# Automatic navbar and centralized editor

The optional automatic navbar projects the existing site tree into three levels
below Home. Pages, menu labels, internal links and external links retain their
ancestry. New top-level sections appear automatically. References remain leaves,
so links cannot create recursive navigation loops. No page is moved or duplicated.

## Editorial entry point

Open **jContent → Extensions → Navigation du site**. This native `adminRoute` uses
the selected site and language, Moonstone controls and the current Jahia session.
Route visibility requires jContent access and the module enabled on the site.
GraphQL independently enforces read, edit and publication permissions. The route
is registered before Moonstone is available; controls are resolved when rendered.
The existing Breadcrumb extension and editor selectors remain independent.

Three tabs centralize the configuration:

- **Arborescence et colonnes**: automatic, selected, direct-link or hidden sections;
  page visibility; translated labels; preset/image icons; normal/bold text; 1–4
  columns; branch and sibling order using Move up / Move down.
- **Liens et encarts**: optional section overview link and editorial card, with
  native Jahia pickers. A page already associated as the section landing page is
  identified separately instead of duplicating it as a normal menu entry.
- **Bandeau supérieur**: internal/external links, tools, translated labels, visibility
  and order, plus the two existing CTA buttons and their native styles/placements.

Parents start collapsed. Collapse all / Expand all only changes the editor display.
Changing a branch's column keeps its descendants with it. Child pages can only be
reordered within their own parent. No drag-and-drop handle is required. New items
follow manually ordered siblings in source order; stale or foreign IDs are ignored.
There are no extra column headings or automatically invented categories in the menu.

Direct-link branches hide their descendants from the navbar without changing the
content tree. A section with a dropdown uses one title/chevron button; it does not
link to a parent page by default. The optional Discover link is independent.

## Draft preview

**Afficher l’aperçu** renders the actual navbar alongside the settings when space
allows, or below them on narrow screens. Desktop and mobile viewports, fullscreen
preview, reload and unsaved label/weight/column changes are supported. The editor
and preview scroll independently on wide layouts.

The frame uses the existing Home page in the default workspace and the same tree
projection and column helper as the public renderer. Links are inert. This is an
editorial preview: anonymous visibility still depends on publication, translations
and permissions, so an unpublished page may appear in the draft preview only.

The same-origin message channel checks parent, frame, token, site and language.
The receiver is disabled in LIVE and standalone pages. Its projection bundle loads
only for an active editor-preview frame. No extra Jahia view or preview content
node is created.

## Storage, compatibility and publication

Settings are stored as versioned JSON on one optional site-scoped
`jahiacom:navigationSettings` node, `/sites/<site>/navigation-settings`.
Opening the editor does not save or activate anything. Without central settings,
the existing navbar and native settings remain in use unless automatic mode was
already explicitly enabled. Existing CND declarations and their constraints remain
unchanged; the new model and optional fields are additive.

**Enregistrer** writes the navigation draft. **Publier la navigation** publishes
only that node, with `publishSubNodes:false` and `includeSubTree:false`. Pages and
other site settings are not republished. Native locks, work-in-progress and
publication permissions are checked for FR/EN; workflows are not bypassed.
Success is reported only after LIVE matches the saved configuration.

Saving rereads the current configuration and rejects a stale draft, offering Reload.
This is optimistic conflict detection, not a server-side atomic lock against two
simultaneous saves. Missing, inaccessible or untranslated destinations are omitted
without removing valid siblings. Optional broken images or references remain safe.

Existing home/site values seed the upper-bar editor without activating an override.
Its first edit stores an optional `upperBar` object in the navigation configuration;
it does not modify existing home/site properties. Without it, native rendering stays
active. The previous navbar renderer remains available through the stored mode.

## Code delivery versus site content

The package contains the feature, not the local site's saved selections, columns
or content. Installing it does not import the local 2/3 Solutions configuration,
publish a site or change existing editorial content. Configure another site through
Extensions, or plan a separate Jahia content transfer with valid destination IDs.
Do not copy a configuration containing source-site UUIDs blindly across sites.

The local AI Summary module, llms.txt module, page-hub experiments and unrelated
glossary/footer/press/partner changes are outside this feature.

## Validation

Run `yarn test:navigation`, `yarn test:breadcrumb`, formatting checks, lint, TypeScript,
the full SSR/Vite build and package generation. The versioned application entry
preserves all selectors and Breadcrumb registration from main and adds only the
navigation registration under a new URL to avoid the old bootstrap cache.

For browser checks, compare Extensions' draft preview with the site's LIVE navbar:
branch ancestry, exclusions, column/sibling order, keyboard focus, Escape, mobile
menu and long translated labels. A preview or passing unit suite alone does not
constitute a complete accessibility or visual certification.

Official integration references:

- [Adding settings pages](https://academy.jahia.com/documentation/jahia-cms/jahia-8.2/developer/extending-and-customizing-jahia-ui/adding-settings-pages)
- [Jahia UI stack and Moonstone](https://academy.jahia.com/documentation/jahia-cms/jahia-8.2/developer/extending-and-customizing-jahia-ui/jahia-ui-under-the-hood)
