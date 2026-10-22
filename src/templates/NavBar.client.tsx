import {
  Fragment,
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
import type {
  Entry,
  Group,
  NavbarButton,
  Page,
  UtilityControls,
  UtilityEntry,
} from "./NavBar.types.js";

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
              className={classes.highlight}
              data-variant="secondary"
              href={entry.href}
              aria-current={entry.current ? "page" : undefined}
              {...tracking(entry)}
            >
              {entry.icon && (
                <img className={classes.itemIcon} src={entry.icon} alt="" width={24} height={24} />
              )}
              <span className={classes.itemTitle}>{entry.title}</span>
            </a>
          ) : (
            <MenuLinks entries={entry.children} />
          )}
        </li>
      ))}
    </ul>
  );
}
function MenuPanel({ group }: { group: Group }) {
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
      <div className={classes.panelLayout} data-feature={!!feature}>
        <div className={classes.panelNavigation}>
          <MenuLinks entries={entries} />
        </div>
        {feature && (
          <div className={classes.panelFeature}>
            {feature.eyebrow && <p className={classes.eyebrow}>{feature.eyebrow}</p>}
            <p className={classes.panelHeading}>{feature.heading}</p>
            {feature.text && <p className={classes.panelText}>{feature.text}</p>}
            <div className={classes.panelAction} data-theme="night">
              <CTA
                secondary
                href={feature.link.href}
                location="header"
                name="nav-feature"
                aria-label={`${feature.link.title} : ${feature.heading}`}
              >
                {feature.link.title}
              </CTA>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function NavBarClient({
  buttons = [],
  children,
  entries,
  utilityEntries = [],
  controls,
  rss,
  langs,
  language,
  search,
}: {
  buttons?: NavbarButton[];
  children: ReactNode;
  entries: Entry[];
  utilityEntries?: UtilityEntry[];
  controls: UtilityControls;
  rss?: { href?: string; label: string; pendingLabel: string; image?: string } | false;
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
    const updateOpacity = () => {
      if (header) header.dataset.scrolled = String(window.scrollY > 0);
    };
    updateOpacity();
    window.addEventListener("scroll", updateOpacity, { passive: true });
    let desktopMode: boolean | undefined;
    const updateHeight = () => {
      const menuButton = element.querySelector<HTMLElement>(`.${classes.menuButton}`);
      const desktop = menuButton ? getComputedStyle(menuButton).display === "none" : false;
      if (desktopMode !== undefined && desktopMode !== desktop) close();
      desktopMode = desktop;
      if (header)
        document.documentElement.style.setProperty(
          "--jahia-header-height",
          `${header.getBoundingClientRect().height}px`,
        );
    };
    const observer = new ResizeObserver(updateHeight);
    if (header) observer.observe(header);
    observer.observe(element);
    updateHeight();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateOpacity);
      if (header) delete header.dataset.scrolled;
      document.documentElement.style.removeProperty("--jahia-header-height");
    };
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !nav.current?.contains(event.target)) close();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (
        controls.searchVisible &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
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
  }, [mobileOpen, submenu, languageOpen, searchOpen, controls.searchVisible]);
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
  const utilityLink = (entry: Page) => (
    <a
      className={classes.utilityLink}
      href={entry.href}
      aria-current={entry.current ? "page" : undefined}
      {...tracking(entry)}
    >
      {entry.title}
    </a>
  );
  const rssIcon =
    rss && rss.image ? (
      <img src={rss.image} alt="" width="20" height="20" />
    ) : (
      <span className="i-ri:rss-line" aria-hidden="true" />
    );
  const rssControl =
    rss &&
    (rss.href ? (
      <a
        className={`${classes.utilityLink} ${classes.rssIcon}`}
        href={rss.href}
        aria-label={rss.label}
        title={rss.label}
      >
        {rssIcon}
      </a>
    ) : (
      <span
        className={`${classes.utilityLink} ${classes.rssIcon}`}
        role="img"
        aria-label={rss.pendingLabel}
        title={rss.pendingLabel}
      >
        {rssIcon}
      </span>
    ));
  const searchButton = (utility = false) => (
    <button
      type="button"
      className={utility ? classes.utilityLink : `${classes.searchButton} ${classes.highlight}`}
      data-variant={utility ? undefined : "secondary"}
      aria-label={controls.searchLabel}
      title={controls.searchLabel}
      aria-haspopup="dialog"
      onClick={openSearch}
      data-navbar-search
    >
      <span className="i-ri:search-line" aria-hidden="true" />
      {utility && controls.searchLabel}
    </button>
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
  const desktopLanguages = (
    <>
      {controls.languagesVisible && langs.length > 1 && (
        <div className={classes.languageControl}>
          <button
            type="button"
            className={classes.utilityLink}
            aria-label={controls.languagesLabel}
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
    </>
  );
  // Old instances without mixed items keep the existing tools after their links.
  const orderedUtilities: UtilityEntry[] = utilityEntries.some((entry) => "kind" in entry)
    ? utilityEntries
    : [...utilityEntries, { kind: "rss" }, { kind: "search" }, { kind: "languages" }];
  const utilities = (mobile = false) =>
    orderedUtilities.map((entry) => {
      let control: ReactNode;
      if ("href" in entry) control = utilityLink(entry);
      else if (entry.kind === "rss") control = rssControl;
      else if (entry.kind === "search") control = controls.searchVisible && searchButton(true);
      else
        control = mobile
          ? controls.languagesVisible &&
            langs.length > 1 && (
              <div className={classes.mobileLanguages} aria-label={controls.languagesLabel}>
                {languages}
              </div>
            )
          : desktopLanguages;
      return <Fragment key={"href" in entry ? entry.href : entry.kind}>{control}</Fragment>;
    });
  function navbarButton(button: NavbarButton) {
    return (
      <CTA
        key={button.id}
        secondary={button.style === "secondary"}
        icon={button.id === "contact"}
        href={button.href}
        location="header"
        name={button.id === "contact" ? "nav-secondary" : "nav-primary"}
      >
        {button.label}
      </CTA>
    );
  }
  return (
    <nav
      ref={nav}
      className={classes.nav}
      data-theme="day"
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
      <div
        className={classes.utilityBar}
        hidden={
          !buttons.some((button) => button.placement === "upper") &&
          !utilityEntries.some((entry) => "href" in entry) &&
          !rss &&
          !controls.searchVisible &&
          !(controls.languagesVisible && langs.length > 1)
        }
      >
        <div className={classes.utilityInner}>
          {utilities()}
          <div className={classes.upperButtons} data-theme="night">
            {buttons.filter((button) => button.placement === "upper").map(navbarButton)}
          </div>
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
                  className={`${classes.barLink} ${classes.highlight}`}
                  data-variant="secondary"
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
                    className={`${classes.barLink} ${classes.highlight}`}
                    data-variant="secondary"
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
                    <MenuPanel group={entry} />
                  </div>
                </div>
              ),
            )}
          </div>
          <div className={classes.actions} data-theme="day">
            {controls.searchVisible && !mobileOpen && (
              <div className={classes.mobileSearch}>{searchButton()}</div>
            )}
            {buttons
              .filter((button) => button.placement === "main")
              .map((button) =>
                button.id === "contact" ? (
                  <div key={button.id} className={classes.desktopContact}>
                    {navbarButton(button)}
                  </div>
                ) : (
                  navbarButton(button)
                ),
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
              className={`${classes.mobileLink} ${classes.highlight}`}
              data-variant="secondary"
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
                className={`${classes.submenuLabel} ${classes.highlight}`}
                data-variant="secondary"
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
                <MenuPanel group={entry} />
              </div>
            </div>
          ),
        )}
        <div className={classes.mobileUtilities}>
          {buttons
            .filter((button) => button.placement === "upper" || button.id === "contact")
            .map(navbarButton)}
          {utilities(true)}
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
