import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { stagePublicationRuntime, verifyPublicationArchive } from "./stage-publication-runtime.mjs";

const names = [
  "PublicationIntegrity",
  "LiveImportListener",
  "EditImportListener",
  "MetadataBackups",
  "RepairQueue",
];
const services = names
  .slice(0, 3)
  .map((name) => `OSGI-INF/org.jahia.modules.publicationintegrity.${name}.xml`);
const namespace = "org/jahia/modules/publicationintegrity";
test("archive verification catches omitted classes and unintended server artifacts", () => {
  const files = [
    "package/package.json",
    "package/META-INF/MANIFEST.MF",
    "package/dist/server/index.js",
    ...names.map((name) => `package/${namespace}/${name}.class`),
    ...services.map((name) => "package/" + name),
  ];
  assert.deepEqual(
    verifyPublicationArchive("fixture.tgz", () => files.join("\n")),
    { verified: true },
  );
  assert.throws(
    () =>
      verifyPublicationArchive("fixture.tgz", () =>
        files.filter((name) => !name.endsWith("PublicationIntegrity.class")).join("\n"),
      ),
    /missing/,
  );
  for (const extra of [
    "package/.env",
    "package/publication-integrity/target/server.jar",
    "package/node_modules/library/index.js",
  ])
    assert.throws(
      () => verifyPublicationArchive("fixture.tgz", () => [...files, extra].join("\n")),
      /unintended/,
    );
});
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "jahia-package-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const classes = join(root, "publication-integrity/target/classes");
  for (const path of [namespace, "OSGI-INF", "META-INF"])
    await mkdir(join(classes, path), { recursive: true });
  for (const name of names)
    await writeFile(
      join(classes, namespace, name + ".class"),
      Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 52]),
    );
  for (const service of services) await writeFile(join(classes, service), "<component/>");
  await writeFile(
    join(classes, "META-INF/MANIFEST.MF"),
    `Manifest-Version: 1.0\r\nBundle-SymbolicName: companion-that-must-not-leak\r\nImport-Package: javax.jcr\r\nService-Component: ${services.join(",")}\r\n\r\n`,
  );
  return { root, classes };
}

test("embeds runtime and DS descriptors with only a supplementary service manifest", async (t) => {
  const { root } = await fixture(t);
  assert.deepEqual(await stagePublicationRuntime(root), { classes: 5, components: 3 });
  const manifest = (await readFile(join(root, "META-INF/MANIFEST.MF"), "utf8")).replace(
    /\r\n /g,
    "",
  );
  assert.equal(
    manifest,
    `Manifest-Version: 1.0\r\nService-Component: ${services.join(",")}\r\n\r\n`,
  );
  assert.doesNotMatch(manifest, /Import-Package|Bundle-SymbolicName|Jahia-Depends/);
  for (const service of services)
    assert.equal(await readFile(join(root, service), "utf8"), "<component/>");
  for (const name of names) await access(join(root, namespace, name + ".class"));
});

test("rejects unsupported bytecode before replacing staged resources", async (t) => {
  const { root, classes } = await fixture(t);
  await writeFile(
    join(classes, namespace, "PublicationIntegrity.class"),
    Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 55]),
  );
  await assert.rejects(stagePublicationRuntime(root), /Java 8 bytecode/);
  await assert.rejects(access(join(root, "META-INF/MANIFEST.MF")));
});

test("missing required classes or DS descriptors stop packaging", async (t) => {
  const { root, classes } = await fixture(t);
  await rm(join(classes, services[0]));
  await assert.rejects(stagePublicationRuntime(root));
  await assert.rejects(access(join(root, "META-INF/MANIFEST.MF")));
  await rm(join(classes, namespace, "PublicationIntegrity.class"));
  await assert.rejects(stagePublicationRuntime(root), /Missing runtime class/);
});

test("unexpected services and traversal paths never reach generated destinations", async (t) => {
  const { root, classes } = await fixture(t);
  await writeFile(
    join(classes, "META-INF/MANIFEST.MF"),
    `Service-Component: ../outside.xml,${services.slice(1).join(",")}\n`,
  );
  await assert.rejects(stagePublicationRuntime(root), /Unexpected runtime OSGi services/);
  await assert.rejects(access(join(root, "META-INF/MANIFEST.MF")));
});

test("restaging removes obsolete owned classes and leaves unrelated resources alone", async (t) => {
  const { root } = await fixture(t);
  await stagePublicationRuntime(root);
  await writeFile(join(root, namespace, "Obsolete.class"), "stale");
  await writeFile(join(root, "OSGI-INF/other-module.xml"), "preserve");
  await stagePublicationRuntime(root);
  await assert.rejects(access(join(root, namespace, "Obsolete.class")));
  assert.equal(await readFile(join(root, "OSGI-INF/other-module.xml"), "utf8"), "preserve");
});
