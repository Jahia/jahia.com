import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import classes from "./component.module.css";
import clsx from "clsx";
import { levels, Locale, type Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:partner",
  },
  ({ "jcr:title": title, certification, countries, description, logo }: Props, { currentNode }) => (
    <article className={classes.card}>
      <img src={buildNodeUrl(logo)} alt={title} title={title} />
      <p className={clsx("_pack-1", classes.small)}>{levels[certification]}</p>
      <hr />
      <div
        className="_richtext"
        style={{ flex: 1 }}
        dangerouslySetInnerHTML={{ __html: description }}
      />
      <footer className={classes.footer}>
        <p className="_pack-1">
          <span className="i-ri:map-pin-2-line" />
          {countries
            .map((code) => {
              const locale = new Locale(currentNode.getLanguage(), code);
              return locale.getDisplayCountry(locale);
            })
            .join(", ")}
        </p>
        <p>
          <a href={buildNodeUrl(currentNode)} className="_pack-1">
            Contact them
            <span className="i-ri:mail-line" />
          </a>
        </p>
      </footer>
    </article>
  ),
);
