import {
  buildNodeUrl,
  Island,
  jahiaComponent,
  useJCRQuery,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { PartnerCard } from "../../contents/Partner/default.server.jsx";
import {
  configuredRegions,
  legacyRegion,
  regionCountries,
  type Props as PartnerProps,
  type Region,
} from "../../contents/Partner/types.js";
import Directory from "./Directory.client.jsx";

interface Props {
  sourceRoot?: JCRNodeWrapper;
  directoryMode?: "all" | "solution" | "technology";
}

type DirectoryMode = NonNullable<Props["directoryMode"]>;

const regionPriority: Record<Region, number> = {
  europe: 0,
  americas: 1,
  apac: 2,
};

const normalizedTitle = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

const stringProperty = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name) ? node.getProperty(name).getString() : undefined;

const stringProperties = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name)
    ? Array.from(node.getProperty(name).getValues(), (value) => value.getString())
    : undefined;

const booleanProperty = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name) ? node.getProperty(name).getBoolean() : undefined;

const nodeProperties = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name)
    ? Array.from(node.getProperty(name).getValues(), (value) => value.getNode())
    : [];

const partnerDescendants = (root: JCRNodeWrapper) => {
  const partners: JCRNodeWrapper[] = [];
  const visit = (node: JCRNodeWrapper) => {
    const children = node.getNodes();
    while (children.hasNext()) {
      const child = children.nextNode() as JCRNodeWrapper;
      if (child.isNodeType("jahiacom:partner")) partners.push(child);
      visit(child);
    }
  };
  visit(root);
  return partners;
};

const partnerProps = (node: JCRNodeWrapper): PartnerProps => ({
  "jcr:title": stringProperty(node, "jcr:title") || node.getName(),
  "certification": (stringProperty(node, "certification") ||
    "silver") as PartnerProps["certification"],
  "description": stringProperty(node, "description") || "",
  "logo": node.hasProperty("logo") ? node.getProperty("logo").getValue().getNode() : undefined,
  "partnerType": stringProperty(node, "partnerType") as PartnerProps["partnerType"],
  "partnerLevel": stringProperty(node, "partnerLevel"),
  "integrationPartner": booleanProperty(node, "integrationPartner"),
  "strategicPartner": booleanProperty(node, "strategicPartner"),
  "shortDescription": stringProperty(node, "shortDescription"),
  "partnership": stringProperty(node, "partnership"),
  "countries": stringProperties(node, "countries"),
  "regions": stringProperties(node, "regions") as Region[] | undefined,
  "locationCountries": stringProperties(node, "locationCountries"),
  "partnerLocationsData": stringProperty(node, "partnerLocationsData"),
  "tags": nodeProperties(node, "tags"),
});

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:partnerList",
  },
  (
    { sourceRoot, directoryMode = "all" }: Props,
    { currentNode, currentResource, renderContext },
  ) => {
    const mode: DirectoryMode = directoryMode;
    const siteRoot = currentNode.getPath().match(/^\/sites\/[^/]+/)?.[0] || "/sites";
    const directoryRootPath =
      mode === "technology"
        ? `${siteRoot}/contents/technology-partners`
        : mode === "solution"
          ? `${siteRoot}/contents/solution-partners`
          : undefined;
    const configuredRoot =
      directoryRootPath && currentNode.getSession().nodeExists(directoryRootPath)
        ? (currentNode.getSession().getNode(directoryRootPath) as JCRNodeWrapper)
        : currentNode.hasProperty("sourceRoot")
          ? (currentNode.getProperty("sourceRoot").getNode() as JCRNodeWrapper)
          : sourceRoot;
    const rootPath = configuredRoot?.getPath() || siteRoot;
    const queriedPartners = useJCRQuery({
      query: `
        SELECT * FROM [jahiacom:partner]
        WHERE ISDESCENDANTNODE(${JSON.stringify(rootPath)})
        ORDER BY [jcr:title]
      `,
    });
    const allPartners = configuredRoot ? partnerDescendants(configuredRoot) : queriedPartners;
    const partners = allPartners.filter((partner) => {
      const type = stringProperty(partner, "partnerType") || "integrator";
      if (mode === "solution") return type !== "technology";
      if (mode === "technology")
        return type === "technology" && partner.getName().toLowerCase() !== "efficy";
      return true;
    });
    for (const dependency of allPartners) {
      server.render.addCacheDependency({ path: dependency.getPath() }, renderContext);
    }

    const technologyPageRoot = `${siteRoot}/home/product/features/integrations`;
    const technologyPages = useJCRQuery({
      query: `SELECT * FROM [jnt:page] WHERE ISCHILDNODE(${JSON.stringify(technologyPageRoot)})`,
    });
    const technologyPageUrls = new Map(
      technologyPages.map((page) => [page.getName(), buildNodeUrl(page)]),
    );
    for (const dependency of technologyPages) {
      server.render.addCacheDependency({ path: dependency.getPath() }, renderContext);
    }

    const groups = new Map<string, JCRNodeWrapper[]>();
    for (const partner of partners) {
      const key = (stringProperty(partner, "jcr:title") || partner.getName())
        .trim()
        .toLocaleLowerCase();
      groups.set(key, [...(groups.get(key) || []), partner]);
    }

    const cards = Array.from(groups.values()).map((nodes) => {
      const primary = nodes[0];
      const merged = partnerProps(primary);
      const regions: Region[] = [];
      const countries: Record<Region, string[]> = { europe: [], americas: [], apac: [] };
      const regionUrls: Partial<Record<Region, string>> = {};

      for (const node of nodes) {
        const props = partnerProps(node);
        const fallback = legacyRegion(node);
        for (const region of configuredRegions(props, fallback)) {
          if (!regions.includes(region)) regions.push(region);
          regionUrls[region] ||= buildNodeUrl(node);
          for (const country of regionCountries(props, region)) {
            if (!countries[region].includes(country)) countries[region].push(country);
          }
        }
      }

      regions.sort((left, right) => regionPriority[left] - regionPriority[right]);

      return {
        currentNode: primary,
        props: {
          ...merged,
          regions,
          locationCountries: regions.map((region) => countries[region][0] || ""),
          partnerLocationsData: JSON.stringify(
            regions.flatMap((region) =>
              countries[region].length > 0
                ? countries[region].map((country) => ({ region, country }))
                : [{ region }],
            ),
          ),
        },
        regionUrls,
      };
    });

    cards.sort((left, right) => {
      const leftRegion = left.props.regions?.[0] || "apac";
      const rightRegion = right.props.regions?.[0] || "apac";
      const regionDifference = regionPriority[leftRegion] - regionPriority[rightRegion];
      if (regionDifference !== 0) return regionDifference;

      const leftTitle = normalizedTitle(left.props["jcr:title"]);
      const rightTitle = normalizedTitle(right.props["jcr:title"]);
      return leftTitle < rightTitle ? -1 : leftTitle > rightTitle ? 1 : 0;
    });

    const integratorCount = cards.filter(({ props }) => props.partnerType !== "technology").length;
    const technologyCount = cards.length - integratorCount;
    const regionCounts = {
      europe: cards.filter(({ props }) => props.regions?.includes("europe")).length,
      americas: cards.filter(({ props }) => props.regions?.includes("americas")).length,
      apac: cards.filter(({ props }) => props.regions?.includes("apac")).length,
    };
    const technologyOptions = new Map<
      string,
      { value: string; label: string; partnerships: Set<"strategic" | "integration"> }
    >();
    for (const { props } of cards) {
      const partnership = props.strategicPartner ? "strategic" : "integration";
      for (const tag of (props.tags || []).filter(
        (value): value is JCRNodeWrapper => value !== null,
      )) {
        const value = tag.getName();
        const existing = technologyOptions.get(value) || {
          value,
          label: tag.getDisplayableName(),
          partnerships: new Set<"strategic" | "integration">(),
        };
        existing.partnerships.add(partnership);
        technologyOptions.set(value, existing);
      }
    }
    const technologies = [...technologyOptions.values()]
      .map(({ value, label, partnerships }) => ({ value, label, partnerships: [...partnerships] }))
      .sort((left, right) => left.label.localeCompare(right.label));
    const levelCounts = {
      diamond: cards.filter(({ props }) => props.certification === "diamond").length,
      gold: cards.filter(({ props }) => props.certification === "gold").length,
      silver: cards.filter(({ props }) => props.certification === "silver").length,
    };
    const filterItems = cards.map(({ props }) => ({
      level: props.certification,
      regions: props.regions || [],
    }));

    return (
      <Island
        component={Directory}
        props={{
          mode,
          total: cards.length,
          integratorCount,
          technologyCount,
          regionCounts,
          technologies,
          levelCounts,
          filterItems,
        }}
      >
        {cards.map(({ currentNode: partner, props, regionUrls }) => (
          <PartnerCard
            key={partner.getIdentifier()}
            currentNode={partner}
            props={props}
            locale={currentResource.getLocale()}
            regionUrls={regionUrls}
            directoryMode={mode}
            profileUrl={props.partnership ? undefined : technologyPageUrls.get(partner.getName())}
          />
        ))}
      </Island>
    );
  },
);
