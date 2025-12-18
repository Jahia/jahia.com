import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
  },
  ({ "jcr:title": title, author, date, image, summary }: Props) => (
    <ul>
      <li>title: {title || "no title"}</li>
      <li>author: {author ? author.getPath() : "no author"}</li>
      <li>date: {date || "no date"}</li>
      <li>image: {image ? buildNodeUrl(image) : "no image"}</li>
      <li>summary: {summary || "no summary"}</li>
    </ul>
  ),
);
