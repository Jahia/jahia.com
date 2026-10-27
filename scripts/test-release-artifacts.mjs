import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { attachReleaseArtifacts } from "./attach-release-artifacts.mjs";

const sha = "a".repeat(40);
function fixture(overrides = {}) {
  const calls = [];
  return {
    calls,
    options: {
      releaseCreated: "true",
      builtCommit: sha,
      manifest: { name: "jahiacom", version: "2.1.0" },
      stat: () => ({ isFile: () => true, size: 100 }),
      run: (command, args) => {
        calls.push([command, ...args]);
        return command === "git" && args[0] === "rev-parse" ? sha + "\n" : "";
      },
      ...overrides,
    },
  };
}

test("an existing or absent release never fetches tags or uploads assets", () => {
  for (const releaseCreated of [undefined, "", "false", "0"]) {
    const { options, calls } = fixture({ releaseCreated });
    assert.deepEqual(attachReleaseArtifacts(options), { uploaded: false });
    assert.deepEqual(calls, []);
  }
});

test("a new release of the built commit uploads only the self-contained package", () => {
  const { options, calls } = fixture();
  assert.equal(attachReleaseArtifacts(options).uploaded, true);
  assert.deepEqual(calls, [
    ["git", "rev-parse", "HEAD"],
    ["git", "fetch", "--no-tags", "origin", "refs/tags/jahiacom@2.1.0"],
    ["git", "rev-parse", "FETCH_HEAD^{commit}"],
    ["gh", "release", "upload", "jahiacom@2.1.0", "dist/package.tgz#jahiacom-2.1.0.tgz"],
  ]);
  assert.ok(
    calls.every((args) => !args.includes("--clobber") && !args.includes("--skip-existing")),
  );
});

test("a mismatched checkout or remote tag prevents every upload", () => {
  for (const mismatch of ["HEAD", "FETCH_HEAD^{commit}"]) {
    const { options, calls } = fixture();
    options.run = (command, args) => {
      calls.push([command, ...args]);
      return args[0] === "rev-parse" ? (args[1] === mismatch ? "b".repeat(40) : sha) : "";
    };
    assert.throws(() => attachReleaseArtifacts(options), /differs from the commit/);
    assert.ok(calls.every(([command]) => command !== "gh"));
  }
});

test("missing artifacts and invalid release identities fail before network operations", () => {
  for (const overrides of [
    { manifest: { name: "other", version: "2.1.0" } },
    { manifest: { name: "jahiacom", version: "2.1.0; echo secret" } },
    { builtCommit: "main" },
    { stat: () => ({ isFile: () => true, size: 0 }) },
    {
      stat: (file) => {
        if (file.endsWith(".tgz")) throw Error("Missing package");
        return { isFile: () => true, size: 100 };
      },
    },
  ]) {
    const { options, calls } = fixture(overrides);
    assert.throws(() => attachReleaseArtifacts(options));
    assert.deepEqual(calls, []);
  }
});

test("duplicate assets, missing remote tags and GitHub errors fail instead of being suppressed", () => {
  for (const failure of ["fetch", "upload"]) {
    const { options, calls } = fixture();
    options.run = (command, args) => {
      calls.push([command, ...args]);
      if (
        (failure === "fetch" && args[0] === "fetch") ||
        (failure === "upload" && command === "gh")
      )
        throw Error("SIMULATED_FAILURE");
      return sha;
    };
    assert.throws(() => attachReleaseArtifacts(options), /SIMULATED_FAILURE/);
    assert.equal(calls.filter(([command]) => command === "gh").length, failure === "fetch" ? 0 : 1);
  }
});

test("release workflow gates attachment on the package-specific Chachalog creation output", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /id: chachalog\s+run: npx chachalog@\^0\.5\.0 publish-release/);
  assert.match(workflow, /if: steps\.chachalog\.outputs\.released_jahiacom == 'true'/);
  assert.match(workflow, /run: node scripts\/attach-release-artifacts\.mjs/);
  assert.match(workflow, /BUILT_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /--clobber|gh release upload|\|\| true/);
});
