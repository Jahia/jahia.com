import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.Value
import javax.jcr.query.Query

final def logger = log

void copyLocalizedProperty(JCRNodeWrapper source, JCRNodeWrapper target, String sourceName,
                           String targetName) throws RepositoryException {
    if (!source.hasProperty(sourceName)) return
    if (source.getProperty(sourceName).isMultiple()) {
        target.setProperty(targetName, source.getProperty(sourceName).getValues())
    } else {
        target.setProperty(targetName, source.getProperty(sourceName).getValue())
    }
}

for (String workspace : [Constants.EDIT_WORKSPACE, Constants.LIVE_WORKSPACE]) {
    JCRTemplate.getInstance().doExecuteWithSystemSession(null, workspace, new JCRCallback<Object>() {
        @Override
        Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
            int enriched = 0
            int withoutLegacyPage = 0

            for (String siteName : ["jahiacom", "mySite"]) {
                String partnerRootPath = "/sites/${siteName}/contents/technology-partners"
                if (!session.nodeExists(partnerRootPath)) continue

                NodeIterator partners = session.getWorkspace().getQueryManager().createQuery(
                        "SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('${partnerRootPath}')",
                        Query.JCR_SQL2).execute().getNodes()

                while (partners.hasNext()) {
                    JCRNodeWrapper partner = (JCRNodeWrapper) partners.nextNode()
                    if (!partner.isNodeType("jahiacommix:partnerSeo")) {
                        partner.addMixin("jahiacommix:partnerSeo")
                    }
                    if (!partner.isNodeType("jmix:categorized")) {
                        partner.addMixin("jmix:categorized")
                    }

                    String legacyPath = "/sites/${siteName}/home/product/features/integrations/${partner.getName()}"
                    if (!session.nodeExists(legacyPath)) {
                        withoutLegacyPage++
                        continue
                    }

                    JCRNodeWrapper legacyPage = (JCRNodeWrapper) session.getNode(legacyPath)
                    if (legacyPage.hasProperty("j:defaultCategory")) {
                        Map<String, Value> categories = [:]
                        if (partner.hasProperty("j:defaultCategory")) {
                            partner.getProperty("j:defaultCategory").getValues().each { Value value ->
                                categories[value.getString()] = value
                            }
                        }
                        legacyPage.getProperty("j:defaultCategory").getValues().each { Value value ->
                            categories[value.getString()] = value
                        }
                        partner.setProperty("j:defaultCategory", categories.values() as Value[])
                    }
                    copyLocalizedProperty(legacyPage, partner, "openGraphImage", "openGraphImage")

                    for (String language : ["en", "fr"]) {
                        String translationName = "j:translation_${language}"
                        if (!legacyPage.hasNode(translationName) || !partner.hasNode(translationName)) continue
                        JCRNodeWrapper sourceTranslation = (JCRNodeWrapper) legacyPage.getNode(translationName)
                        JCRNodeWrapper targetTranslation = (JCRNodeWrapper) partner.getNode(translationName)
                        copyLocalizedProperty(sourceTranslation, targetTranslation, "htmlTitle", "htmlTitle")
                        copyLocalizedProperty(sourceTranslation, targetTranslation, "jcr:description", "seoDescription")
                        copyLocalizedProperty(sourceTranslation, targetTranslation, "seoKeywords", "seoKeywords")
                        copyLocalizedProperty(sourceTranslation, targetTranslation, "jsonLd", "jsonLd")
                    }
                    enriched++
                }
            }

            session.save()
            logger.info("Technology Partner metadata migration completed in {}: {} enriched, {} without a matching legacy page",
                    workspace, enriched, withoutLegacyPage)
            return null
        }
    })
}
