import { AbsoluteArea, buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import { levels, Locale, type Props } from "./types.js";
import classes from "./component.module.css";
import clsx from "clsx";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:partner",
    name: "fullPage",
  },
  (
    { "jcr:title": title, logo, certification, countries, description }: Props,
    { currentNode, renderContext },
  ) => (
    <section className={classes.container}>
      <header className={classes.header}>
        <h1>
          <img src={buildNodeUrl(logo)} alt={title} title={title} />
        </h1>
      </header>
      <div className={clsx(classes.grid, "_container")}>
        <article className={classes.card}>
          <h2>About</h2>
          <hr />
          <div
            className="_richtext"
            style={{ flex: 1 }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
          <hr />
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
            <p className={clsx("_pack-1", classes.small)}>{levels[certification]}</p>
          </footer>
        </article>
        <article className={classes.card}>
          <h2>Contact {title}</h2>
          <AbsoluteArea
            name="partner-contact"
            parent={renderContext.getSite()}
            nodeType="jahiacom:contentStack"
          />
        </article>
      </div>
    </section>
  ),
);
