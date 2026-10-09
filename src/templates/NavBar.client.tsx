import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import classes from "./NavBar.module.css";
import { CTA } from "../mixins/CTA/index.jsx";
import SearchDialog, { type SearchState } from "./Search.client.jsx";
import type { Entry, Group, Page } from "./NavBar.types.js";

const tracking = (entry: Page) => ({
  "data-element-url": entry.href,
  "data-element-type": "link",
  "data-element-text": entry.title,
  "data-element-location": "header",
  "data-element-name": `nav/${entry.title}`,
});
function MenuLinks({ entries }: { entries: Entry[] }) {
  return (
    <ul className={classes.menuLinks}>
      {entries.map((entry) => (
        <li key={"href" in entry ? entry.href : entry.title}>
          {"href" in entry ? (
            <a
              href={entry.href}
              aria-current={entry.current ? "page" : undefined}
              {...tracking(entry)}
            >
              {entry.icon && (
                <img className={classes.itemIcon} src={entry.icon} alt="" width="43" height="43" />
              )}
              <span className={classes.itemCopy}>
                <span className={classes.itemTitle}>{entry.title}</span>
                {entry.description && (
                  <span className={classes.itemDescription}>{entry.description}</span>
                )}
              </span>
            </a>
          ) : (
            <>
              <p className={classes.groupTitle}>{entry.title}</p>
              <MenuLinks entries={entry.children} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
function MenuPanel({
  group,
  contact,
}: {
  group: Group;
  contact?: { href: string; label: string } | false;
}) {
  const intro = group.panel?.intro;
  const feature = group.panel?.feature;
  const columns = group.panel?.columns;
  // Keep existing menu destinations accessible even when optional columns are configured.
  const selected = new Set(
    columns?.flatMap((column) =>
      column.children.flatMap((entry) => ("href" in entry ? [entry.href] : [])),
    ),
  );
  const unselectedEntries = (entries: Entry[]): Entry[] =>
    entries.flatMap((entry): Entry[] => {
      if ("href" in entry) return selected.has(entry.href) ? [] : [entry];
      // Configured columns replace legacy group headings, including in EDIT previews.
      return unselectedEntries(entry.children);
    });
  const remaining = unselectedEntries(group.children);
  const entries = columns
    ? columns.map((column, index) =>
        index === columns.length - 1
          ? { ...column, children: [...column.children, ...remaining] }
          : column,
      )
    : group.children;
  return (
    <div className={classes.panelInner}>
      <div className={classes.panelLayout} data-intro={!!intro} data-feature={!!feature}>
        {intro && (
          <div className={classes.panelIntro}>
            {intro.eyebrow && <p className={classes.eyebrow}>{intro.eyebrow}</p>}
            <p className={classes.panelHeading}>{intro.heading}</p>
            {intro.text && <p className={classes.panelText}>{intro.text}</p>}
            {intro.link && (
              <a className={classes.panelLink} href={intro.link.href} {...tracking(intro.link)}>
                {intro.link.title}
              </a>
            )}
          </div>
        )}
        <div className={classes.panelNavigation}>
          {!intro && <p className={classes.eyebrow}>{group.title}</p>}
          <MenuLinks entries={entries} />
        </div>
        {feature && (
          <div className={classes.panelFeature}>
            {feature.eyebrow && <p className={classes.eyebrow}>{feature.eyebrow}</p>}
            <p className={classes.panelHeading}>{feature.heading}</p>
            {feature.text && <p className={classes.panelText}>{feature.text}</p>}
            <a
              className={classes.panelLink}
              href={feature.link.href}
              aria-label={`${feature.link.title} : ${feature.heading}`}
              {...tracking(feature.link)}
            >
              {feature.link.title}
            </a>
          </div>
        )}
      </div>
      {group.panel?.footerText && (
        <div className={classes.panelFooter}>
          <p>{group.panel.footerText}</p>
          {contact && (
            <a className={classes.panelLink} href={contact.href}>
              {contact.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
export default function NavBarClient({
  primaryCTA,
  secondaryCTA,
  children,
  entries,
  utilityEntries = [],
  langs,
  language,
  search,
}: {
  primaryCTA?: { href: string; label: string } | false;
  secondaryCTA?: { href: string; label: string } | false;
  children: ReactNode;
  entries: Entry[];
  utilityEntries?: Page[];
  langs: Array<{ language: string; name: string; href: string }>;
  language: string;
  search: SearchState;
}) {
  const id = useId();
  const nav = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const searchTrigger = useRef<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [submenu, setSubmenu] = useState<number | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(search.requested);
  const fr = language === "fr";
  const close = () => {
    setMobileOpen(false);
    setSubmenu(null);
    setLanguageOpen(false);
  };
  useEffect(() => {
    const element = nav.current;
    if (!element) return;
    const header = element.closest<HTMLElement>("[data-jahia-header]");
    const updateScrolled = () => {
      const scrolled = String(window.scrollY > 0);
      if (header && header.dataset.scrolled !== scrolled) header.dataset.scrolled = scrolled;
    };
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    const updateHeight = () => {
      if (header)
        document.documentElement.style.setProperty(
          "--jahia-header-height",
          `${header.getBoundingClientRect().height}px`,
        );
    };
    const observer = new ResizeObserver(updateHeight);
    if (header) observer.observe(header);
    updateHeight();
    const breakpoint = window.matchMedia("(min-width: 1200px)");
    breakpoint.addEventListener("change", close);
    return () => {
      window.removeEventListener("scroll", updateScrolled);
      header?.removeAttribute("data-scrolled");
      observer.disconnect();
      breakpoint.removeEventListener("change", close);
      document.documentElement.style.removeProperty("--jahia-header-height");
    };
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !nav.current?.contains(event.target)) close();
    };
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchTrigger.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        close();
        setSearchOpen(true);
      } else if (
        event.key === "Escape" &&
        !searchOpen &&
        (mobileOpen || submenu !== null || languageOpen)
      ) {
        event.preventDefault();
        close();
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [mobileOpen, submenu, languageOpen, searchOpen]);
  const openSearch = (event: MouseEvent<HTMLButtonElement>) => {
    searchTrigger.current = event.currentTarget;
    close();
    setSearchOpen(true);
  };
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    requestAnimationFrame(() => {
      const previous = searchTrigger.current;
      if (previous?.getBoundingClientRect().width) previous.focus();
      else
        Array.from(
          nav.current?.querySelectorAll<HTMLButtonElement>(
            `.${classes.menuButton}, [data-navbar-search]`,
          ) || [],
        )
          .find((button) => button.getBoundingClientRect().width)
          ?.focus();
    });
  }, []);
  const utilities = (
    <>
      {utilityEntries.map((entry) => (
        <a
          key={entry.href}
          className={classes.utilityLink}
          href={entry.href}
          aria-current={entry.current ? "page" : undefined}
          {...tracking(entry)}
        >
          {entry.title}
        </a>
      ))}
      {secondaryCTA && (
        <a
          className={classes.utilityLink}
          href={secondaryCTA.href}
          data-element-url={secondaryCTA.href}
          data-element-type="cta"
          data-element-text={secondaryCTA.label}
          data-element-location="header"
          data-element-name="nav-secondary"
        >
          {secondaryCTA.label}
        </a>
      )}
    </>
  );
  const languages = langs.map(({ name, href, language: code }) => (
    <a
      key={code}
      href={href}
      hrefLang={code}
      lang={code}
      aria-current={code === language ? "true" : undefined}
    >
      {name}
    </a>
  ));
  return (
    <nav
      ref={nav}
      className={classes.nav}
      aria-label={fr ? "Navigation principale" : "Main navigation"}
      data-open={mobileOpen || submenu !== null || languageOpen}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          close();
      }}
    >
      <div className={classes.utilityBar}>
        <div className={classes.utilityInner}>
          {utilities}
          {langs.length > 1 && (
            <div className={classes.languageControl}>
              <button
                type="button"
                className={classes.utilityLink}
                aria-label={fr ? "Choisir la langue" : "Choose language"}
                aria-expanded={languageOpen}
                aria-controls={`${id}-languages`}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  setLanguageOpen(!languageOpen);
                  setSubmenu(null);
                }}
              >
                <span className="i-ri:global-line" aria-hidden="true" />
                {language.toUpperCase()}
                <span className="i-ri:arrow-down-wide-line" aria-hidden="true" />
              </button>
              <div id={`${id}-languages`} className={classes.languageMenu} hidden={!languageOpen}>
                {languages}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className={classes.mainBar}>
        <div className={classes.mainInner}>
          <div className={classes.logo}>{children}</div>
          <div className={classes.desktopBar}>
            {entries.map((entry, index) =>
              "href" in entry ? (
                <a
                  key={entry.href}
                  className={classes.barLink}
                  href={entry.href}
                  aria-current={entry.current ? "page" : undefined}
                  {...tracking(entry)}
                >
                  {entry.title}
                </a>
              ) : (
                <div key={entry.title}>
                  <button
                    type="button"
                    className={classes.barLink}
                    aria-expanded={submenu === index}
                    aria-controls={`${id}-desktop-${index}`}
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      setSubmenu(submenu === index ? null : index);
                      setLanguageOpen(false);
                    }}
                  >
                    {entry.title}
                    <span className="i-ri:arrow-down-wide-line" aria-hidden="true" />
                  </button>
                  <div
                    id={`${id}-desktop-${index}`}
                    className={classes.desktopMenu}
                    hidden={submenu !== index}
                    data-theme="day"
                  >
                    <MenuPanel group={entry} contact={secondaryCTA} />
                  </div>
                </div>
              ),
            )}
          </div>
          <div className={classes.actions} data-theme="day">
            <button
              type="button"
              className={classes.searchButton}
              aria-label={fr ? "Rechercher" : "Search"}
              title={fr ? "Rechercher" : "Search"}
              aria-haspopup="dialog"
              onClick={openSearch}
              data-navbar-search
            >
              <span className="i-ri:search-line" aria-hidden="true" />
            </button>
            {primaryCTA && (
              <CTA href={primaryCTA.href} location="header" name="nav-primary">
                {primaryCTA.label}
              </CTA>
            )}
            <button
              type="button"
              className={classes.menuButton}
              aria-label={
                fr
                  ? mobileOpen
                    ? "Fermer le menu"
                    : "Ouvrir le menu"
                  : mobileOpen
                    ? "Close menu"
                    : "Open menu"
              }
              aria-expanded={mobileOpen}
              aria-controls={`${id}-mobile`}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setMobileOpen(!mobileOpen);
                setSubmenu(null);
              }}
            >
              <span
                className={mobileOpen ? "i-ri:close-large-line" : "i-ri:menu-line"}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
      <div id={`${id}-mobile`} className={classes.mobileMenu} hidden={!mobileOpen} data-theme="day">
        {entries.map((entry, index) =>
          "href" in entry ? (
            <a
              key={entry.href}
              className={classes.mobileLink}
              href={entry.href}
              aria-current={entry.current ? "page" : undefined}
              {...tracking(entry)}
            >
              {entry.title}
            </a>
          ) : (
            <div key={entry.title}>
              <button
                type="button"
                className={classes.submenuLabel}
                aria-expanded={submenu === index}
                aria-controls={`${id}-mobile-${index}`}
                onClick={() => setSubmenu(submenu === index ? null : index)}
              >
                {entry.title}
                <span
                  className={
                    submenu === index ? "i-ri:arrow-up-wide-line" : "i-ri:arrow-down-wide-line"
                  }
                  aria-hidden="true"
                />
              </button>
              <div
                id={`${id}-mobile-${index}`}
                className={classes.mobileSubmenu}
                hidden={submenu !== index}
              >
                <MenuPanel group={entry} contact={secondaryCTA} />
              </div>
            </div>
          ),
        )}
        <div className={classes.mobileUtilities}>
          {utilities}
          {langs.length > 1 && (
            <div className={classes.mobileLanguages} aria-label={fr ? "Langues" : "Languages"}>
              {languages}
            </div>
          )}
        </div>
      </div>
      <SearchDialog
        open={searchOpen}
        language={language}
        initialSearch={search}
        onClose={closeSearch}
      />
    </nav>
  );
}
