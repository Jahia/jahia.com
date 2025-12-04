import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { Props } from "./types.js";

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
    name: "fullPage",
  },
  ({ "jcr:title": title, author, blogType, date, image, summary, text }: Props) => (
    <ul style={{ background: "white" }}>
      <li>title: {title || "no title"}</li>
      <li>author: {author ? author.getPath() : "no author"}</li>
      <li>date: {date || "no date"}</li>
      <li>image: {image ? buildNodeUrl(image) : "no image"}</li>
      <li>summary: {summary || "no summary"}</li>
      <li>text: {text || "no text"}</li>
      <li>
        blogType:{" "}
        {blogType && blogType.length > 0
          ? blogType.map((bt) => (bt ? bt.getPath() : "null")).join(", ")
          : "no blogType"}
      </li>
    </ul>
  ),
);
