import {
  buildNodeUrl,
  getChildNodes,
  server,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { linkTermMentions } from "./inlineTerms.js";
import type { Props } from "./types.js";

export function linkedEditorialContent(props: Props) {
  const { currentNode, currentResource, renderContext } = useServerContext();
  const locale = currentResource.getLocale();
  const parent = currentNode.getParent() as JCRNodeWrapper;
  server.render.addCacheDependency({ path: parent.getPath() }, renderContext);
  const terms = getChildNodes(parent, -1, 0, (node) => node.isNodeType("jahiacom:glossaryEntry"))
    .filter((node) => {
      server.render.addCacheDependency({ path: node.getPath() }, renderContext);
      if (
        !node.hasPermission("jcr:read") ||
        !node.hasI18N(locale) ||
        node.hasProperty("mergedInto")
      )
        return false;
      const translation = `j:translation_${locale.getLanguage()}`;
      if (node.hasNode(translation))
        server.render.addCacheDependency(
          { path: node.getNode(translation).getPath() },
          renderContext,
        );
      return (
        !node.hasProperty("j:invalidLanguages") ||
        !Array.from(node.getProperty("j:invalidLanguages").getValues(), (value) =>
          value.getString(),
        ).includes(locale.getLanguage())
      );
    })
    .map((node) => {
      const technicalNames: string[] = [];
      if (locale.getLanguage() === "fr" && node.hasNode("j:translation_en")) {
        const english = node.getNode("j:translation_en");
        server.render.addCacheDependency({ path: english.getPath() }, renderContext);
        technicalNames.push(english.getPropertyAsString("jcr:title") || "");
      }
      return {
        id: node.getIdentifier(),
        url: buildNodeUrl(node),
        urlAliases: node.hasNode("vanityUrlMapping")
          ? getChildNodes(node.getNode("vanityUrlMapping"), -1, 0)
              .filter(
                (vanity) => vanity.getPropertyAsString("jcr:language") === locale.getLanguage(),
              )
              .map((vanity) => {
                server.render.addCacheDependency({ path: vanity.getPath() }, renderContext);
                return vanity.getPropertyAsString("j:url");
              })
          : [],
        labels: [
          ...technicalNames,
          node.getPropertyAsString("jcr:title") || node.getName(),
          // A spelled-out term also matches without its parenthesized acronym.
          // Duplicate short labels are discarded by the matcher as ambiguous.
          (node.getPropertyAsString("jcr:title") || "").replace(/\s*\([^)]*\)\s*$/, ""),
          node.getPropertyAsString("indexLabel") || "",
          ...(node.hasProperty("aliases")
            ? Array.from(node.getProperty("aliases").getValues(), (value) => value.getString())
            : []),
        ],
      };
    });
  const [body, comparison, example, faq] = linkTermMentions(
    [props.body || "", props.comparison || "", props.example || "", props.faq || ""],
    terms,
    currentNode.getIdentifier(),
    props.autoTermLinks !== false,
  );
  return { ...props, body, comparison, example, faq };
}
