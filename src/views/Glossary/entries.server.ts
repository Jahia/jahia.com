import { getChildNodes, server, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/** One eligibility rule for the visible directory and its structured data. */
export function glossaryEntries(parent: JCRNodeWrapper) {
  const { currentResource, renderContext } = useServerContext();
  const locale = currentResource.getLocale();
  const language = locale.getLanguage();
  const depend = (node: JCRNodeWrapper) =>
    server.render.addCacheDependency({ path: node.getPath() }, renderContext);
  depend(parent);
  return getChildNodes(parent, -1, 0, (node) => node.isNodeType("jahiacom:glossaryEntry")).filter(
    (node) => {
      depend(node);
      const translation = `j:translation_${language}`;
      if (node.hasNode(translation)) depend(node.getNode(translation));
      return (
        !node.hasProperty("mergedInto") &&
        node.hasI18N(locale) &&
        node.hasPermission("jcr:read") &&
        (!node.hasProperty("j:invalidLanguages") ||
          !Array.from(node.getProperty("j:invalidLanguages").getValues(), (value) =>
            value.getString(),
          ).includes(language))
      );
    },
  );
}
