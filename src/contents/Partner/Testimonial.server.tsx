import type { JCRNodeWrapper } from "org.jahia.services.content";
import { Image } from "../../components/Image.jsx";
import type { ReactNode } from "react";
import classes from "./testimonials.module.css";

export function TestimonialCard({
  logo,
  author,
  children,
}: {
  logo?: JCRNodeWrapper;
  author?: string;
  children: ReactNode;
}) {
  return (
    <article className={classes.card} data-carousel-item="">
      {logo && <Image image={logo} sizes={[160, 320]} className={classes.logo} />}
      <blockquote className={classes.comment}>{children}</blockquote>
      {author && (
        <footer className={classes.author}>
          <span>— {author}</span>
        </footer>
      )}
    </article>
  );
}
