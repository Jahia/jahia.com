import { useCallback, useEffect, useState, type ReactNode } from "react";
import classes from "./NavBar.module.css";
import clsx from "clsx";
import { useFloating, autoUpdate, offset } from "@floating-ui/react-dom";

export default function NavBarClient({
  primaryCTA,
  secondaryCTA,
  children,
  pages,
}: {
  primaryCTA?: { href: string; label: string } | false;
  secondaryCTA?: { href: string; label: string } | false;
  children: ReactNode;
  pages: Array<{
    href: string;
    current: boolean;
    title: string;
    children: Array<{
      href: string;
      current: boolean;
      title: string;
    }>;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);

  /** Used to disable the animation on first render */
  const [animate, setAnimate] = useState(false);

  const { refs, floatingStyles } = useFloating({
    whileElementsMounted: autoUpdate,
    middleware: [offset(16)],
  });

  const close = useCallback(() => {
    setOpen(false);
    setAnimate(false);
  }, []);

  // Resizing the window should close the menu
  useEffect(() => {
    // Breakpoint defined in unocss.config.js
    const md = window.matchMedia("(min-width: 800px)");
    md.addEventListener("change", close);
    return () => md.removeEventListener("change", close);
  }, [close]);

  // All clicks outside the menu should close it
  useEffect(() => {
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [close]);

  // Pressing escape should also close the menu
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close]);

  return (
    <nav
      className={classes.nav}
      data-theme="night"
      data-open={open}
      // Clicking within the menu should not close it
      onClick={(event) => event.stopPropagation()}
    >
      <div className="_pack-2" style={{ maxWidth: "var(--jahia-width)", marginInline: "auto" }}>
        {children}
        <div className="_pack-2" style={{ flex: 1, justifyContent: "end" }}>
          <div className={clsx(classes.desktop, "_pack-4")}>
            {pages.map(({ href, current, title }) => (
              <a
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={classes.barLink}
                onMouseMove={(event) => {
                  refs.setReference(event.currentTarget);
                  if (submenu) setAnimate(true);
                  setOpen(true);
                  setSubmenu(href);
                }}
                onFocus={(event) => {
                  refs.setReference(event.currentTarget);
                  if (submenu) setAnimate(true);
                  setOpen(true);
                  setSubmenu(href);
                }}
              >
                {title}
                <span className="i-ri:arrow-down-wide-line" />
              </a>
            ))}
            {secondaryCTA && (
              <a href={secondaryCTA.href} className={classes.cta2}>
                {secondaryCTA.label}
                <span className={classes.cta2Line} />
                <span className="i-ri:arrow-right-wide-line" />
              </a>
            )}
          </div>
          {primaryCTA && (
            <a href={primaryCTA.href} className={classes.cta}>
              {primaryCTA.label}
            </a>
          )}

          <button
            type="button"
            className={classes.menuButton}
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span className={open ? "i-ri:close-large-line" : "i-ri:menu-line"} />
          </button>
        </div>
      </div>
      <div className={classes.mobileMenu} inert={!open}>
        {pages.map(({ href, current, title, children }) => (
          <div key={href} className={classes.submenu} data-open={submenu === href}>
            <div className={classes.submenuLabel}>
              <a href={href} aria-current={current ? "page" : undefined} className={classes.link}>
                {title}
              </a>
              <button
                type="button"
                onClick={() => setSubmenu((prev) => (prev === href ? null : href))}
                aria-label={submenu === href ? "Close submenu" : "Open submenu"}
              >
                <span
                  className={
                    submenu === href ? "i-ri:arrow-up-wide-line" : "i-ri:arrow-down-wide-line"
                  }
                />
              </button>
            </div>
            <ul>
              {children.map(({ href, current, title }) => (
                <li key={href}>
                  <a
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={classes.link}
                  >
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div style={{ padding: ".5rem" }}>
          {secondaryCTA && (
            <a href={secondaryCTA.href} className={classes.cta2}>
              {secondaryCTA.label}
              <span className={classes.cta2Line} />
              <span className="i-ri:arrow-right-wide-line" />
            </a>
          )}
        </div>
      </div>
      <div
        inert={!open}
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          transition: animate ? "transform 150ms ease-out, opacity 150ms ease-out" : undefined,
        }}
        onTransitionEnd={() => setAnimate(false)}
        className={classes.desktopMenu}
      >
        <ul>
          {pages
            .find(({ href }) => href === submenu)
            ?.children.map(({ href, current, title }) => (
              <li key={href}>
                <a href={href} aria-current={current ? "page" : undefined} className={classes.link}>
                  {title}
                </a>
              </li>
            ))}
        </ul>
      </div>
    </nav>
  );
}
