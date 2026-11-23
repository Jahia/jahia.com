import { buildNodeUrl, jahiaComponent, server } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import { CTA } from "../../../mixins/CTA/index.jsx";
import { Layout } from "../../../templates/Layout.jsx";
import { AuthorProfile } from "../../../views/Authors/profile.server.jsx";
import { AuthorDirectory } from "../../../views/Authors/directory.server.jsx";
import { AuthorPublications } from "../../../views/Authors/publications.server.jsx";
import { findAuthorFolder, authorDirectoryPage } from "../../../views/Authors/folder.server.js";
import { authorMetadata } from "../../../views/Authors/metadata.server.js";
import classes from "../../../views/Authors/component.module.css";

jahiaComponent(
  { componentType: "template", nodeType: "jahiacom:blogAuthor" },
  (_props, { currentNode, renderContext, currentResource }) => {
    const { t } = useTranslation();
    const depend = (node: typeof currentNode) =>
      server.render.addCacheDependency({ path: node.getPath() }, renderContext);
    const folder = findAuthorFolder(currentNode, depend);
    if (!folder) {
      const response = renderContext.getResponse() as unknown as {
        setStatus(status: number): void;
      };
      response.setStatus(404);
      return null;
    }
    depend(currentNode);
    const index = authorDirectoryPage(currentNode, depend);
    return (
      <Layout
        props={{
          "jcr:title": currentNode.getPropertyAsString("name"),
          "jcr:description": currentNode.getPropertyAsString("shortDescription"),
          "jsonLd": authorMetadata(currentNode),
        }}
        pageType="author_profile"
      >
        <AuthorProfile author={currentNode} biographyTitle={t("authors.biography")} />
        <AuthorPublications author={currentNode} />
        <AuthorDirectory
          sourceFolder={folder}
          excludedAuthor={currentNode.getIdentifier()}
          presentation="carousel"
          theme="cloudy"
          {...{ "jcr:title": t("authors.otherAuthors") }}
        />
        {index?.hasI18N(currentResource.getLocale()) && (
          <div className={classes.returnLink} data-theme="cloudy">
            <CTA
              href={buildNodeUrl(index)}
              secondary
              icon
              location="author_profile"
              name="directory"
            >
              {t("authors.allAuthors")}
            </CTA>
          </div>
        )}
      </Layout>
    );
  },
);
