import {
  AbsoluteArea,
  buildNodeUrl,
  Island,
  jahiaComponent,
  Render,
  useJCRQuery,
} from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { Layout } from "../../templates/Layout.jsx";
import Carousel from "../../views/ResourceCarousel/Carousel.client.jsx";
import classes from "./profile.module.css";
import {
  configuredRegions,
  compositePartnerLocations,
  countryNames,
  htmlToText,
  legacyRegion,
  levels,
  partnerLocations,
  regionCodes,
  regionCountries,
  type Props,
  type Region,
} from "./types.js";

const isRegion = (value: string | null): value is Region =>
  value === "europe" || value === "americas" || value === "apac";

const stringProperty = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name) ? node.getProperty(name).getString() : undefined;

const stringProperties = (node: JCRNodeWrapper, name: string) =>
  node.hasProperty(name)
    ? Array.from(node.getProperty(name).getValues(), (value) => value.getString())
    : [];

const nodeRegions = (node: JCRNodeWrapper): Region[] => {
  const compositeLocations = compositePartnerLocations(
    stringProperty(node, "partnerLocationsData"),
  );
  if (compositeLocations.length > 0) {
    return [...new Set(compositeLocations.map(({ region }) => region))];
  }

  const locations = partnerLocations(node);
  if (locations.length > 0) return [...new Set(locations.map(({ region }) => region))];

  const regions = stringProperties(node, "regions") as Region[];
  return regions.length > 0 ? regions : [legacyRegion(node)];
};

const normalizedCountry = (
  country: string,
  locale: InstanceType<typeof import("./types.js").Locale>,
) =>
  countryNames([country], locale)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();

const pageAncestor = (node?: JCRNodeWrapper): JCRNodeWrapper | undefined => {
  let current = node;
  while (current && !current.isNodeType("jnt:page")) {
    if (current.getPath() === "/") return undefined;
    current = current.getParent() as JCRNodeWrapper;
  }
  return current;
};

jahiaComponent(
  {
    componentType: "template",
    nodeType: "jahiacom:partner",
  },
  (props, { currentNode }) => (
    <Layout props={props} pageType="partner_page">
      <Render node={currentNode} view="fullPage" />
    </Layout>
  ),
);

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:partner",
    name: "fullPage",
    properties: {
      "cache.requestParameters": "region",
    },
  },
  (props: Props, { currentNode, renderContext, currentResource }) => {
    const { t } = useTranslation();
    const fallbackRegion = legacyRegion(currentNode);
    const locations = partnerLocations(currentNode);
    const locationProps = locations.length ? { ...props, locations } : props;
    const regions = configuredRegions(locationProps, fallbackRegion);
    const requested = renderContext.getRequest().getParameter("region");
    const activeRegion =
      isRegion(requested) && regions.includes(requested) ? requested : regions[0];
    const locale = currentResource.getLocale();
    const url = buildNodeUrl(currentNode);
    const website = /^https?:\/\//i.test(props.website || "") ? props.website : undefined;
    const summary = props.shortDescription || htmlToText(props.description).slice(0, 240);
    const partnerSinceDate = props.partnerSince ? new Date(props.partnerSince) : undefined;
    const partnerSince =
      partnerSinceDate && !Number.isNaN(partnerSinceDate.getTime())
        ? partnerSinceDate.getFullYear()
        : undefined;
    const type = props.partnerType || "integrator";
    const projects = useJCRQuery({
      query: `
        SELECT * FROM [jahiacom:partnerProject]
        WHERE ISCHILDNODE(${JSON.stringify(currentNode.getPath())})
        ORDER BY [jcr:created]
      `,
    });
    const siteRoot = currentNode.getPath().match(/^\/sites\/[^/]+/)?.[0] || "/sites";
    const partnerCandidates = useJCRQuery({
      query: `
        SELECT * FROM [jahiacom:partner]
        WHERE ISDESCENDANTNODE(${JSON.stringify(siteRoot)})
        ORDER BY [jcr:title]
      `,
    });
    const locationNodes = useJCRQuery({
      query: `
        SELECT * FROM [jahiacom:partnerLocation]
        WHERE ISDESCENDANTNODE(${JSON.stringify(siteRoot)})
      `,
    });
    const currentTitle = props["jcr:title"].trim().toLocaleLowerCase();
    const currentCountries = new Set(
      regionCountries(locationProps, activeRegion).map((country) =>
        normalizedCountry(country, locale),
      ),
    );
    const eligibleSimilar = partnerCandidates.filter((node) => {
      if (node.getIdentifier() === currentNode.getIdentifier()) return false;
      const title = (stringProperty(node, "jcr:title") || node.getName())
        .trim()
        .toLocaleLowerCase();
      if (title === currentTitle) return false;
      const candidateType = stringProperty(node, "partnerType") || "integrator";
      const candidateRegions = nodeRegions(node);
      return candidateType === type && candidateRegions.includes(activeRegion);
    });
    const sameCountry = eligibleSimilar.filter((node) => {
      const candidateCountries = regionCountries(
        {
          regions: nodeRegions(node),
          locationCountries: stringProperties(node, "locationCountries"),
          partnerLocationsData: stringProperty(node, "partnerLocationsData"),
          countries: stringProperties(node, "countries"),
          locations: partnerLocations(node),
        },
        activeRegion,
      );
      return candidateCountries.some((country) =>
        currentCountries.has(normalizedCountry(country, locale)),
      );
    });
    const similar = (sameCountry.length > 0 ? sameCountry : eligibleSimilar).slice(0, 8);
    const directoryComponent = useJCRQuery({
      query: `SELECT * FROM [jahiacom:partnerList] WHERE ISDESCENDANTNODE(${JSON.stringify(
        siteRoot,
      )})`,
    })[0];
    const directoryPage = pageAncestor(directoryComponent);
    const directoryUrl = directoryPage ? buildNodeUrl(directoryPage) : "#";
    const tagNodes = (props.tags || []).filter((tag): tag is JCRNodeWrapper => tag !== null);
    const expertise = props.expertise || [];

    for (const dependency of [...projects, ...similar, ...locationNodes]) {
      server.render.addCacheDependency({ path: dependency.getPath() }, renderContext);
    }

    return (
      <>
        <section className={classes.hero} data-theme="night">
          <div className={classes.heroInner}>
            <div className={classes.heroLogo}>
              {props.logo ? (
                <img loading="eager" src={buildNodeUrl(props.logo)} alt={props["jcr:title"]} />
              ) : (
                <span>{props["jcr:title"]}</span>
              )}
            </div>
            <div className={classes.heroCopy}>
              <h1>{props["jcr:title"]}</h1>
              {summary && <p>{summary}</p>}
            </div>
            {website && (
              <a className={classes.primaryAction} href={website} rel="noopener noreferrer">
                {t("partner.contact", { name: props["jcr:title"] })}
              </a>
            )}
          </div>
        </section>

        <section className={classes.overview}>
          <div className={classes.overviewInner}>
            <div className={classes.facts}>
              <div>
                <span>{t("partner.partnerType")}</span>
                <strong>
                  {type === "technology" ? t("partner.technology") : t("partner.integrators")}
                </strong>
              </div>
              <div>
                <span>{t("partner.level")}</span>
                <strong>{levels(props.certification, locale)}</strong>
              </div>
              {partnerSince !== undefined && (
                <div>
                  <span>{t("partner.partnerSince")}</span>
                  <strong>{partnerSince}</strong>
                </div>
              )}
              <div>
                <span>{t("partner.region")}</span>
                <strong>
                  {t(`partner.regions.${activeRegion}`)}
                  {regionCountries(locationProps, activeRegion).length > 0 &&
                    ` · ${countryNames(regionCountries(locationProps, activeRegion), locale)}`}
                </strong>
              </div>
            </div>
            {regions.length > 1 && (
              <nav className={classes.regionNav} aria-label={t("partner.locations")}>
                {regions.map((region) => (
                  <a
                    key={region}
                    href={`${url}?region=${region}`}
                    aria-current={region === activeRegion ? "page" : undefined}
                  >
                    {regionCodes[region]}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </section>

        <section className={classes.section}>
          <div className={classes.twoColumns}>
            <article>
              <p className={classes.eyebrow}>{t("partner.who")}</p>
              <h2>{props.aboutTitle || props["jcr:title"]}</h2>
              <div className="_richtext" dangerouslySetInnerHTML={{ __html: props.description }} />
            </article>
            <article>
              <p className={classes.eyebrow}>{t("partner.whatTheyDo")}</p>
              <h2>{props.expertiseTitle || t("partner.expertiseTitle")}</h2>
              {expertise.length > 0 && (
                <ul className={classes.expertise}>
                  {expertise.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {tagNodes.length > 0 && (
                <div className={classes.tags}>
                  {tagNodes.map((tag) => (
                    <span key={tag.getIdentifier()}>{tag.getDisplayableName()}</span>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        {props.partnership && (
          <section className={classes.partnership} data-theme="cloudy">
            <div>
              <div className={classes.partnershipCopy}>
                <p className={classes.eyebrow}>{t("partner.partnershipEyebrow")}</p>
                <h2>{t("partner.partnershipTitle")}</h2>
                <div
                  className="_richtext"
                  dangerouslySetInnerHTML={{ __html: props.partnership }}
                />
              </div>
              <div className={classes.partnershipFacts}>
                <div>
                  <span>{t("partner.level")}</span>
                  <strong>{levels(props.certification, locale)}</strong>
                </div>
                {props.certifiedConsultants !== undefined && (
                  <div>
                    <span>{t("partner.certifiedConsultants")}</span>
                    <strong>{props.certifiedConsultants}</strong>
                  </div>
                )}
                {props.scope && (
                  <div>
                    <span>{t("partner.scope")}</span>
                    <strong>{props.scope}</strong>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className={classes.section}>
            <div>
              <p className={classes.eyebrow}>{t("partner.projectsEyebrow")}</p>
              <h2>{t("partner.projectsTitle")}</h2>
              <Island component={Carousel} props={{ itemCount: projects.length }}>
                {projects.map((project) => (
                  <Render key={project.getIdentifier()} node={project} />
                ))}
              </Island>
            </div>
          </section>
        )}

        {props.quote && (
          <section className={classes.quoteSection} data-theme="cloudy">
            <blockquote>
              <div className="_richtext" dangerouslySetInnerHTML={{ __html: props.quote }} />
              {props.quoteAuthor && (
                <footer>
                  — {props.quoteAuthor}
                  {props.quoteAuthorTitle && `, ${props.quoteAuthorTitle}`}
                </footer>
              )}
            </blockquote>
          </section>
        )}

        {similar.length > 0 && (
          <section className={classes.section}>
            <div>
              <p className={classes.eyebrow}>{t("partner.similarEyebrow")}</p>
              <h2>{t("partner.similarTitle")}</h2>
              <Island component={Carousel} props={{ itemCount: similar.length }}>
                {similar.map((partner) => (
                  <Render key={partner.getIdentifier()} node={partner} view="similarCard" />
                ))}
              </Island>
            </div>
          </section>
        )}

        <section className={classes.contactSection} data-theme="night">
          <div>
            <p className={classes.eyebrow}>{t("partner.projectCtaEyebrow")}</p>
            <h2>{t("partner.projectCtaTitle", { name: props["jcr:title"] })}</h2>
            <p>{t("partner.projectCtaIntro")}</p>
            <div className={classes.existingContact}>
              <AbsoluteArea
                name="partner-contact"
                parent={renderContext.getSite()}
                nodeType="jahiacom:contentStack"
              />
            </div>
            <div className={classes.contactActions}>
              {website && (
                <a className={classes.primaryAction} href={website} rel="noopener noreferrer">
                  {t("partner.contact", { name: props["jcr:title"] })} →
                </a>
              )}
              <a className={classes.secondaryAction} href={directoryUrl}>
                {t("partner.returnDirectory")}
              </a>
            </div>
          </div>
        </section>
      </>
    );
  },
);
