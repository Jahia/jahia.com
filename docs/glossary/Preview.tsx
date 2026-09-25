/** Standalone review only. In Jahia, the Basic template supplies the real site Layout. */
import NavBar from "../../src/templates/NavBar.client";
import Glossary from "../../src/views/Glossary/Glossary.client";
import Entry from "../../src/contents/GlossaryEntry/Entry";
import layout from "../../src/templates/Layout.module.css";
import breadcrumb from "../../src/templates/Breadcrumb.module.css";
import footer from "../../src/templates/footer.module.css";
import theme from "../../src/theme/theme.module.css";
import cta from "../../src/mixins/CTA/component.module.css";
import logo from "../../src/templates/jahia-light.svg";
import navigation from "./navigation-preview.json";
import footerSnapshot from "./footer-preview.json";
import data from "./wave1.json";

// Public footer content, captured for this preview. Resolve its styles from the
// current module instead of retaining production's generated CSS class names.
const footerClasses = { ...theme, ...cta, ...footer };
const footerHtml = footerSnapshot.html.replace(
  /class="([^"]*)"/g,
  (_, value: string) =>
    `class="${value
      .split(" ")
      .map((name) => {
        const key = name.match(/^_(.+)_[a-f0-9]+$/)?.[1];
        return key && key in footerClasses ? footerClasses[key] : name;
      })
      .join(" ")}"`,
);

export default function Preview({ pathname = "/glossary/" }: { pathname?: string }) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const isIndex = normalized === "/" || normalized === "/glossary";
  const entry = data.entries.find((term) => term.url.replace(/\/$/, "") === normalized);
  return (
    <>
      <a href="#main-content" className={layout.skipLink}>
        Skip to content
      </a>
      <div className={layout.stickyHeader} data-theme="night">
        <NavBar {...navigation}>
          <a href="https://www.jahia.com/en">
            <img src={logo} alt="Jahia" width="90" height="40" />
          </a>
        </NavBar>
        <nav className={breadcrumb.breadcrumb} aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="https://www.jahia.com/en">Home</a>
            </li>
            {isIndex ? (
              <li aria-current="page">Glossary</li>
            ) : (
              <>
                <li>
                  <a href="/glossary/">Glossary</a>
                </li>
                <li aria-current="page">{entry?.title || "Page not found"}</li>
              </>
            )}
          </ol>
        </nav>
      </div>
      <main id="main-content" tabIndex={-1}>
        {isIndex ? (
          <Glossary {...data} />
        ) : entry ? (
          <Entry
            {...entry}
            indexUrl="/glossary/"
            relatedTerms={data.entries.filter((term) => entry.relatedIds.includes(term.id))}
          />
        ) : (
          <section className={theme.container}>
            <h1>Page not found</h1>
            <p>This glossary entry does not exist.</p>
            <a href="/glossary/">Back to glossary</a>
          </section>
        )}
      </main>
      <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
    </>
  );
}
