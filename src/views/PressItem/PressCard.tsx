import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import type { HTMLAttributes } from "react";
import CardMedia from "../../components/CardMedia.jsx";
import { navigationUrl } from "../../templates/navigationUrl.js";
import classes from "../PressNews/component.module.css";
import cardClasses from "../Card/component.module.css";

/** Preserve editorial labels while keeping common technology acronyms consistent. */
export const pressCategoryLabel = (label: string): string =>
  /^(ai|ia|cms|dxp)$/i.test(label.trim()) ? label.trim().toUpperCase() : label;

/** Press-specific cards support the news lists. */
export default function PressCard({
  title,
  description,
  image,
  cardTheme,
  background,
  link,
  dateLabel,
  iso,
  themeLabel,
  name,
  contentType = "communique",
  categories = [],
  actionHref,
  ...attributes
}: {
  title?: string;
  description?: string;
  image?: JCRNodeWrapper;
  cardTheme?: "day" | "cloudy" | "night";
  background?: string;
  link?: JCRNodeWrapper;
  dateLabel?: string;
  iso?: string;
  themeLabel?: string;
  name: string;
  contentType?: string;
  categories?: string[];
  actionHref?: string;
} & HTMLAttributes<HTMLElement>) {
  const { t } = useTranslation();
  const href = navigationUrl(actionHref || (link ? buildNodeUrl(link) : undefined));
  const labels = categories.length ? categories : themeLabel ? [themeLabel] : [];
  return (
    <article {...attributes} className={`${cardClasses.card} ${classes.release}`} data-theme="day">
      <div className={classes.releaseVisual}>
        <CardMedia image={image} theme={cardTheme} background={background} />
      </div>
      <div className={classes.releaseBody}>
        <div className={classes.releaseMeta}>
          <span className={classes.badge}>{t(`pressRoom.types.${contentType}`)}</span>
          {(dateLabel || iso) && <time dateTime={iso}>{dateLabel || iso}</time>}
        </div>
        <h3 tabIndex={-1}>
          {href ? (
            <a
              href={href}
              data-element-url={href}
              data-element-type="link"
              data-element-text={title}
              data-element-location="press_room"
              data-element-name={name}
            >
              {title}
            </a>
          ) : (
            title
          )}
        </h3>
        {description && <p>{description}</p>}
        {labels.length > 0 && (
          <div className={classes.releaseCategories}>
            {labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
