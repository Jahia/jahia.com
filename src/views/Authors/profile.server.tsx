import { buildNodeUrl, jahiaComponent, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { Image } from "../../components/Image.jsx";
import { CTA } from "../../mixins/CTA/index.jsx";
import type { ContainerProps } from "../../theme/index.jsx";
import { reference, stringProperty, useAuthorReader } from "./data.server.js";
import { professionalEmailLink, socialUrl } from "./socialLinks.js";
import { readBiography, profileBiography } from "./biography.js";
import { authorBlogPage } from "./blog.server.js";
import { usePublishedAuthorTopics } from "./topics.server.js";
import classes from "./component.module.css";

interface Props extends ContainerProps {
  author?: JCRNodeWrapper;
  biographyTitle?: string;
}

export function AuthorProfile({
  author,
  biographyTitle,
  theme = "night",
  background = "plusses",
}: Props) {
  const { t } = useTranslation();
  const { currentResource, renderContext } = useServerContext();
  const { available, translated, cache } = useAuthorReader();
  if (!available(author) || !author.isNodeType("jahiacom:blogAuthor")) return null;
  const name = stringProperty(author, "name");
  const role = stringProperty(author, "jobTitle");
  const image = reference(author, "image");
  const bio = stringProperty(author, "text");
  const legacy = readBiography(bio);
  const linkedin = socialUrl(
    stringProperty(author, "linkedInUrl") ||
      legacy.links.find((link) => socialUrl(link, "linkedin")) ||
      "",
    "linkedin",
  );
  const reddit = socialUrl(
    stringProperty(author, "redditUrl") ||
      legacy.links.find((link) => socialUrl(link, "reddit")) ||
      "",
    "reddit",
  );
  const github = socialUrl(stringProperty(author, "githubUrl"), "github");
  const email = professionalEmailLink(stringProperty(author, "professionalEmail"));
  const topics: JCRNodeWrapper[] = [];
  if (author.hasProperty("expertiseTopics"))
    for (const value of author.getProperty("expertiseTopics").getValues()) {
      try {
        const node = value.getNode();
        if (
          node?.isNodeType("jnt:category") &&
          node.hasPermission("jcr:read") &&
          (node.getPath().startsWith("/sites/systemsite/categories/") ||
            node.getPath().startsWith(renderContext.getSite().getPath() + "/"))
        ) {
          cache(node);
          topics.push(node);
        }
      } catch {
        /* Deleted optional category. */
      }
    }
  const { topics: countedTopics, suggestions } = usePublishedAuthorTopics(author, topics);
  const blog = authorBlogPage(author, cache);
  const updated = Date.parse(stringProperty(author, "profileUpdated"));
  // Imported fiches sometimes contain only the job title as their biography.
  const plainBio = bio
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const showBio = plainBio && plainBio !== role;
  return (
    <>
      <div
        hidden
        data-author-topic-suggestions={JSON.stringify(suggestions)}
        data-author-topic-selection={JSON.stringify(countedTopics)}
        data-author-blog-url={translated(blog) ? buildNodeUrl(blog, { mode: "live" }) : ""}
      />
      <header className={classes.profileHeader} data-theme={theme} data-bg={background}>
        <div className={classes.hero}>
          <div className={classes.identity}>
            <p className={classes.eyebrow}>{t("authors.profileEyebrow")}</p>
            <h1>{name}</h1>
            {role && <p>{role}</p>}
            {(linkedin || reddit || github || email) && (
              <p className={classes.socials}>
                {linkedin && (
                  <CTA
                    href={linkedin}
                    secondary={stringProperty(author, "linkedInButtonVariant") === "secondary"}
                    location="author_profile"
                    name="linkedin"
                  >
                    LinkedIn
                  </CTA>
                )}
                {reddit && (
                  <CTA
                    href={reddit}
                    secondary={stringProperty(author, "redditButtonVariant") !== "primary"}
                    location="author_profile"
                    name="reddit"
                  >
                    Reddit
                  </CTA>
                )}
                {github && (
                  <CTA
                    href={github}
                    secondary={stringProperty(author, "githubButtonVariant") !== "primary"}
                    location="author_profile"
                    name="github"
                  >
                    GitHub
                  </CTA>
                )}
                {email && (
                  <CTA
                    href={email}
                    secondary={
                      stringProperty(author, "professionalEmailButtonVariant") !== "primary"
                    }
                    location="author_profile"
                    name="email"
                  >
                    {t("authors.professionalEmail")}
                  </CTA>
                )}
              </p>
            )}
            {Number.isFinite(updated) && (
              <p className={classes.updated}>
                {t("authors.updated")}{" "}
                <time dateTime={new Date(updated).toISOString()}>
                  {new Intl.DateTimeFormat(currentResource.getLocale().getLanguage(), {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(updated)}
                </time>
              </p>
            )}
          </div>
          {available(image) && (
            <Image className={classes.heroPortrait} image={image} alt="" sizes={[360, 720]} />
          )}
        </div>
      </header>
      {(showBio || countedTopics.length > 0) && (
        <section className={classes.biographySection} data-theme="day">
          <div className={classes.biographyGrid}>
            {showBio && (
              <div className={classes.biography}>
                {biographyTitle && <h2>{biographyTitle}</h2>}
                <div
                  className="_richtext"
                  dangerouslySetInnerHTML={{
                    __html: profileBiography(bio, [linkedin, reddit].filter(Boolean)),
                  }}
                />
              </div>
            )}
            {countedTopics.length > 0 && (
              <aside className={classes.topics}>
                <h2>{t("authors.topics")}</h2>
                <ul>
                  {countedTopics.map((topic) => (
                    <li key={topic.id}>
                      <span className={classes.topicLabel}>
                        {topic.label}{" "}
                        <span className={classes.topicCount}>
                          {t("authors.articleCount", { count: topic.count })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </section>
      )}
    </>
  );
}

jahiaComponent({ componentType: "view", nodeType: "jahiacom:authorProfile" }, (props: Props) => (
  <AuthorProfile {...props} />
));
