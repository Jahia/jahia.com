import { jahiaComponent } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Image } from "../../components/Image.jsx";
import type { ReactNode } from "react";
import classes from "./testimonials.module.css";

export function TestimonialCard({
  logo,
  author,
  authorTitle,
  children,
}: {
  logo?: JCRNodeWrapper;
  author?: string;
  authorTitle?: string;
  children: ReactNode;
}) {
  return (
    <article className={classes.card} data-carousel-item="">
      {logo && <Image image={logo} sizes={[160, 320]} className={classes.logo} />}
      <blockquote className={classes.comment}>{children}</blockquote>
      {(author || authorTitle) && (
        <footer className={classes.author}>
          {author && <span>— {author}</span>}
          {authorTitle && <small>{authorTitle}</small>}
        </footer>
      )}
    </article>
  );
}

jahiaComponent(
  { componentType: "view", nodeType: "jahiacom:partnerTestimonial" },
  ({ author, authorTitle, comment }: { author: string; authorTitle?: string; comment: string }) => (
    <TestimonialCard author={author} authorTitle={authorTitle}>
      {comment}
    </TestimonialCard>
  ),
);
