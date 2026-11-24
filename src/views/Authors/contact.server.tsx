import { Island } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import { sanitizeHtml } from "../../contents/GlossaryEntry/sanitizeHtml.js";
import classes from "./component.module.css";
import { parseHubspotEmbed } from "./hubspotEmbed.js";
import HubspotLegacy from "./HubspotLegacy.client.jsx";

interface Props {
  content: string;
  editMode: boolean;
}

export function AuthorContact({ content, editMode }: Props) {
  const { t } = useTranslation();
  const html = sanitizeHtml(content);
  const hasText = Boolean(
    html.replace(/<[^>]+>|&nbsp;|&#160;/g, "").trim() || /<img\b/i.test(html),
  );
  const form = parseHubspotEmbed(content);
  const invalidEmbed =
    !form && /hbspt\.forms\.create|hs-form-frame|hsforms\.net\/forms\/embed/i.test(content);
  if (!hasText && !form && !(editMode && invalidEmbed)) return null;

  return (
    <section className={classes.biographySection} data-theme="day">
      <div className={classes.biographyGrid}>
        <div className={classes.biography + " _richtext"}>
          <h2>{t("authors.contact")}</h2>
          {hasText && <div dangerouslySetInnerHTML={{ __html: html }} />}
          {editMode ? (
            (form || invalidEmbed) && (
              <p>{t(form ? "authors.hubspotPreview" : "authors.hubspotInvalid")}</p>
            )
          ) : form?.format === "current" ? (
            <>
              <div
                className="hs-form-frame"
                data-region={form.region}
                data-portal-id={form.portalId}
                data-form-id={form.formId}
              />
              <script src={form.scriptUrl} defer />
            </>
          ) : (
            form && (
              <Island
                component={HubspotLegacy}
                props={{
                  portalId: form.portalId,
                  formId: form.formId,
                  region: form.region,
                  scriptUrl: form.scriptUrl,
                  errorMessage: t("authors.hubspotUnavailable"),
                }}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
