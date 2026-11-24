import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { CTA } from "../../mixins/CTA/index.jsx";
import { Image } from "../../components/Image.jsx";
import { cardIntroduction, readBiography } from "./biography.js";
import { reference, stringProperty, useAuthorReader } from "./data.server.js";
import classes from "./component.module.css";

export function AuthorCard({
  author,
  topics,
  showProfileChevron,
}: {
  author: JCRNodeWrapper;
  topics: ReadonlyArray<{ id: string; label: string }>;
  showProfileChevron: boolean;
}) {
  const { t } = useTranslation();
  const { available, profileUrl } = useAuthorReader();
  if (!available(author)) return null;
  const name = stringProperty(author, "name");
  const image = reference(author, "image");
  const role = stringProperty(author, "jobTitle");
  const description = stringProperty(author, "shortDescription");
  const legacy = readBiography(stringProperty(author, "text"));
  const biography = legacy.excerpt;
  const hasBiography = biography !== role;
  const url = profileUrl(author);
  return (
    <article className={classes.card}>
      {available(image) && (
        <Image className={classes.portrait} image={image} alt="" sizes={[180, 360]} />
      )}
      <h3>{name}</h3>
      {role && <p className={classes.role}>{role}</p>}
      {(description || (hasBiography && biography)) && (
        <p className={classes.description}>{cardIntroduction(description || biography)}</p>
      )}
      {topics.length > 0 && (
        <ul className={classes.cardTopics} aria-label={t("authors.topics")} role="list">
          {topics.map(({ id, label }) => (
            <li key={id}>{label}</li>
          ))}
        </ul>
      )}
      {url && (
        <div className={classes.profileLink}>
          <CTA
            href={url}
            aria-label={`${t("authors.viewProfile")} — ${name}`}
            secondary
            icon={showProfileChevron}
            location="author_directory"
            name={author.getName()}
          >
            {t("authors.viewProfile")}
          </CTA>
        </div>
      )}
    </article>
  );
}
