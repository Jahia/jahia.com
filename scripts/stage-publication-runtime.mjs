// Embed runtime classes in the existing JS module; never install a second bundle.
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const namespace = "org/jahia/modules/publicationintegrity";
export function verifyPublicationArchive(
  archive,
  list = (file) => execFileSync("tar", ["-tzf", file], { encoding: "utf8", shell: false }),
) {
  const entries = list(archive).split(/\r?\n/).filter(Boolean);
  const required = [
    "package.json",
    "META-INF/MANIFEST.MF",
    "dist/server/index.js",
    ...[
      "PublicationIntegrity",
      "LiveImportListener",
      "EditImportListener",
      "MetadataBackups",
      "RepairQueue",
    ].map((name) => `${namespace}/${name}.class`),
    ...["PublicationIntegrity", "LiveImportListener", "EditImportListener"].map(
      (name) => `OSGI-INF/org.jahia.modules.publicationintegrity.${name}.xml`,
    ),
  ];
  for (const file of required)
    if (!entries.includes("package/" + file)) throw Error(`Package is missing ${file}`);
  if (
    entries.some((file) =>
      /(?:^|\/)\.env(?:\.|$)|node_modules\/|publication-integrity\/target\/|\.jar$/.test(file),
    )
  )
    throw Error("Package contains an unintended server artifact");
  return { verified: true };
}
export async function stagePublicationRuntime(root = process.cwd()) {
  root = resolve(root);
  const classes = join(root, "publication-integrity/target/classes");
  const runtime = join(classes, namespace);
  const entries = await readdir(runtime, { withFileTypes: true });
  const classFiles = entries.filter(
    (entry) => entry.isFile() && /^[\w$]+\.class$/.test(entry.name),
  );
  for (const name of [
    "PublicationIntegrity.class",
    "LiveImportListener.class",
    "EditImportListener.class",
    "MetadataBackups.class",
    "RepairQueue.class",
  ]) {
    if (!classFiles.some((entry) => entry.name === name))
      throw Error(`Missing runtime class ${name}; run Maven verify first`);
  }
  // Jahia's legacy bnd converter cannot analyze the Java 11 bytecode of this runtime.
  for (const entry of classFiles) {
    const bytes = await readFile(join(runtime, entry.name));
    if (bytes.length < 8 || bytes.readUInt32BE(0) !== 0xcafebabe || bytes.readUInt16BE(6) !== 52)
      throw Error(`Runtime must use Java 8 bytecode: ${entry.name}; run Maven verify first`);
  }
  const sourceManifest = (await readFile(join(classes, "META-INF/MANIFEST.MF"), "utf8")).replace(
    /\r?\n /g,
    "",
  );
  const declaration = sourceManifest
    .split(/\r?\n/)
    .find((line) => line.startsWith("Service-Component: "));
  if (!declaration) throw Error("Missing runtime OSGi service declarations");
  const components = declaration.slice("Service-Component: ".length).split(",");
  if (
    components.length !== 3 ||
    new Set(components).size !== 3 ||
    components.some(
      (name) =>
        !/^OSGI-INF\/org\.jahia\.modules\.publicationintegrity\.(PublicationIntegrity|LiveImportListener|EditImportListener)\.xml$/.test(
          name,
        ),
    )
  )
    throw Error("Unexpected runtime OSGi services");
  // Read and validate every source before touching generated destinations.
  const descriptors = await Promise.all(components.map((name) => readFile(join(classes, name))));
  const generated = resolve(root, namespace);
  const ownedPath = relative(root, generated);
  if (!ownedPath || ownedPath.startsWith("..") || isAbsolute(ownedPath))
    throw Error("Unsafe generated runtime path");
  await rm(generated, { recursive: true, force: true });
  await mkdir(join(root, namespace), { recursive: true });
  await mkdir(join(root, "OSGI-INF"), { recursive: true });
  await mkdir(join(root, "META-INF"), { recursive: true });
  for (const entry of classFiles)
    await copyFile(join(runtime, entry.name), join(root, namespace, entry.name));
  for (let index = 0; index < components.length; index++)
    await writeFile(join(root, components[index]), descriptors[index]);
  // Only this supplementary header: copying Import-Package/Bundle-* would bypass Jahia's
  // generated identity, dependencies and CND capabilities. The converter computes those.
  const lines = ["Manifest-Version: 1.0"];
  let line = declaration;
  while (line.length > 70) {
    lines.push(line.slice(0, 70));
    line = " " + line.slice(70);
  }
  lines.push(line);
  await writeFile(join(root, "META-INF/MANIFEST.MF"), lines.join("\r\n") + "\r\n\r\n");
  return { classes: classFiles.length, components: components.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  Promise.resolve()
    .then(() =>
      process.argv[2] === "--check-package"
        ? verifyPublicationArchive(process.argv[3])
        : stagePublicationRuntime(),
    )
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
