import { server, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface MemoService {
  apply(key: string): string;
  prepareResourceMetadata(site: string, language: string, taxonomy: boolean): string;
  editorialParts(site: string, language: string, path: string): string;
  profileMemo(key: string, generation: number, value: string | null): string | null;
}
interface ResourceMetadata {
  id: string;
  path: string;
  displayName: string;
  blog: boolean;
  strings: Record<string, string | null>;
  dates: Record<string, { timestamp: number | null }>;
  categories: { name: string; label: string; lineage: string[] }[];
  clusters: string[];
}

/** No cache in EDIT, DEFAULT or authenticated renders; no JCR objects are retained. */
export function glossaryMemo() {
  const { currentResource, renderContext } = useServerContext();
  if (
    currentResource.getWorkspace() !== "live" ||
    renderContext.getUser().getUsername() !== "guest"
  )
    return undefined;
  try {
    const bundle = server.osgi.getBundle("jahiacom");
    const filter = `(&(jahiacom.glossary.memo=v1)(jahiacom.glossary.owner=${bundle.getBundleId()}))`;
    let service = server.osgi.getService(
      "java.util.function.Function",
      filter,
    ) as MemoService | null;
    if (!service) {
      // Resolve Java lazily, only in Jahia; Node-based rendering tests use the normal path.
      // @ts-expect-error Java runtime class, absent from the library's declarations.
      const loader = new (Java.type("groovy.lang.GroovyClassLoader"))();
      try {
        const definition = loader.parseClass(
          server.osgi.loadResource(bundle, "META-INF/glossary-memo.groovy", false),
        );
        // @ts-expect-error Java runtime class, absent from the library's declarations.
        const bundleClass = Java.type("org.osgi.framework.Bundle").class;
        definition.getMethod("install", bundleClass).invoke(null, bundle);
      } finally {
        loader.close();
      }
      service = server.osgi.getService("java.util.function.Function", filter) as MemoService | null;
    }
    if (!service) return undefined;
    const generation = String(service.apply("epoch"));
    return { service, generation, valid: () => generation === String(service.apply("epoch")) };
  } catch (error) {
    console.warn("Glossary metadata cache unavailable; using current JCR values", String(error));
    return undefined;
  }
}
type Memo = ReturnType<typeof glossaryMemo>;

export function memoProfile<T>(
  memo: Memo,
  node: JCRNodeWrapper,
  sitePath: string,
  language: string,
  compute: () => T,
  depend: (node: JCRNodeWrapper) => void,
): T {
  if (!memo) return compute();
  try {
    depend(node);
    if (!node.hasPermission("jcr:read")) return compute();
    const readable = ["en", "fr"].flatMap((lang) => {
      const path = `j:translation_${lang}`;
      if (!node.hasNode(path)) return [];
      const translation = node.getNode(path);
      depend(translation);
      return translation.hasPermission("jcr:read") ? [translation.getPath()] : [];
    });
    const key = JSON.stringify([
      sitePath,
      language,
      node.getPath(),
      node.getIdentifier(),
      readable,
    ]);
    const cached = memo.service.profileMemo(key, Number(memo.generation), null);
    if (cached !== null && memo.valid()) return JSON.parse(String(cached)) as T;
    const value = compute();
    if (memo.valid()) memo.service.profileMemo(key, Number(memo.generation), JSON.stringify(value));
    return value;
  } catch {
    return compute();
  }
}

/** Plain metadata adapters feed the existing toCard algorithm; URLs use real current nodes. */
export function resourceMetadata(memo: Memo, site: string, language: string, taxonomy: boolean) {
  if (!memo) return undefined;
  const { renderContext } = useServerContext();
  try {
    const data = JSON.parse(
      String(memo.service.prepareResourceMetadata(site, language, taxonomy)),
    ) as { records: ResourceMetadata[]; dependencies: string[] };
    if (!memo.valid()) return undefined;
    for (const path of data.dependencies) server.render.addCacheDependency({ path }, renderContext);
    return data.records.map(metadataNode);
  } catch {
    return undefined;
  }
}

function metadataNode(record: ResourceMetadata): JCRNodeWrapper {
  const categoryNode = (category: ResourceMetadata["categories"][number], index = 0): object => ({
    getName: () => category.name,
    getDisplayableName: () => category.label,
    getIdentifier: () => category.lineage[index],
    isNodeType: (type: string) => type === "jnt:category" && index < category.lineage.length,
    getParent: () =>
      index + 1 < category.lineage.length ? categoryNode(category, index + 1) : null,
  });
  const references = (nodes: object[]) => ({
    isMultiple: () => true,
    getValues: () => nodes.map((node) => ({ getNode: () => node })),
  });
  return {
    getIdentifier: () => record.id,
    getPath: () => record.path,
    getDisplayableName: () => record.displayName,
    isNodeType: (type: string) => type === (record.blog ? "jahiacom:blogEntry" : "jnt:page"),
    hasProperty: (name: string) => name === "j:published" || Object.hasOwn(record.dates, name),
    getPropertyAsString: (name: string) => record.strings[name] ?? null,
    getProperty: (name: string) => {
      if (name === "j:published") return { getBoolean: () => true };
      if (name === "j:defaultCategory")
        return references(record.categories.map((c) => categoryNode(c)));
      if (name === "blogType")
        return references(record.clusters.map((id) => ({ getIdentifier: () => id })));
      if (Object.hasOwn(record.dates, name))
        return {
          getValue: () => ({
            getDate: () => {
              const value = record.dates[name].timestamp;
              if (value === null) throw Error("Non-calendar date");
              return { getTimeInMillis: () => value };
            },
          }),
        };
      throw Error("Unknown resource metadata property");
    },
  } as unknown as JCRNodeWrapper;
}

/** Guest-only editorial text uses the same traversal limits and current read permissions. */
export function editorialParts(memo: Memo, site: string, language: string, path: string) {
  if (!memo) return undefined;
  const { renderContext } = useServerContext();
  try {
    const data = JSON.parse(String(memo.service.editorialParts(site, language, path))) as {
      parts: string[];
      paths: string[];
    };
    if (!memo.valid()) return undefined;
    for (const dependency of data.paths)
      server.render.addCacheDependency({ path: dependency }, renderContext);
    return data.parts;
  } catch {
    return undefined;
  }
}
