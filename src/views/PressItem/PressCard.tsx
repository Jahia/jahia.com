import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import type { HTMLAttributes } from "react";
import CardMedia from "../../components/CardMedia.jsx";
import { navigationUrl } from "../../templates/navigationUrl.js";
import classes from "../PressNews/component.module.css";
import cardClasses from "../Card/component.module.css";
import PressAction from "./PressAction.jsx";

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
  name,
  contentType = "communique",
  actionHref,
  actionLabel,
  actionDownload,
  actionSecondary = true,
  mediaName,
  authorName,
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
  name: string;
  contentType?: string;
  actionHref?: string;
  actionLabel?: string;
  actionDownload?: boolean;
  actionSecondary?: boolean;
  mediaName?: string;
  authorName?: string;
} & HTMLAttributes<HTMLElement>) {
  const { t } = useTranslation();
  const href = navigationUrl(actionHref || (link ? buildNodeUrl(link) : undefined));
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
        <h3 tabIndex={-1}>{title}</h3>
        {description && <p>{description}</p>}
        {(authorName || mediaName) && (
          <div className={classes.releaseSource}>
            {authorName && <p>{authorName}</p>}
            {mediaName && <p>{mediaName}</p>}
          </div>
        )}
        {href && actionLabel && (
          <p className={classes.releaseAction}>
            <PressAction
              href={href}
              label={actionLabel}
              name={name}
              download={actionDownload}
              secondary={actionSecondary}
              external={!actionDownload && /^https?:\/\//i.test(href)}
            />
            {actionDownload && <span className={classes.fileFormat}>PDF</span>}
          </p>
        )}
      </div>
    </article>
  );
}
