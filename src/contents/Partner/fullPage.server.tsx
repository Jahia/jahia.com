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
import { CTA } from "../../mixins/CTA/index.jsx";
import { Layout } from "../../templates/Layout.jsx";
import Carousel from "../../views/ResourceCarousel/Carousel.client.jsx";
import classes from "./profile.module.css";
import { legacyExpertiseBody } from "./expertise.js";
import { rankSimilarPartners } from "./similarity.js";
import { TestimonialCard } from "./Testimonial.server.jsx";
import testimonialClasses from "./testimonials.module.css";
import {
  configuredRegions,
  compositePartnerLocations,
  countryNames,
  htmlToText,
  legacyRegion,
  PartnerBadge,
  regionCodes,
  regionCountries,
  type Props,
  type Region,
} from "./types.js";

interface InlineTestimonial {
  comment: string;
  logoId?: string;
  author?: string;
  authorTitle?: string;
  company?: string;
  attribution?: string;
  html?: string;
}

const parseTestimonials = (value?: string): InlineTestimonial[] | undefined => {
  if (value === undefined) return undefined;
  try {
    const rows: unknown = JSON.parse(value);
    if (!Array.isArray(rows)) return undefined;
    return rows.filter(
      (row): row is InlineTestimonial =>
        row &&
        typeof row.comment === "string" &&
        row.comment.trim() &&
        (row.author === undefined || typeof row.author === "string") &&
        (row.authorTitle === undefined || typeof row.authorTitle === "string") &&
        (row.company === undefined || typeof row.company === "string") &&
        (row.attribution === undefined || typeof row.attribution === "string") &&
        (row.html === undefined || typeof row.html === "string"),
    );
  } catch {
    return undefined;
  }
};

const testimonialLogo = (node: JCRNodeWrapper, id?: string): JCRNodeWrapper | undefined => {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  try {
    const image = node.getSession().getNodeByIdentifier(id);
    return image.isNodeType("jmix:image") ? image : undefined;
  } catch {
    // Missing or unpublished media must not prevent the quote from rendering.
    return undefined;
  }
};

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
    properties: { "cache.requestParameters": "search" },
  },
  (props: Props, { currentNode }) => (
    <Layout
      props={{
        ...props,
        "jcr:description":
          currentNode.getPropertyAsString("jcr:description") ||
          props.seoDescription ||
          props.shortDescription ||
          htmlToText(props.description),
      }}
      pageType="partner_page"
    >
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
    const regions = configuredRegions(props, fallbackRegion);
    const requested = renderContext.getRequest().getParameter("region");
    const activeRegion =
      isRegion(requested) && regions.includes(requested) ? requested : regions[0];
    const locale = currentResource.getLocale();
    const url = buildNodeUrl(currentNode);
    const website = /^https?:\/\//i.test(props.website || "") ? props.website : undefined;
    const summary =
      props.heroSubtitle || props.shortDescription || htmlToText(props.description).slice(0, 240);
    const type = props.partnerType || "integrator";
    const projects = useJCRQuery({
      query: `
        SELECT * FROM [jahiacom:partnerProject]
        WHERE ISCHILDNODE(${JSON.stringify(currentNode.getPath())})
        ORDER BY [jcr:created]
      `,
    });
    const siteRoot = currentNode.getPath().match(/^\/sites\/[^/]+/)?.[0] || "/sites";
    const testimonials = useJCRQuery({
      query: `SELECT * FROM [jahiacom:partnerTestimonial]
        WHERE ISCHILDNODE(${JSON.stringify(currentNode.getPath())})
        ORDER BY [position], [jcr:created]`,
    });
    const inlineTestimonials = parseTestimonials(props.testimonialsData);
    const quoteCount =
      inlineTestimonials === undefined
        ? testimonials.length + (props.quote ? 1 : 0)
        : inlineTestimonials.length;
    const partnerCandidates = useJCRQuery({
      query: `
        SELECT * FROM [jahiacom:partner]
        WHERE ISDESCENDANTNODE(${JSON.stringify(siteRoot)})
        ORDER BY [jcr:title]
      `,
    });
    const currentTitle = props["jcr:title"].trim().toLocaleLowerCase();
    const currentCountries = regionCountries(props, activeRegion).map((country) =>
      normalizedCountry(country, locale),
    );
    const eligibleSimilar = partnerCandidates.filter((node) => {
      if (node.getIdentifier() === currentNode.getIdentifier()) return false;
      const title = (stringProperty(node, "jcr:title") || node.getName())
        .trim()
        .toLocaleLowerCase();
      if (title === currentTitle) return false;
      const candidateType = stringProperty(node, "partnerType") || "integrator";
      const candidateRegions = nodeRegions(node);
      return (
        candidateType === type &&
        candidateRegions.includes(activeRegion) &&
        !(type === "technology" && title === "efficy")
      );
    });
    const uniqueSimilar = [
      ...new Map(
        eligibleSimilar.map((node) => {
          const title = (stringProperty(node, "jcr:title") || node.getName())
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLocaleLowerCase();
          return [title, node] as const;
        }),
      ).values(),
    ];
    const similarityProfiles = uniqueSimilar.map((node) => {
      const candidateCountries = regionCountries(
        {
          regions: nodeRegions(node),
          locationCountries: stringProperties(node, "locationCountries"),
          partnerLocationsData: stringProperty(node, "partnerLocationsData"),
          countries: stringProperties(node, "countries"),
        },
        activeRegion,
      );
      return {
        node,
        tags: stringProperties(node, "tags"),
        countries: candidateCountries.map((country) => normalizedCountry(country, locale)),
        level:
          stringProperty(node, "strategicPartner") === "true"
            ? "strategic"
            : stringProperty(node, "integrationPartner") === "true"
              ? "integration"
              : stringProperty(node, "certification"),
      };
    });
    const similar = rankSimilarPartners(
      {
        tags: (props.tags || []).flatMap((tag) => (tag ? [tag.getIdentifier()] : [])),
        countries: currentCountries,
        level: props.strategicPartner
          ? "strategic"
          : props.integrationPartner
            ? "integration"
            : props.certification,
      },
      similarityProfiles,
      quoteCount > 3 ? 3 : 8,
    ).map(({ node }) => node);
    const directoryComponent = useJCRQuery({
      query: `SELECT * FROM [jahiacom:partnerList] WHERE ISDESCENDANTNODE(${JSON.stringify(
        siteRoot,
      )}) AND [directoryMode] = '${type === "technology" ? "technology" : "solution"}'`,
    })[0];
    const directoryPage = pageAncestor(directoryComponent);
    const directoryUrl = directoryPage ? buildNodeUrl(directoryPage) : "#";
    const tagNodes = (props.tags || []).filter((tag): tag is JCRNodeWrapper => tag !== null);
    const expertiseBody = props.expertiseBody ?? legacyExpertiseBody(props);

    for (const dependency of [...projects, ...partnerCandidates, ...testimonials]) {
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
              {!(type === "technology" && props.strategicPartner) && (
                <div>
                  <span>
                    {type === "technology" ? t("partner.partnershipType") : t("partner.level")}
                  </span>
                  <div>
                    <PartnerBadge props={props} locale={locale} />
                  </div>
                </div>
              )}
              {type !== "technology" && (
                <div>
                  <span>{t("partner.region")}</span>
                  <strong>
                    {t(`partner.regions.${activeRegion}`)}
                    {regionCountries(props, activeRegion).length > 0 &&
                      ` · ${countryNames(regionCountries(props, activeRegion), locale)}`}
                  </strong>
                </div>
              )}
            </div>
            {type !== "technology" && regions.length > 1 && (
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
              {expertiseBody && (
                <div className="_richtext" dangerouslySetInnerHTML={{ __html: expertiseBody }} />
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
            <div className={classes.partnershipGrid}>
              <div className={classes.partnershipCopy}>
                <p className={classes.eyebrow}>{t("partner.partnershipEyebrow")}</p>
                <h2>{t("partner.partnershipTitle")}</h2>
                <div
                  className="_richtext"
                  dangerouslySetInnerHTML={{ __html: props.partnership }}
                />
                <div className={classes.partnershipFacts}>
                  <div>
                    <span>{t("partner.level")}</span>
                    <div>
                      <PartnerBadge props={props} locale={locale} />
                    </div>
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
              <div className={classes.partnershipVisual}>
                {props.partnershipImage || props.logo ? (
                  <img
                    loading="lazy"
                    src={buildNodeUrl(props.partnershipImage || props.logo!)}
                    alt={props["jcr:title"]}
                  />
                ) : (
                  <strong>{props["jcr:title"]}</strong>
                )}
              </div>
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className={classes.section}>
            <div>
              <p className={classes.eyebrow}>{t("partner.projectsEyebrow")}</p>
              <h2 id="partner-projects-title">{t("partner.projectsTitle")}</h2>
              <Island
                component={Carousel}
                props={{ itemCount: projects.length, labelledBy: "partner-projects-title" }}
              >
                {projects.map((project) => (
                  <Render key={project.getIdentifier()} node={project} />
                ))}
              </Island>
            </div>
          </section>
        )}

        {(quoteCount > 0 || renderContext.isEditMode()) && (
          <section
            className={`${classes.section} ${similar.length > 0 ? classes.connectedTestimonials : ""}`}
          >
            <div>
              <h2 id="partner-testimonials-title">{t("partner.testimonialsTitle")}</h2>
              {renderContext.isEditMode() && (
                <p className={testimonialClasses.editorHint}>
                  {t("partner.testimonialsEditorHint")}
                </p>
              )}
              {quoteCount > 0 && (
                <Island
                  component={Carousel}
                  props={{
                    itemCount: quoteCount,
                    labelledBy: "partner-testimonials-title",
                    showArrows: false,
                    fitItems: true,
                    showPagination: quoteCount > 3,
                  }}
                >
                  {inlineTestimonials === undefined && props.quote && (
                    <TestimonialCard
                      author={props.quoteAuthor}
                      authorTitle={props.quoteAuthorTitle}
                    >
                      <div
                        className="_richtext"
                        dangerouslySetInnerHTML={{ __html: props.quote }}
                      />
                    </TestimonialCard>
                  )}
                  {inlineTestimonials?.map((testimonial, index) => (
                    <TestimonialCard
                      // Stateless SSR cards: each request renders the complete editorial order.
                      // eslint-disable-next-line @eslint-react/no-array-index-key
                      key={`${index}:${testimonial.comment}`}
                      logo={testimonialLogo(currentNode, testimonial.logoId)}
                      author={
                        testimonial.attribution ??
                        [testimonial.author, testimonial.company ?? testimonial.authorTitle]
                          .filter(Boolean)
                          .join(" — ")
                      }
                    >
                      {testimonial.html ? (
                        <div
                          className="_richtext"
                          dangerouslySetInnerHTML={{ __html: testimonial.html }}
                        />
                      ) : (
                        testimonial.comment
                      )}
                    </TestimonialCard>
                  ))}
                  {inlineTestimonials === undefined &&
                    testimonials.map((testimonial) => (
                      <Render key={testimonial.getIdentifier()} node={testimonial} />
                    ))}
                </Island>
              )}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <section className={classes.section}>
            <div>
              <p className={classes.eyebrow}>{t("partner.similarEyebrow")}</p>
              <h2 id="partner-similar-title">{t("partner.similarTitle")}</h2>
              {quoteCount > 3 ? (
                <div className={classes.similarGrid}>
                  {similar.map((partner) => (
                    <Render key={partner.getIdentifier()} node={partner} view="similarCard" />
                  ))}
                </div>
              ) : (
                <Island
                  component={Carousel}
                  props={{ itemCount: similar.length, labelledBy: "partner-similar-title" }}
                >
                  {similar.map((partner) => (
                    <Render key={partner.getIdentifier()} node={partner} view="similarCard" />
                  ))}
                </Island>
              )}
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
                <CTA
                  href={website}
                  rel="noopener noreferrer"
                  icon="i-ri:arrow-right-s-line"
                  location="partner_profile_footer"
                  name={currentNode.getName()}
                >
                  {t("partner.contact", { name: props["jcr:title"] })}
                </CTA>
              )}
              <CTA
                href={directoryUrl}
                secondary
                icon="i-ri:arrow-right-s-line"
                location="partner_profile_footer"
                name={currentNode.getName()}
              >
                {t("partner.returnDirectory")}
              </CTA>
            </div>
          </div>
        </section>
      </>
    );
  },
);
