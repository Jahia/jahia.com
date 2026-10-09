# Navbar and blog security review

Review date: 2026-10-09. Base commit: `621f500` (`origin/main`). Scope: the two-level navigation, breadcrumb, blog listing/date changes and associated assets. This is a scoped code/dependency review, not a penetration test or a review of Jahia core, infrastructure or production configuration.

## Results

- New menu descriptions, headings and labels render as JSX text, without raw HTML injection. Icon choices map to three bundled assets.
- Navigation now rejects executable/local-file URL schemes and embedded control characters or backslashes. Regression tests cover ordinary CMS/editframe paths, web/contact links and malicious/obfuscated protocols.
- Blog filter state is URL-encoded. Manual featured selections are restricted to entries in the queried, published, currently visible folder results. Existing search token validation and same-origin fetching are preserved.
- A pattern scan of the pending text files found no private keys, GitHub tokens, AWS access keys or literal credentials. This is a limited pattern scan, not a guarantee that all secret formats are detectable. No credentials, local Docker content or provisioning scripts are included in the commit.
- `yarn npm audit --recursive --environment production --json` returned no advisories for the project's production dependency graph.
- The complete audit returned **91 advisory rows across 26 packages**: 1 critical, 57 high, 30 moderate and 3 low. All affected versions are already in the base lockfile; this change adds no dependency. Counts include multiple advisories for the same package.
- The critical development finding is `tar@7.4.3`, required by `node-gyp`: [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw), decompression/parse denial of service. Tooling findings remain unresolved and require a separate dependency maintenance change with validation. They are not described as harmless merely because they belong to the development graph.
- The deterministic CND checker reports the same five existing issues on the base and changed definitions (four unconstrained existing weak references, one untranslated existing string). Added navigation references are constrained, fields are optional, and existing definitions are unchanged. Do not tighten deployed legacy constraints without a compatible migration.

## Delivery limits

The security verdict is **with reservations**, not a clean full-project audit. Review the outstanding development dependencies before approving a release. The PR stays in draft to make those reservations visible. Local checks and the GitHub build should pass, but do not replace this dependency follow-up.

See [editorial setup](navbar-blog-editorial-setup.md) for the distinction between module changes and content configured only in local Docker. No production/preproduction deployment or PR merge is included.
