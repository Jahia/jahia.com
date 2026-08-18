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
}

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

const partnerProps = (node: JCRNodeWrapper): PartnerProps => ({
  "jcr:title": stringProperty(node, "jcr:title") || node.getName(),
  "certification": (stringProperty(node, "certification") ||
    "silver") as PartnerProps["certification"],
  "description": stringProperty(node, "description") || "",
  "logo": node.hasProperty("logo") ? node.getProperty("logo").getValue().getNode() : undefined,
  "partnerType": stringProperty(node, "partnerType") as PartnerProps["partnerType"],
  "partnerLevel": stringProperty(node, "partnerLevel"),
  "integrationPartner": booleanProperty(node, "integrationPartner"),
  "shortDescription": stringProperty(node, "shortDescription"),
  "countries": stringProperties(node, "countries"),
  "regions": stringProperties(node, "regions") as Region[] | undefined,
  "locationCountries": stringProperties(node, "locationCountries"),
  "partnerLocationsData": stringProperty(node, "partnerLocationsData"),
});

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:partnerList",
  },
  ({ sourceRoot }: Props, { currentNode, currentResource, renderContext }) => {
    const siteRoot = currentNode.getPath().match(/^\/sites\/[^/]+/)?.[0] || "/sites";
    const rootPath = sourceRoot?.getPath() || siteRoot;
    const partners = useJCRQuery({
      query: `
        SELECT * FROM [jahiacom:partner]
        WHERE ISDESCENDANTNODE(${JSON.stringify(rootPath)})
        ORDER BY [jcr:title]
      `,
    });
    for (const dependency of partners) {
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

    return (
      <Island
        component={Directory}
        props={{ total: cards.length, integratorCount, technologyCount, regionCounts }}
      >
        {cards.map(({ currentNode: partner, props, regionUrls }) => (
          <PartnerCard
            key={partner.getIdentifier()}
            currentNode={partner}
            props={props}
            locale={currentResource.getLocale()}
            regionUrls={regionUrls}
          />
        ))}
      </Island>
    );
  },
);
