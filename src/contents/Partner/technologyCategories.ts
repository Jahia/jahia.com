import type { JCRNodeWrapper } from "org.jahia.services.content";
import { referencedCategories } from "../../utils/contentCategories.js";

// This taxonomy is created by the Partner directory migration. Format and page
// categories (e.g. Integration and partner_page) belong to separate dimensions.
const technologyRoot = "/sites/systemsite/categories/technology-partners/";

export const technologyCategories = (partner: JCRNodeWrapper): JCRNodeWrapper[] =>
  referencedCategories(partner).filter((category) => category.getPath().startsWith(technologyRoot));
