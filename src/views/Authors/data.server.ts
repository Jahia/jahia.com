import {
  buildNodeUrl,
  getNodesByJCRQuery,
  server,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { findAuthorFolder } from "./folder.server.js";
import { directoryQuery } from "./queries.js";

export const stringProperty = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name) ? node.getProperty(name).getString() : "";

export function reference(node: JCRNodeWrapper, name: string) {
  try {
    return node.hasProperty(name) ? node.getProperty(name).getValue().getNode() : undefined;
  } catch {
    // A weak reference may outlive its destination.
    return undefined;
  }
}

export function useAuthorReader() {
  const { currentNode, renderContext, currentResource } = useServerContext();
  const locale = currentResource.getLocale();
  const siteRoot = currentNode.getPath().match(/^\/sites\/[^/]+/)?.[0];
  const cache = (node: JCRNodeWrapper) => {
    server.render.addCacheDependency({ path: node.getPath() }, renderContext);
    const translation = `j:translation_${locale.getLanguage()}`;
    if (node.hasNode(translation)) {
      server.render.addCacheDependency(
        { path: node.getNode(translation).getPath() },
        renderContext,
      );
    }
  };
  const available = (node?: JCRNodeWrapper | null): node is JCRNodeWrapper => {
    if (!node || !siteRoot) return false;
    try {
      cache(node);
      return node.getPath().startsWith(`${siteRoot}/`) && node.hasPermission("jcr:read");
    } catch {
      return false;
    }
  };
  const translated = (node?: JCRNodeWrapper | null): node is JCRNodeWrapper =>
    available(node) &&
    node.hasI18N(locale) &&
    (!node.hasProperty("j:invalidLanguages") ||
      !Array.from(node.getProperty("j:invalidLanguages").getValues()).some(
        (value) => value.getString() === locale.getLanguage(),
      ));
  const profileUrl = (author: JCRNodeWrapper, useResource = true) => {
    if (
      useResource &&
      translated(author) &&
      author.isNodeType("jmix:mainResource") &&
      findAuthorFolder(author, cache)
    )
      return buildNodeUrl(author);
    const page = reference(author, "profilePage");
    if (!translated(page) || !page.isNodeType("jnt:page")) return "";
    if (
      page.hasProperty("j:invalidLanguages") &&
      Array.from(page.getProperty("j:invalidLanguages").getValues()).some(
        (value) => value.getString() === locale.getLanguage(),
      )
    )
      return "";
    return buildNodeUrl(page);
  };
  const authors = (folder: JCRNodeWrapper, limit = 30, offset = 0, exclude?: string) => {
    if (!available(folder) || !folder.isNodeType("jahiacommix:authorFolder")) return [];
    cache(folder);
    return getNodesByJCRQuery(
      folder.getSession(),
      directoryQuery(folder.getPath(), exclude),
      limit,
      offset,
    ).filter(translated);
  };
  return { available, translated, profileUrl, cache, authors };
}
