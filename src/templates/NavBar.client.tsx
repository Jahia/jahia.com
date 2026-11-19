import type { UpperBarPreview } from "./navigationEditorPreview.js";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import classes from "./NavBar.module.css";
import { createHoverIntent } from "./hoverIntent.js";
import { automaticNavigationColumns } from "./automaticNavigationColumns.js";
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

const flagStyles = new Map([
  ["fr", classes.frenchFlag],
  ["en", classes.englishFlag],
]);

const LanguageFlag = ({ language }: { language: string }) => {
  const flag = flagStyles.get(language);
  return flag ? <span className={`${classes.languageFlag} ${flag}`} aria-hidden="true" /> : null;
};

const NavigationLabel = ({ entry, showIcon }: { entry: Entry; showIcon: boolean }) => (
  <span className={classes.entryLabel} data-weight={entry.weight}>
    {showIcon && entry.icon && (
      <img className={classes.itemIcon} src={entry.icon} alt="" width={24} height={24} />
    )}
    <span>{entry.title}</span>
  </span>
);

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
  if (group.panel?.automatic) return <AutomaticPanel group={group} />;
  const feature = group.panel?.feature;
  const landing = group.panel?.landing;
  const visibleColumns = group.panel?.columns
    ?.map((column) => ({
      ...column,
      children: column.children.filter(
        (entry) => !("href" in entry) || entry.href !== landing?.href,
      ),
    }))
    .filter((column) => column.children.length);
  const columns = visibleColumns?.length ? visibleColumns : undefined;
  // Keep existing menu destinations accessible even when optional columns are configured.
  const selected = new Set(
    columns?.flatMap((column) =>
      column.children.flatMap((entry) => ("href" in entry ? [entry.href] : [])),
    ),
  );
  if (landing) selected.add(landing.href);
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
    : remaining;
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
function AutomaticLinks({ entries }: { entries: Page[] }) {
  return (
    <ul className={classes.automaticLinks}>
      {entries.map((entry, index) => (
        <li
          key={entry.id || entry.href}
          data-depth={entry.depth || 0}
          data-weight={entry.weight}
          data-parent={(entries[index + 1]?.depth || 0) > (entry.depth || 0) || undefined}
          data-branch-start={
            (index > 0 && entry.branchId !== entries[index - 1].branchId) || undefined
          }
        >
          <a
            href={entry.href}
            aria-current={entry.current ? "page" : undefined}
            {...tracking(entry)}
          >
            {entry.icon && (
              <img className={classes.itemIcon} src={entry.icon} alt="" width={24} height={24} />
            )}
            <span>{entry.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
function AutomaticPanel({ group }: { group: Group }) {
  const landing = group.panel?.landing;
  const feature = group.panel?.feature;
  const columns = automaticNavigationColumns(
    group.children,
    group.panel?.branchColumns,
    group.panel?.treeColumns,
    group.panel?.branchOrder,
    group.panel?.childOrder,
  );
  return (
    <div className={classes.automaticPanel} data-layout="classic">
      {landing && (
        <a
          className={classes.discoverLink}
          href={landing.href}
          aria-current={landing.current ? "page" : undefined}
          {...tracking(landing)}
        >
          {landing.title}
        </a>
      )}
      <div className={classes.panelLayout} data-feature={!!feature}>
        <div className={classes.automaticColumns} data-count={columns.length}>
          {columns.map((column, index) => (
            <AutomaticLinks key={`column-slot-${index + 1}`} entries={column} />
          ))}
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
const destinationOf = (group: Group) =>
  group.panel?.automatic ? undefined : group.destination || group.panel?.landing;
export default function NavBarClient({
  automatic: initialAutomatic = false,
  buttons: initialButtons = [],
  logo,
  entries: initialEntries,
  editorPreviewSite,
  utilityEntries: initialUtilityEntries = [],
  controls: initialControls,
  rss: initialRss,

  langs,
  language,
  search,
}: {
  automatic?: boolean;
  editorPreviewSite?: string;
  buttons?: NavbarButton[];
  logo: { href: string; src: string; current: boolean };
  entries: Entry[];
  utilityEntries?: UtilityEntry[];
  controls: UtilityControls;
  rss?: { href?: string; label: string; pendingLabel: string; image?: string } | false;
  langs: Array<{ language: string; name: string; href: string }>;
  language: string;
  search: SearchState;
}) {
  const [editorPreview, setEditorPreview] = useState<{
    entries: Entry[];
    upper?: UpperBarPreview;
  } | null>(null);
  const entries = editorPreview?.entries || initialEntries;
  const buttons = editorPreview?.upper?.buttons || initialButtons;
  const utilityEntries = editorPreview?.upper?.utilityEntries || initialUtilityEntries;
  const controls = editorPreview?.upper?.controls || initialControls;
  const rss = editorPreview?.upper ? editorPreview.upper.rss : initialRss;
  const automatic = editorPreview ? true : initialAutomatic;
  const id = useId();
  const nav = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const mobileMenuTrigger = useRef<HTMLButtonElement>(null);
  const pendingSubmenuFocus = useRef<{ index: number; panel: HTMLElement } | null>(null);

  const searchTrigger = useRef<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [submenu, setSubmenu] = useState<number | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(search.requested);
  const fr = language === "fr";

  const hoverIntent = useMemo(
    () =>
      createHoverIntent((index) => {
        setSubmenu(index);
        if (index !== null) setLanguageOpen(false);
      }),
    [],
  );
  useEffect(() => () => hoverIntent.cancel(), [hoverIntent]);
  const hoverMenu = (event: ReactPointerEvent<HTMLDivElement>, index: number | null) => {
    if (
      event.pointerType !== "mouse" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    )
      return;
    const menuButton = nav.current?.querySelector<HTMLElement>(`.${classes.menuButton}`);
    if (!menuButton || getComputedStyle(menuButton).display !== "none") return;
    hoverIntent.cancel();
    const panel = event.currentTarget.querySelector<HTMLElement>(`.${classes.desktopMenu}`);
    // A keyboard user keeps the focused menu until focus moves out or Escape is pressed.
    if (index === null && panel?.contains(document.activeElement)) return;
    if (index !== null)
      trigger.current = event.currentTarget.querySelector<HTMLElement>("a, button");
    hoverIntent.schedule(index, submenu !== null && submenu !== index);
  };
  const enterSubmenu = (event: ReactKeyboardEvent<HTMLElement>, index: number) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    hoverIntent.cancel();
    trigger.current = event.currentTarget;
    const panel = event.currentTarget.parentElement?.querySelector<HTMLElement>(
      `.${classes.desktopMenu}`,
    );
    if (panel) {
      if (!panel.hidden) panel.querySelector<HTMLElement>("a, button")?.focus();
      else pendingSubmenuFocus.current = { index, panel };
    }
    setSubmenu(index);
    setLanguageOpen(false);
  };
  useEffect(() => {
    const pending = pendingSubmenuFocus.current;
    if (pending && pending.index === submenu) {
      pendingSubmenuFocus.current = null;
      pending.panel.querySelector<HTMLElement>("a, button")?.focus();
    }
  }, [submenu]);
  const close = () => {
    pendingSubmenuFocus.current = null;

    hoverIntent.cancel();
    setMobileOpen(false);
    setSubmenu(null);
    setLanguageOpen(false);
  };
  useEffect(() => {
    const token = new URL(location.href).searchParams.get("navigationPreview");
    if (!editorPreviewSite || window.parent === window || !token || !/^[\w-]{16,100}$/.test(token))
      return;
    try {
      if (
        window.parent.location.origin !== location.origin ||
        !window.parent.location.pathname.endsWith("/apps/jahiacom-navigation")
      )
        return;
    } catch {
      return;
    }
    const send = (type: string, error?: string) =>
      window.parent.postMessage({ type, token, error }, location.origin);
    let active = true;
    const receive = async (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.origin !== location.origin ||
        event.data?.type !== "jahiacom-navigation-preview" ||
        event.data.token !== token ||
        event.data.site !== editorPreviewSite ||
        event.data.language !== language
      )
        return;
      try {
        const { navigationEditorPreview, upperBarEditorPreview } =
          await import("./navigationEditorPreview.js");
        if (!active) return;
        const draft = navigationEditorPreview(
          event.data.sections,
          event.data.settings,
          editorPreviewSite,
          language === "fr" ? "fr" : "en",
          event.data.context || "",
          event.data.imageUrls || {},
          event.data.references || [],
        );
        const upper = upperBarEditorPreview(
          event.data.sections,
          event.data.settings,
          editorPreviewSite,
          language === "fr" ? "fr" : "en",
          event.data.context || "",
          event.data.imageUrls || {},
          event.data.references || [],
        );
        setEditorPreview({ entries: draft, upper });
        const index = draft.findIndex(
          (entry) => entry.id === event.data.selected && !("href" in entry),
        );
        setSubmenu(index < 0 ? null : index);
        setMobileOpen(innerWidth < 1200);
        send("jahiacom-navigation-preview-applied");
      } catch {
        send("jahiacom-navigation-preview-error");
      }
    };
    const style = document.createElement("style");
    style.textContent =
      "body > :not([data-jahia-header]){display:none} [data-jahia-header]{position:relative;top:auto} [data-jahia-header] > :not(:has(nav[data-automatic])):not(nav[data-automatic]){display:none}";
    document.head.append(style);
    const preventNavigation = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener("click", preventNavigation, true);
    window.addEventListener("message", receive);
    send("jahiacom-navigation-preview-ready");
    return () => {
      active = false;
      style.remove();
      window.removeEventListener("message", receive);
      document.removeEventListener("click", preventNavigation, true);
    };
  }, [editorPreviewSite, language]);
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
      if (event.key === "Escape") hoverIntent.cancel();
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
        const returnFocus = mobileOpen ? mobileMenuTrigger.current : trigger.current;
        close();
        returnFocus?.focus();
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
  const currentFlag =
    flagStyles.has(language) && langs.some((entry) => entry.language === language);
  const languages = langs.map(({ name, href, language: code }) => (
    <a
      key={code}
      href={href}
      hrefLang={code}
      lang={code}
      aria-current={code === language ? "true" : undefined}
    >
      <LanguageFlag language={code} />

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
            aria-label={`${language.toUpperCase()} · ${controls.languagesLabel}`}
            aria-expanded={languageOpen}
            aria-controls={`${id}-languages`}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setLanguageOpen(!languageOpen);
              setSubmenu(null);
            }}
          >
            {currentFlag ? (
              <LanguageFlag language={language} />
            ) : (
              <span className="i-ri:global-line" aria-hidden="true" />
            )}
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
      data-automatic={automatic}
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
          <div className={classes.logo}>
            <a
              href={logo.href}
              aria-current={logo.current ? "page" : undefined}
              data-element-url={logo.href}
              data-element-type="image"
              data-element-text="Jahia Logo"
              data-element-location="header"
              data-element-name="nav/logo"
            >
              <img src={logo.src} alt="Jahia" width="70" height="32" />
            </a>
          </div>
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
                  <NavigationLabel entry={entry} showIcon={automatic} />
                </a>
              ) : (
                <div
                  key={entry.title}
                  className={classes.group}
                  onPointerEnter={(event) => hoverMenu(event, index)}
                  onPointerLeave={(event) => hoverMenu(event, null)}
                  onPointerDown={() => hoverIntent.cancel()}
                >
                  {entry.panel?.automatic ? (
                    <button
                      type="button"
                      className={`${classes.barLink} ${classes.highlight}`}
                      data-variant="secondary"
                      aria-expanded={submenu === index}
                      aria-controls={`${id}-desktop-${index}`}
                      onKeyDown={(event) => enterSubmenu(event, index)}
                      onClick={(event) => {
                        trigger.current = event.currentTarget;
                        hoverIntent.cancel();
                        setSubmenu(submenu === index ? null : index);
                        setLanguageOpen(false);
                      }}
                    >
                      <NavigationLabel entry={entry} showIcon={automatic} />
                      <span className="i-ri:arrow-down-wide-line" aria-hidden="true" />
                    </button>
                  ) : entry.panel?.landing ? (
                    <a
                      className={`${classes.barLink} ${classes.highlight}`}
                      data-variant="secondary"
                      href={entry.panel.landing.href}
                      aria-current={entry.panel.landing.current ? "page" : undefined}
                      aria-expanded={submenu === index}
                      aria-controls={`${id}-desktop-${index}`}
                      {...tracking(entry.panel.landing)}
                      onClick={() => hoverIntent.cancel()}
                      onKeyDown={(event) => enterSubmenu(event, index)}
                    >
                      <NavigationLabel entry={entry} showIcon={automatic} />

                      <span className="i-ri:arrow-down-wide-line" aria-hidden="true" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className={`${classes.barLink} ${classes.highlight}`}
                      data-variant="secondary"
                      aria-expanded={submenu === index}
                      aria-controls={`${id}-desktop-${index}`}
                      onKeyDown={(event) => enterSubmenu(event, index)}
                      onClick={(event) => {
                        trigger.current = event.currentTarget;
                        hoverIntent.cancel();
                        setSubmenu(submenu === index ? null : index);
                        setLanguageOpen(false);
                      }}
                    >
                      <NavigationLabel entry={entry} showIcon={automatic} />

                      <span className="i-ri:arrow-down-wide-line" aria-hidden="true" />
                    </button>
                  )}
                  <div
                    id={`${id}-desktop-${index}`}
                    className={classes.desktopMenu}
                    data-columns={entry.panel?.automatic ? entry.panel.treeColumns : undefined}
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
              ref={mobileMenuTrigger}
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
              <NavigationLabel entry={entry} showIcon={automatic} />
            </a>
          ) : (
            <div key={entry.title}>
              <div className={classes.mobileGroup}>
                {destinationOf(entry) && (
                  <a
                    className={`${classes.mobileLink} ${classes.highlight}`}
                    data-variant="secondary"
                    href={destinationOf(entry)!.href}
                    aria-current={destinationOf(entry)!.current ? "page" : undefined}
                    {...tracking(destinationOf(entry)!)}
                  >
                    <NavigationLabel entry={entry} showIcon={automatic} />
                  </a>
                )}
                <button
                  type="button"
                  className={`${classes.submenuLabel} ${classes.highlight} ${destinationOf(entry) ? classes.mobileGroupToggle : ""}`}
                  aria-label={
                    destinationOf(entry)
                      ? `${fr ? "Sous-menu" : "Submenu"} ${entry.title}`
                      : undefined
                  }
                  data-variant="secondary"
                  aria-expanded={submenu === index}
                  aria-controls={`${id}-mobile-${index}`}
                  onClick={(event) => {
                    trigger.current = event.currentTarget;
                    hoverIntent.cancel();
                    setSubmenu(submenu === index ? null : index);
                  }}
                >
                  {!destinationOf(entry) && <NavigationLabel entry={entry} showIcon={automatic} />}

                  <span
                    className={
                      submenu === index ? "i-ri:arrow-up-wide-line" : "i-ri:arrow-down-wide-line"
                    }
                    aria-hidden="true"
                  />
                </button>
              </div>
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
