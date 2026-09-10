import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.Node
import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.query.Query

final def logger = log

boolean hasTextProperty(JCRNodeWrapper node, String name) throws RepositoryException {
    return node.hasProperty(name) && node.getProperty(name).getString()?.trim()
}

boolean hasValues(JCRNodeWrapper node, String name) throws RepositoryException {
    if (!node.hasProperty(name)) return false
    if (!node.getProperty(name).isMultiple()) return node.getProperty(name).getString()?.trim()
    return node.getProperty(name).getValues().any { it.getString()?.trim() }
}

void collectLegacyBodies(Node node, String language, List<String> bodies) throws RepositoryException {
    if (node.getName() == "j:translation_${language}" && node.hasProperty("body")) {
        String body = node.getProperty("body").getString()?.trim()
        if (body && !bodies.contains(body)) bodies.add(body)
    }
    NodeIterator children = node.getNodes()
    while (children.hasNext()) collectLegacyBodies(children.nextNode(), language, bodies)
}

for (String workspace : [Constants.EDIT_WORKSPACE, Constants.LIVE_WORKSPACE]) {
    JCRTemplate.getInstance().doExecuteWithSystemSession(null, workspace, new JCRCallback<Object>() {
        @Override
        Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
            int restored = 0
            int preserved = 0
            int withoutSource = 0

            for (String siteName : ["jahiacom", "mySite"]) {
                String partnerRootPath = "/sites/${siteName}/contents/technology-partners"
                if (!session.nodeExists(partnerRootPath)) continue

                NodeIterator partners = session.getWorkspace().getQueryManager().createQuery(
                        "SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('${partnerRootPath}')",
                        Query.JCR_SQL2).execute().getNodes()

                while (partners.hasNext()) {
                    JCRNodeWrapper partner = (JCRNodeWrapper) partners.nextNode()
                    if (partner.hasProperty("partnerType") && partner.getProperty("partnerType").getString() != "technology") {
                        continue
                    }

                    String legacyPath = "/sites/${siteName}/home/product/features/integrations/${partner.getName()}"
                    if (!session.nodeExists(legacyPath)) {
                        withoutSource++
                        continue
                    }

                    JCRNodeWrapper legacyPage = (JCRNodeWrapper) session.getNode(legacyPath)
                    for (String language : ["en", "fr"]) {
                        String translationName = "j:translation_${language}"
                        if (!partner.hasNode(translationName)) continue
                        JCRNodeWrapper translation = (JCRNodeWrapper) partner.getNode(translationName)

                        // Never duplicate or overwrite richer content already maintained by editors.
                        if (hasTextProperty(translation, "technologyDetails") ||
                                hasTextProperty(translation, "expertiseText") ||
                                hasValues(translation, "expertise") ||
                                hasTextProperty(translation, "partnership")) {
                            preserved++
                            continue
                        }

                        List<String> bodies = []
                        collectLegacyBodies(legacyPage, language, bodies)
                        if (bodies) {
                            translation.setProperty("technologyDetails", bodies.join("\n"))
                            restored++
                        }
                    }
                }
            }

            session.save()
            logger.info("Technology Partner content restoration completed in {}: {} translations restored, {} preserved, {} partners without a legacy page",
                    workspace, restored, preserved, withoutSource)
            return null
        }
    })
}
