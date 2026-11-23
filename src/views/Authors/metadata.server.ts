import { buildNodeUrl, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { readBiography } from "./biography.js";
import { stringProperty } from "./data.server.js";
import { socialUrl } from "./socialLinks.js";
import { authorAbsoluteUrl, authorProfileSchema, authorSchemaJson } from "./structuredData.js";

export function authorMetadata(author: JCRNodeWrapper) {
  const { renderContext, currentResource } = useServerContext();
  const legacy = readBiography(stringProperty(author, "text"));
  const origin = renderContext.getURLGenerator().getServer();
  const path = buildNodeUrl(author, { mode: "live" });
  const request = renderContext.getRequest();
  const scheme = request.getScheme();
  const port = request.getServerPort();
  const defaultPort = (scheme === "https" && port === 443) || (scheme === "http" && port === 80);
  const host = request.getServerName();
  const authority =
    host.includes(":") && !/^[^:]+:\d+$/.test(host) && !host.startsWith("[")
      ? "[" + host + "]"
      : host;
  const hasPort = /^(?:[^:]+|\[[^\]]+\]):\d+$/.test(authority);
  const requestOrigin = scheme + "://" + authority + (hasPort || defaultPort ? "" : ":" + port);
  const url = authorAbsoluteUrl(path, origin) || authorAbsoluteUrl(path, requestOrigin);
  const schema = authorProfileSchema({
    url,
    name: stringProperty(author, "name"),
    language: currentResource.getLocale().getLanguage(),
    jobTitle: stringProperty(author, "jobTitle"),
    description: stringProperty(author, "shortDescription"),
    linkedin:
      stringProperty(author, "linkedInUrl") ||
      legacy.links.find((link) => socialUrl(link, "linkedin")),
    reddit:
      stringProperty(author, "redditUrl") || legacy.links.find((link) => socialUrl(link, "reddit")),
    github: stringProperty(author, "githubUrl"),
    updated: stringProperty(author, "profileUpdated"),
  });
  return schema ? [authorSchemaJson(schema)] : undefined;
}
