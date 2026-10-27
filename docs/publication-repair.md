# Publication integrity for existing and imported contents

## Installation and editorial behavior

Upload the official released `package.tgz` through the existing Jahia JavaScript-module
upload flow and start/update the module as usual. The archive embeds the publication runtime
classes and its three OSGi service descriptors in the existing jahiacom bundle. There is no
second JAR to install, no companion dependency and no server command, tools-console script or
IT action required for this installation. The runtime requires Jahia 8.2.3.2 or newer.

Activation starts the progressive repair of existing content and resource event processing.
Existing content is not all repaired synchronously within the upload request. Wait for the
audit to complete before concluding that every existing resource has been checked. Restarting
or updating the same module stops its worker/listeners and recreates them on activation, so
protection of future imports does not rely on a one-time migration script.

Release assets are attached only when Chachalog reports a newly created release for jahiacom.
The attachment script checks the package exists, verifies the checkout against the built
commit, fetches the remote release tag explicitly and requires its peeled commit to match.
Existing releases are skipped; duplicate assets, missing tags, mismatched commits and upload
errors fail without overwriting or suppressing errors. Only the self-contained template
archive is published; the Maven JAR is an intermediate build artifact.

The server progressively audits existing content on startup, then observes LIVE and EDIT
node additions and publication metadata events after subsequent imports. Ordinary text edits
do not schedule an audit of the whole site. Events target their own resource and translations
target their parent. One worker ticks every two seconds, deduplicates up to 1,024 pending paths,
and examines at most 25 resources per tick. It checks a one-second time budget between resources;
a single repository operation may take longer. Site audits use bounded keyset pages, reserve
processing time alongside events, and restart five minutes after the previous audit started,
once that audit completes. Overflow requests another progressive audit instead of growing the
queue. Completion time for existing or very large imports depends on site size and repository
latency. Normal Unpublish remains the way editors remove any partner.
There is no list of partner names or resource types to maintain.

Partner directory previews hide resources explicitly unpublished at the root or in the
displayed language. Edit mode still lists them so editors can modify or republish them.
Those edit-mode cards display a translated Unpublished badge; a grouped card is marked only
when all of its source partners are explicitly unpublished in the displayed language.
New drafts and legacy imports without an explicit false marker remain previewable.
The directory tracks the current translation as a cache dependency, including for hidden
partners, so publication changes can refresh the cards and filter counts.

## Scope and safeguards

Coverage is editorial content under home, contents and files on sites that use jahiacom.
Other sites, users, roles and system nodes are excluded. Paths, identifiers and publication
states are checked in both workspaces before changing anything.

The guard only normalizes publication metadata on contents already active in LIVE. It
preserves explicit false publication flags in either workspace and never copies a draft,
publishes editorial content, deletes nodes, changes CND constraints or clears caches.
Existing EDIT publication dates stay unchanged so pending drafts remain modified.
Translations are discovered from JCR, with no hard-coded language list.

Before each repair, a typed snapshot saves only the four publication properties that may change
(`j:published`, `j:lastPublished`, `j:lastPublishedBy`, `j:liveProperties`), their presence, paths
and identifiers from both workspaces. It contains no editorial fields, binaries or descendants.
Snapshots live in the server temporary folder `jahiacom-publication-integrity-metadata` and are
limited to 1 MiB each, 64 MiB total and 256 records. Oldest managed snapshots are rotated to make
room; records older than seven days expire during writes or five-minute maintenance, even when
there are no new repairs. Unmanaged files are left alone. POSIX folders/files are created as
0700/0600; symlink destinations are refused. A failed or oversized snapshot prevents the resource
repair. Resources with more than 128 translations are skipped and logged. These are rolling
metadata recovery snapshots, not a replacement for instance backups. Historical XML snapshots
from earlier local prototypes are outside this managed directory and are never deleted by it.
Repair uses the same listener mode
as native publication and restores it in finally, preventing bookkeeping writes from being
marked as new LIVE editorial overrides. The component and its worker stop with the bundle.

This fixes the demonstrated metadata defect regardless of which import produced it. It is
not a guarantee against every conceivable import failure, permissions issue, external content
provider, missing reference or corrupted database. Ambiguous or explicitly unpublished states
are preserved rather than silently reactivated; exceptions are logged for diagnosis.

## Verification

For development/CI, first run `mvn -B -f publication-integrity/pom.xml verify` with Java 17,
then `yarn build`. Maven compiles the runtime to Java 8 bytecode for the legacy bnd analyzer
inside the JavaScript-module converter; this does not change the server JVM. Packaging validates
every class version and all three DS descriptors, then stages only the owned class namespace,
OSGI-INF descriptors and a supplemental manifest containing Service-Component. It deliberately
omits Import-Package and Bundle-\* headers so Jahia still generates the package identity,
dependencies and content-model capabilities. Never copy the companion JAR manifest wholesale.
Missing classes/descriptors or incompatible bytecode fail packaging. A post-pack archive check
refuses omitted classes/services or unintended server artifacts. The complete archive was also
converted locally, checking its jahiacom identity, CND capabilities, JavaScript entrypoint and
embedded services without replacing the local site template.

Maven runs the Java tests. Node tests protect drafts, language
state and the read-only maintenance diagnostic. Existing Groovy scripts mentioning LIVE are
pinned to a reviewed baseline; future changes require review in the PR.

`node scripts/check-publication-local.mjs --native` is an opt-in localhost-only integration
test. It requires JAHIA_AUTHORIZATION and JAHIA_TEST_SITE. The test creates a disposable
partner, injects broken imported metadata twice, verifies the native event listeners repair
both occurrences, preserves an unapproved draft and checks native FR/EN unpublication gives
anonymous HTTP 404. It deletes only its own fixture and uninstalls only its own temporary bundle.
For an isolated one-package probe, set `JAHIA_TEST_NATIVE_BUNDLE` to a disposable
`/tmp/jahiacom-publication-probe-<version>.tgz` containing the same compiled runtime,
OSGI-INF descriptors and supplemental manifest but no site model or editorial import.
The test installs exactly this temporary package, validates its generated identity, stops and
restarts its bundle to confirm the guard is durable, then checks the repair/unpublication
cycle and uninstalls only the bundle it created. An intermediate JAR can still be tested via
`/tmp/jahiacom-publication-integrity-<version>.jar`; it is not a production deliverable.
Production never needs this test setup or the Groovy tools console.

The test originally reproduced the failure where native unpublish returned success while the
public profile still returned 200. Native repair restored normal unpublication; no production
state has been modified by these local tests.

Validated locally on Jahia 8.2.3.2 on 2026-10-26: the single-package probe installs and activates its
OSGi services, survives stop/start with correct deactivation/reactivation, repairs two successive injections of the demonstrated metadata anomaly,
preserves the pending EDIT description, and lets native FR/EN unpublication return anonymous
404 without reactivation. Security regression tests additionally cover disabled mutation
options, HTTPS enforcement, queue saturation, snapshot quotas, expiration and metadata-only
backups. Release tests cover existing releases, matching and mismatched commits, missing
artifacts and unsuppressed upload failures. All 193 Node tests and eight Java tests pass, as do formatting, ESLint/Stylelint,
TypeScript, Vite client/SSR build and package generation. ESLint reports the existing
LogoCarousel warning. Other import formats and production-scale performance have not been
exhaustively tested; validate the release on preproduction before production deployment.

## Optional diagnostic tool

For a separate diagnostic, run scripts/repair-publication.mjs from a source checkout with
Node 22+ and process-scoped JAHIA_AUTHORIZATION. It is strictly read-only. Pass explicit
--base-url, --paths and --languages. Remote origins require HTTPS; plain HTTP is allowed only
for localhost, 127.0.0.1 and ::1. Authenticated redirects are refused. The old --apply,
--unpublish and --backup-dir options are rejected before any request. No diagnostic operation
publishes, unpublishes or changes metadata, including when a concurrent editor changes a draft.
The diagnostic refuses pending drafts, partial language unpublication and complex editorial
subtrees. Use normal Jahia unpublication after the permanent guard has reconciled the resource.
