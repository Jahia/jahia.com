import type { Locale } from "java.util";
import type { JCRNodeWrapper } from "org.jahia.services.content";

export const isExplicitlyUnpublished = (node: JCRNodeWrapper, locale: Locale) => {
  if (node.hasProperty("j:published") && !node.getProperty("j:published").getBoolean()) return true;
  if (!node.hasI18N(locale, false)) return false;
  const translation = node.getI18N(locale, false);
  // Missing markers on new drafts or legacy imports are not an explicit unpublication.
  return (
    translation.hasProperty("j:published") && !translation.getProperty("j:published").getBoolean()
  );
};

/** Keep unpublished resources editable, but remove their cards from previews. */
export const visibleInDirectory = (node: JCRNodeWrapper, locale: Locale, isEditMode: boolean) =>
  isEditMode || (node.hasI18N(locale, false) && !isExplicitlyUnpublished(node, locale));
