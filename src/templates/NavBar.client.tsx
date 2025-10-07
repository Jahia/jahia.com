import { useEffect, useState, type ReactNode } from "react";
import classes from "./NavBar.module.css";
import clsx from "clsx";
import { useFloating, autoUpdate, offset, shift } from "@floating-ui/react-dom";
import { CTA } from "../mixins/CTA/index.jsx";

export type Group = { title: string; children: Entry[] };
export type Page = { title: string; href: string; current: boolean };
export type Entry = Group | Page;

export default function NavBarClient({
  primaryCTA,
  secondaryCTA,
  children,
  entries,
}: {
  primaryCTA?: { href: string; label: string } | false;
  secondaryCTA?: { href: string; label: string } | false;
  children: ReactNode;
  entries: Entry[];
}) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);

  /** Used to disable the animation on first render */
  const [animate, setAnimate] = useState(false);

  const subentries = entries.find(
    (entry): entry is Group => !("href" in entry) && entry.title === submenu,
  )?.children;

  const { refs, floatingStyles } = useFloating({
    whileElementsMounted: autoUpdate,
    middleware: [offset(16), shift()],
  });

  const close = () => {
    setOpen(false);
    setAnimate(false);
    // The submenu is "closed" when the animation is over
    // (to avoid showing an empty menu during the animation)
  };

  // Resizing the window should close the menu
  useEffect(() => {
    // Breakpoint defined in NavBar.module.css (700px + 16px of padding)
    const md = window.matchMedia("(min-width: 716px)");
    md.addEventListener("change", close);
    return () => md.removeEventListener("change", close);
  }, []);

  // All clicks outside the menu should close it
  useEffect(() => {
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // All scrolls outside the menu should close it
  useEffect(() => {
    document.addEventListener("scroll", close);
    return () => document.removeEventListener("scroll", close);
  }, []);

  // Pressing escape should also close the menu
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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
          <div className={classes.desktopBar}>
            {entries.map((entry) =>
              "href" in entry ? (
                <a
                  key={entry.href}
                  href={entry.href}
                  aria-current={entry.current ? "page" : undefined}
                  className={classes.barLink}
                  onMouseMove={() => {
                    setOpen(false);
                  }}
                >
                  {entry.title}
                </a>
              ) : (
                <button
                  type="button"
                  key={entry.title}
                  className={classes.barLink}
                  onMouseMove={(event) => {
                    refs.setReference(event.currentTarget);
                    if (submenu) setAnimate(true);
                    setOpen(true);
                    setSubmenu(entry.title);
                  }}
                  onFocus={(event) => {
                    refs.setReference(event.currentTarget);
                    if (submenu) setAnimate(true);
                    setOpen(true);
                    setSubmenu(entry.title);
                  }}
                >
                  {entry.title}
                  <span className="i-ri:arrow-down-wide-line" />
                </button>
              ),
            )}
            {secondaryCTA && (
              <CTA href={secondaryCTA.href} icon secondary>
                {secondaryCTA.label}
              </CTA>
            )}
          </div>
          {primaryCTA && <CTA href={primaryCTA.href}>{primaryCTA.label}</CTA>}

          <button
            type="button"
            className={classes.menuButton}
            onClick={() => {
              if (open) close();
              else setOpen(true);
            }}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span className={open ? "i-ri:close-large-line" : "i-ri:menu-line"} />
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      <div
        className={classes.mobileMenu}
        inert={!open}
        onTransitionEnd={() => {
          if (!open) setSubmenu(null);
        }}
      >
        {entries.map((entry) =>
          "href" in entry ? (
            <a key={entry.href} href={entry.href} aria-current={entry.current ? "page" : undefined}>
              {entry.title}
            </a>
          ) : (
            <div key={entry.title} className={classes.submenu} data-open={submenu === entry.title}>
              <button
                type="button"
                className={classes.submenuLabel}
                onClick={() => setSubmenu((prev) => (prev === entry.title ? null : entry.title))}
                aria-label={submenu === entry.title ? "Close submenu" : "Open submenu"}
              >
                <span>{entry.title}</span>
                <span
                  className={
                    submenu === entry.title
                      ? "i-ri:arrow-up-wide-line"
                      : "i-ri:arrow-down-wide-line"
                  }
                />
              </button>
              <ul
                inert={submenu !== entry.title}
                className={clsx(
                  entry.children.every((entry) => !("href" in entry))
                    ? classes.columns
                    : classes.singleColumn,
                )}
              >
                {entry.children.map((entry) =>
                  "href" in entry ? (
                    <li key={entry.href}>
                      <a href={entry.href} aria-current={entry.current ? "page" : undefined}>
                        {entry.title}
                      </a>
                    </li>
                  ) : (
                    <li key={entry.title} className={classes.menuColumn}>
                      <small>{entry.title}</small>
                      <ul>
                        {entry.children.map(
                          (entry) =>
                            "href" in entry && (
                              <li key={entry.href}>
                                <a
                                  href={entry.href}
                                  aria-current={entry.current ? "page" : undefined}
                                >
                                  {entry.title}
                                </a>
                              </li>
                            ),
                        )}
                      </ul>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ),
        )}
        {secondaryCTA && (
          <div style={{ padding: ".5rem" }}>
            <CTA href={secondaryCTA.href} icon secondary>
              {secondaryCTA.label}
            </CTA>
          </div>
        )}
      </div>
      {/* Desktop menu */}
      <div
        inert={!open}
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          transition: animate
            ? "transform var(--jahia-motion-timing), opacity var(--jahia-timing)"
            : undefined,
        }}
        onTransitionEnd={() => {
          setAnimate(false);
          if (!open) setSubmenu(null);
        }}
        className={classes.desktopMenu}
        data-theme="cloudy"
      >
        <ul
          className={clsx(
            subentries?.every((entry) => !("href" in entry))
              ? classes.columns
              : classes.singleColumn,
          )}
        >
          {subentries?.map((entry) =>
            "href" in entry ? (
              <li key={entry.href}>
                <a href={entry.href} aria-current={entry.current ? "page" : undefined}>
                  {entry.title}
                </a>
              </li>
            ) : (
              <li key={entry.title} className={classes.menuColumn}>
                <small>{entry.title}</small>
                <ul>
                  {entry.children.map(
                    (entry) =>
                      "href" in entry && (
                        <li key={entry.href}>
                          <a href={entry.href} aria-current={entry.current ? "page" : undefined}>
                            {entry.title}
                          </a>
                        </li>
                      ),
                  )}
                </ul>
              </li>
            ),
          )}
        </ul>
      </div>
    </nav>
  );
}
