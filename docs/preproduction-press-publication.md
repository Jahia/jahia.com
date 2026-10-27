# Press room, glossary and publication integrity delivery

## Release and installation

This change delivers one self-contained `package.tgz`, requiring Jahia 8.2.3.2 or newer.
The publication service runs inside jahiacom; no companion JAR or server command is needed.
Activate the uploaded module through the usual JavaScript module workflow.

The feature-branch artifact still uses the current package version, 2.0.1. The three minor
Chachalog entries should produce one 2.1.0 release from that baseline. After the feature PR
is merged, review and merge the generated release PR separately, then use the official
release archive for preproduction. Neither PR should be merged without approval.

## Included behavior

- Automatic, progressive repair of the demonstrated imported-publication metadata defect.
  Existing drafts and explicit unpublication flags are preserved. See [publication repair](publication-repair.md).
- Partner cards explicitly unpublished in the displayed language disappear from preview.
  They remain editable with a localized Unpublished badge. Folder and translation cache
  dependencies refresh the directory after membership/publication changes.
- New card-carousel component: 1–8 cards on desktop, 1–2 on tablet, one on mobile, optional
  arrows/pagination, adjustable spacing, existing theme/background and card ordering.
- Image Heroes reuse the existing validated second-button settings.
- Cards and press-resource cards gain an optional Glass surface, disabled by default.
- Press-news filters can be hidden individually, with configurable type options. Hiding
  every filter removes the form and its frame; pagination continues to work.
- Glossary entry forms are simplified without removing stored content properties. Resource
  and related-term suggestions load after the article through a per-user alternate template.
  The browser accepts only same-origin links; shared memoization is guest LIVE only, checks
  read permissions again, has bounded storage and invalidates on content/ACL changes.

No existing property constraint is narrowed or removed. The legacy `secondaryCTAUrl`
property remains unchanged for compatibility; the CND lint warning on that existing field
is not addressed by this delivery. No historic LIVE migration is changed.

## Editorial settings are separate from module code

The archive does not export or overwrite the local site's content. Installing it alone
does not replace a Hero, choose an image, convert an existing Section into a Card Carousel,
move experts, upload a kit file, activate Glass or select hidden filters on preproduction.

In Content Editor, review the existing press page and configure the intended components:
use the image Hero with its two actions; place the expert cards in a Card Carousel while
preserving their text, images and translations; set its display options; choose news
filters; and configure download/copy actions with the real press-kit file and approved text.
Enable Glass only on the intended cards. Publish those editorial changes through the normal
workflow after reviewing both languages. Keep the old components until the replacement is
validated. No automatic content conversion is included in this module.

## Acceptance checks on preproduction

1. Confirm the module starts with the embedded publication service; allow the progressive
   audit to run. Monitor any skipped-resource or backup errors.
2. On a disposable partner, test publication and native unpublication in FR then EN. Confirm
   the profile becomes unavailable and the corresponding directory card disappears from
   preview and LIVE after reload, without a manual cache purge. Confirm the edit-mode badge.
3. Confirm pending editorial drafts are not published by the repair service.
4. Check the press Hero actions, experts ordering/controls, filter choices/reset/pagination
   and download/copy actions in FR/EN on desktop and mobile.
5. Confirm existing non-press Heroes/cards and resource carousels retain their behavior.
6. Check glossary article rendering, authored/automatic term links, deferred suggestions,
   retry/empty states, FR/EN and mobile. Verify anonymous requests cannot receive restricted
   content and that unpublishing a suggested resource removes it from later suggestions.

The localhost address change is instance data only and is not shipped. Navigation changes
and the production-404 investigation are excluded from this PR.

## Rollback limits

Keep the prior official module archive and an instance backup before installation.
Stopping/replacing this module stops its repair worker and listeners. Metadata snapshots
are bounded diagnostic recovery records, not a full content/database backup. New editorial
components must not be deleted as part of a module rollback; newly added content types may
prevent a direct downgrade. Validate rollback on preproduction against the content actually
created there, and restore the instance backup when needed.
