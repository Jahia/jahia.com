import { useEffect, useState, type ReactNode } from "react";
import classes from "./NavBar.module.css";
import clsx from "clsx";
import { useFloating, autoUpdate } from "@floating-ui/react";

export default function NavBarClient({
  children,
  pages,
}: {
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
  const { refs, floatingStyles } = useFloating({
    whileElementsMounted: autoUpdate,
  });

  // Automatically close the menu when the screen is resized to a larger size
  useEffect(() => {
    // Breakpoint defined in unocss.config.js
    const md = window.matchMedia("(min-width: 800px)");

    const handler = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
        setSubmenu(null);
      }
    };

    md.addEventListener("change", handler);
    return () => md.removeEventListener("change", handler);
  });

  return (
    <nav className={classes.nav} data-theme="night" data-open={open}>
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
                ref={refs.setReference}
              >
                {title}
                <span className="i-ri:arrow-down-wide-line" />
              </a>
            ))}
            <a href="#contact" className={classes.cta2}>
              Contact
              <span className={classes.cta2Line} />
              <span className="i-ri:arrow-right-wide-line" />
            </a>
          </div>
          <a href="#demo" className={classes.cta}>
            Réserver une démo
          </a>
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
      <div className={classes.menu}>
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
          <a href="#contact" className={classes.cta2}>
            Contact
            <span className={classes.cta2Line} />
            <span className="i-ri:arrow-right-wide-line" />
          </a>
        </div>
      </div>
      <div ref={refs.setFloating} style={floatingStyles}>
        Desktop menu
      </div>
    </nav>
  );
}
