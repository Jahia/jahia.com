import {
  buildNodeUrl,
  getChildNodes,
  server,
  useJCRQuery,
  useServerContext,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { toCard } from "../../views/ResourceCarousel/selection.server.js";
import { RESOURCE_MODEL } from "../../views/ResourceCarousel/contentModel.js";
import { htmlToText } from "../Partner/types.js";
import { selectRelatedTerms, mergeRelatedTranslations } from "./relatedTerms.js";
import { resolveGlossaryIndex } from "./indexPage.js";
import { rankLinks, usefulExpression } from "./linkSelection.js";
import { glossaryMemo, memoProfile, resourceMetadata, editorialParts } from "./memo.server.js";
import type { Props } from "./types.js";
import { createBoundedTextReader } from "./editorialText.js";
import type { EntryResource } from "./Entry.jsx";
import type { GlossaryItem } from "../../views/Glossary/model.js";

// Cache only a pure conversion of the exact value just read through JCR.
// Nodes, permissions, sessions and selection results are never retained here.
const editorialTextValue = createBoundedTextReader(htmlToText);

export function automaticLinks(
  props: Props,
  selectedIds: string[],
): { resources: EntryResource[]; terms: GlossaryItem[] } {
  if (props.autoLinks === false) return { resources: [], terms: [] };
  const { currentNode, currentResource, renderContext } = useServerContext();
  const site = renderContext.getSite();
  const sitePath = site.getPath();
  const pathLiteral = "'" + sitePath.replace(/'/g, "''") + "'";
  const locale = currentResource.getLocale();
  const language = locale.getLanguage();
  const depend = (node: JCRNodeWrapper) =>
    server.render.addCacheDependency({ path: node.getPath() }, renderContext);
  depend(site);
  const query = (type: string) =>
    useJCRQuery({
      query: `SELECT * FROM [${type}] AS item WHERE ISDESCENDANTNODE(item, ${pathLiteral})`,
    });
  const visible = (node: JCRNodeWrapper) => {
    try {
      depend(node);
      if (!node.hasPermission("jcr:read") || !node.hasI18N(locale)) return false;
      const translation = `j:translation_${language}`;
      if (node.hasNode(translation)) {
        const translated = node.getNode(translation);
        depend(translated);
        if (!translated.hasPermission("jcr:read")) return false;
      }
      return (
        !node.hasProperty("j:invalidLanguages") ||
        !Array.from(node.getProperty("j:invalidLanguages").getValues(), (v) =>
          v.getString(),
        ).includes(language)
      );
    } catch {
      return false;
    }
  };
  const index = resolveGlossaryIndex(currentNode, depend);
  const excluded = [
    currentNode.getIdentifier(),
    ...(index ? [index.getIdentifier()] : []),
    ...selectedIds,
  ];
  const expressions = [
    props["jcr:title"] || currentNode.getDisplayableName(),
    ...(props.aliases || []),
  ];
  // French headings in the editorial pack may translate established English technical names.
  // Keep those names searchable in French resources without selecting English-only pages.
  if (language === "fr" && currentNode.hasNode("j:translation_en")) {
    const english = currentNode.getNode("j:translation_en");
    depend(english);
    expressions.push(english.getPropertyAsString("jcr:title") || "");
  }
  const themes = (props.linkThemes || []).map((node) => {
    depend(node);
    return node.getIdentifier();
  });
  const context = editorialTextValue(`${props.summary || ""} ${props.body || ""}`);
  const concepts = [
    ...(props.comparison || "").matchAll(/<th\b[^>]*scope=["']row["'][^>]*>([\s\S]*?)<\/th>/gi),
  ]
    .map((match) => editorialTextValue(match[1]))
    .filter(usefulExpression);
  // Search editorial text only: do not follow resource references or shared navigation.
  // Stop at child pages: their content belongs to a separate candidate URL.
  const editorialText = (root: JCRNodeWrapper) => {
    const cached = editorialParts(memo, sitePath, language, root.getPath());
    if (cached) return cached.map(editorialTextValue).join(" ");
    const parts: string[] = [];
    let visited = 0;
    const visit = (node: JCRNodeWrapper, depth: number) => {
      if (++visited > 160 || !node.hasPermission("jcr:read")) return;
      depend(node);
      if (node.hasI18N(locale)) {
        const translation = `j:translation_${language}`;
        if (node.hasNode(translation)) {
          const translated = node.getNode(translation);
          depend(translated);
          if (!translated.hasPermission("jcr:read")) return false;
        }
        const invalid =
          node.hasProperty("j:invalidLanguages") &&
          Array.from(node.getProperty("j:invalidLanguages").getValues(), (value) =>
            value.getString(),
          ).includes(language);
        if (invalid) return;
        for (const property of [
          "jcr:title",
          "text",
          "body",
          "subtitle",
          "introduction",
          "description",
        ]) {
          if (node.hasProperty(property))
            parts.push(editorialTextValue(node.getPropertyAsString(property) || ""));
        }
      }
      if (depth < 6 && visited < 160) {
        for (const child of getChildNodes(node, 160 - visited, 0)) {
          if (!child.getName().startsWith("j:") && !child.isNodeType("jnt:page"))
            visit(child, depth + 1);
        }
      }
    };
    visit(root, 0);
    return parts.join(" ");
  };
  const memo = glossaryMemo();
  const resourceNodes = new Map<string, JCRNodeWrapper>();
  const collectResources = (metadata?: JCRNodeWrapper[]) =>
    (
      metadata ||
      [...query(RESOURCE_MODEL.blogNodeType), ...query(RESOURCE_MODEL.pageNodeType)].filter(visible)
    )
      .map((node) => {
        // Reuse carousel metadata, category lineage, publication and future-date guards.
        // Ranking needs editorial metadata, not URLs or image references.
        const card = toCard(node, {
          allowGenericResource: true,
          includeCustomerCases: true,
          includePresentation: false,
          includeTaxonomy: themes.length > 0,
        });
        if (!card) return null;
        const current = metadata ? currentNode.getSession().getNodeByIdentifier(card.id) : node;
        if (!visible(current)) return null;
        resourceNodes.set(card.id, current);
        const pageType = node.getPropertyAsString("pageType");
        // Older native pages may have no pageType. Relevance is determined by their
        // actual title/description; do not discard valid feature pages for missing metadata.
        return {
          ...card,
          content: editorialText(current),
          kind:
            card.kind === "blog"
              ? "article"
              : card.kind === "customerCase"
                ? "customerStory"
                : pageType === "solution_page"
                  ? "solution"
                  : card.kind,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  let resourceCandidates;
  try {
    const metadata = resourceMetadata(memo, sitePath, language, themes.length > 0);
    resourceCandidates = collectResources(metadata);
    if (metadata && !memo?.valid()) resourceCandidates = collectResources();
  } catch {
    resourceCandidates = collectResources();
  }
  // Shared FR/EN eligibility and ranking; localize only after selecting identifiers.
  const relatedLanguages = ["en", "fr"];
  const bilingual = (node: JCRNodeWrapper) => {
    const invalid = node.hasProperty("j:invalidLanguages")
      ? Array.from(node.getProperty("j:invalidLanguages").getValues(), (v) => v.getString())
      : [];
    return relatedLanguages.every(
      (lang) =>
        !invalid.includes(lang) &&
        node.hasNode(`j:translation_${lang}`) &&
        node.getNode(`j:translation_${lang}`).hasPermission("jcr:read"),
    );
  };
  const sharedProfile = (node: JCRNodeWrapper) =>
    memoProfile(
      memo,
      node,
      sitePath,
      language,
      () =>
        mergeRelatedTranslations(
          node.getIdentifier(),
          relatedLanguages.flatMap((lang) => {
            const path = `j:translation_${lang}`;
            if (!node.hasNode(path)) return [];
            const translation = node.getNode(path);
            depend(translation);
            if (!translation.hasPermission("jcr:read")) return [];
            const comparison = translation.getPropertyAsString("comparison") || "";
            return [
              {
                id: node.getIdentifier(),
                language: lang,
                taxonomyIds: node.hasProperty("j:defaultCategory")
                  ? Array.from(node.getProperty("j:defaultCategory").getValues(), (value) =>
                      value.getString(),
                    )
                  : [],
                title: translation.getPropertyAsString("jcr:title") || node.getName(),
                aliases: translation.hasProperty("aliases")
                  ? Array.from(translation.getProperty("aliases").getValues(), (value) =>
                      value.getString(),
                    )
                  : [],
                description: editorialTextValue(translation.getPropertyAsString("summary") || ""),
                content: editorialTextValue(translation.getPropertyAsString("body") || ""),
                comparison: editorialTextValue(comparison),
                concepts: [
                  ...comparison.matchAll(/<th\b[^>]*scope=["']row["'][^>]*>([\s\S]*?)<\/th>/gi),
                ]
                  .map((match) => editorialTextValue(match[1]))
                  .filter(usefulExpression),
              },
            ];
          }),
        ),
      depend,
    );
  const termNodes = query("jahiacom:glossaryEntry")
    .filter(visible)
    .filter(bilingual)
    .filter(
      (node) =>
        !node.hasProperty("mergedInto") &&
        node.getParent().getPath() === currentNode.getParent().getPath(),
    )
    .filter((node) => {
      try {
        return node.hasProperty("j:published") && node.getProperty("j:published").getBoolean();
      } catch {
        return false;
      }
    });
  const currentProfile = sharedProfile(currentNode);
  const selectedTerms = selectRelatedTerms(
    termNodes.map(sharedProfile),
    currentProfile,
    currentProfile.concepts,
  );
  // Localized display data does not participate in the bilingual ranking.
  // Resolve it only for the selected terms, keeping the original nodes and order.
  const localizedNodes = new Map(termNodes.map((node) => [node.getIdentifier(), node]));
  const localizeTerm = (node: JCRNodeWrapper) => ({
    id: node.getIdentifier(),
    title: node.getDisplayableName(),
    url: buildNodeUrl(node),
    summary: node.getPropertyAsString("summary") || "",
    description: node.getPropertyAsString("summary") || "",
    content: editorialTextValue(node.getPropertyAsString("body") || ""),
    comparison: editorialTextValue(node.getPropertyAsString("comparison") || ""),
    aliases: node.hasProperty("aliases")
      ? Array.from(node.getProperty("aliases").getValues(), (v) => v.getString())
      : [],
  });
  const terms = selectedTerms.map((term) => localizeTerm(localizedNodes.get(term.id)!));
  const relatedExpressions = [
    ...concepts,
    ...terms.slice(0, 3).flatMap((term) => [term.title, ...term.aliases]),
  ].filter(usefulExpression);
  return {
    resources: rankLinks(
      resourceCandidates,
      expressions,
      themes,
      excluded,
      24,
      relatedExpressions,
      context,
      [],
      currentNode.getName(),
      {
        conceptTerms: props.conceptTerms,
        conceptScope: props.conceptScope,
        conceptSignals: props.conceptSignals,
        preferEducational: props.preferEducational !== false,
      },
    ).map((card) => ({ ...card, url: buildNodeUrl(resourceNodes.get(card.id)!) })),
    terms,
  };
}
