import { useState, type ReactNode } from "react";
import classes from "./NavBar.module.css";

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

  return (
    <nav className={classes.nav} data-theme="night" data-open={open}>
      <div className={classes.bar}>
        {children}
        <div style={{ flex: 1, display: "flex", gap: ".25rem", justifyContent: "end" }}>
          <a href="#demo" className={classes.cta}>
            Réserver une démo
          </a>
          <button
            type="button"
            className={classes.menuButton}
            onClick={() => setOpen((prev) => !prev)}
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
    </nav>
  );
}
