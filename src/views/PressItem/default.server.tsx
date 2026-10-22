import { buildNodeUrl, jahiaComponent, server } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";
import PressCard, { pressCategoryLabel } from "./PressCard.jsx";

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:pressItem" },
  (
    {
      "jcr:title": title,
      description,
      contentType = "communique",
      themeLabel,
      date,
      dateLabel,
      link,
      image,
      cardTheme,
      background,
      "j:defaultCategory": assigned,
      ...cta
    }: Props,
    { currentNode, currentResource, renderContext },
  ) => {
    const timestamp = Date.parse(currentNode.getPropertyAsString("date") || date || "");
    const validDate = Number.isFinite(timestamp);
    const iso = validDate ? new Date(timestamp).toISOString().slice(0, 10) : undefined;
    const locale = currentResource.getLocale().getLanguage();
    const categoryNodes = assigned?.filter((node) => node !== null) || [];
    const categories = categoryNodes.map((node) => pressCategoryLabel(node.getDisplayableName()));
    const destination = cta.ctaType === "internal" ? cta["j:linknode"] : undefined;
    for (const node of [link, image, destination, ...categoryNodes])
      if (node) server.render.addCacheDependency({ path: node.getPath() }, renderContext);
    const actionHref = destination
      ? buildNodeUrl(destination)
      : cta.ctaType === "external"
        ? cta["j:url"]
        : undefined;
    return (
      <PressCard
        title={title}
        description={description}
        image={image}
        cardTheme={cardTheme}
        background={background}
        link={link}
        dateLabel={
          dateLabel || (validDate ? new Date(timestamp).toLocaleDateString(locale) : undefined)
        }
        iso={iso}
        themeLabel={themeLabel}
        categories={categories}
        contentType={contentType}
        actionHref={actionHref}
        name={currentNode.getName()}
        data-press-card=""
        data-type={contentType}
        data-topic={categories[0] || themeLabel || ""}
        data-themes={JSON.stringify(
          categories.length ? categories : themeLabel ? [themeLabel] : [],
        )}
        data-year={iso?.slice(0, 4) || ""}
        data-timestamp={validDate ? timestamp : 0}
      />
    );
  },
);
