import {
  buildNodeUrl,
  getChildNodes,
  server,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { linkTermMentions } from "./inlineTerms.js";
import type { Props } from "./types.js";
import { glossaryMemo, memoTermCatalog } from "./memo.server.js";

export function linkedEditorialContent(props: Props) {
  const { currentNode, currentResource, renderContext } = useServerContext();
  const locale = currentResource.getLocale();
  const parent = currentNode.getParent() as JCRNodeWrapper;
  server.render.addCacheDependency({ path: parent.getPath() }, renderContext);
  // Authored links still need native URL resolution in preview, even when automatic
  // linking is off. Plain text needs no vocabulary in that mode.
  const needsCatalog =
    props.autoTermLinks !== false ||
    [props.body, props.comparison, props.example, props.faq].some((html) =>
      /<a\b/i.test(html || ""),
    );
  const terms = !needsCatalog
    ? []
    : memoTermCatalog(glossaryMemo(), parent, locale.getLanguage(), (depend) =>
        getChildNodes(parent, -1, 0, (node) => node.isNodeType("jahiacom:glossaryEntry"))
          .filter((node) => {
            depend(node);
            if (
              !node.hasPermission("jcr:read") ||
              !node.hasI18N(locale) ||
              node.hasProperty("mergedInto")
            )
              return false;
            const translation = `j:translation_${locale.getLanguage()}`;
            if (node.hasNode(translation)) {
              depend(node.getNode(translation));
              if (!node.getNode(translation).hasPermission("jcr:read")) return false;
            }
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
              depend(english);
              if (english.hasPermission("jcr:read"))
                technicalNames.push(english.getPropertyAsString("jcr:title") || "");
            }
            return {
              id: node.getIdentifier(),
              url: buildNodeUrl(node),
              urlAliases: node.hasNode("vanityUrlMapping")
                ? getChildNodes(node.getNode("vanityUrlMapping"), -1, 0)
                    .filter(
                      (vanity) =>
                        vanity.getPropertyAsString("jcr:language") === locale.getLanguage(),
                    )
                    .map((vanity) => {
                      depend(vanity);
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
                  ? Array.from(node.getProperty("aliases").getValues(), (value) =>
                      value.getString(),
                    )
                  : []),
              ],
            };
          }),
      );
  const [body, comparison, example, faq] = linkTermMentions(
    [props.body || "", props.comparison || "", props.example || "", props.faq || ""],
    terms,
    currentNode.getIdentifier(),
    props.autoTermLinks !== false,
  );
  return { ...props, body, comparison, example, faq };
}
