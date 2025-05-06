import { useEffect, useRef, useState, type ReactNode } from "react";
import classes from "./component.module.css";

export default function CarouselClient({
  mode,
  length,
  children,
}: {
  mode: "color" | "mono";
  length: number;
  children: ReactNode;
}) {
  const [scrolling, setScrolling] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Make the carousel scroll when the content is overflowing
  useEffect(() => {
    const handler = () => {
      if (!wrapper.current) return;
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setScrolling(wrapper.current?.scrollWidth > wrapper.current?.offsetWidth);
    };

    window.addEventListener("resize", handler);
    handler();
    return () => {
      window.removeEventListener("resize", handler);
    };
  });

  return (
    <div ref={wrapper} className={classes.wrapper} data-scrolling={scrolling} data-mode={mode}>
      <div className={classes.carousel} style={{ "--duration": `${length * 5}s` }}>
        <div>{children}</div>
        <div style={{ display: scrolling ? undefined : "none" }}>{children}</div>
      </div>
    </div>
  );
}
