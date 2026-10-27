// CI only: attach the self-contained package only to a new release of the commit that was built.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function attachReleaseArtifacts({
  releaseCreated,
  builtCommit,
  manifest,
  run = (file, args) => execFileSync(file, args, { encoding: "utf8", shell: false }),
  stat = statSync,
}) {
  if (releaseCreated !== "true") return { uploaded: false };
  const { name, version } = manifest;
  if (
    name !== "jahiacom" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version) ||
    !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(builtCommit || "")
  )
    throw Error("Invalid release identity or built commit");

  const archive = "dist/package.tgz";
  for (const file of [archive]) {
    const info = stat(file);
    if (!info.isFile() || info.size === 0)
      throw Error(`Missing or empty release artifact: ${file}`);
  }
  const head = run("git", ["rev-parse", "HEAD"]).trim();
  if (head !== builtCommit) throw Error("Checkout differs from the commit that was built");

  const tag = `${name}@${version}`;
  // Fetch the remote tag explicitly, including on shallow checkouts; never trust a stale local tag.
  run("git", ["fetch", "--no-tags", "origin", `refs/tags/${tag}`]);
  const taggedCommit = run("git", ["rev-parse", "FETCH_HEAD^{commit}"]).trim();
  if (taggedCommit !== builtCommit)
    throw Error("Release tag differs from the commit that was built");

  // A duplicate asset or upload failure must fail CI. Never overwrite or silently skip it.
  run("gh", ["release", "upload", tag, `${archive}#${name}-${version}.tgz`]);
  return { uploaded: true, tag, commit: builtCommit };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = attachReleaseArtifacts({
      releaseCreated: process.env.RELEASE_CREATED,
      builtCommit: process.env.BUILT_COMMIT,
      manifest: JSON.parse(readFileSync("package.json", "utf8")),
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
