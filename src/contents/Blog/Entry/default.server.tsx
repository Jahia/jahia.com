import { buildNodeUrl, jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

interface Props {
  "jcr:title"?: string;
  "author": JCRNodeWrapper;
  "summary"?: string;
  "date"?: string;
  "blogType"?: Array<JCRNodeWrapper | null>;
  "image"?: JCRNodeWrapper;
  "text"?: string;
}

jahiaComponent(
  {
    componentType: "view",
    nodeType: "jahiacom:blogEntry",
  },
  ({ "jcr:title": title, author, blogType, date, image, summary, text }: Props) => (
    <ul>
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
