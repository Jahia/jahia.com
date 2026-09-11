import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.query.Query

final def logger = log

String escapeHtml(String text) {
    return text.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;")
}

String textProperty(JCRNodeWrapper node, String name) {
    return node.hasProperty(name) ? node.getProperty(name).getString() : ""
}

JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                int migrated = 0
                NodeIterator partners = session.getWorkspace().getQueryManager().createQuery(
                        "SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('/sites')",
                        Query.JCR_SQL2).execute().getNodes()
                while (partners.hasNext()) {
                    JCRNodeWrapper partner = (JCRNodeWrapper) partners.nextNode()
                    NodeIterator children = partner.getNodes()
                    while (children.hasNext()) {
                        JCRNodeWrapper translation = (JCRNodeWrapper) children.nextNode()
                        if (!translation.isNodeType("jnt:translation") ||
                                translation.hasProperty("expertiseBody")) continue

                        List<String> items = textProperty(translation, "expertiseText")
                                .split(/\r?\n/).toList()
                        if (translation.hasProperty("expertise")) {
                            items.addAll(translation.getProperty("expertise").getValues()
                                    .collect { value -> value.getString() })
                        }
                        items = items.collect { item -> item.trim() }.findAll { item -> item }.unique()
                        String list = items.isEmpty() ? "" : "<ul>" + items.collect {
                            item -> "<li>${escapeHtml(item)}</li>"
                        }.join("") + "</ul>"
                        String details = textProperty(translation, "technologyDetails")
                        String body = [list, details].findAll { value -> value }.join("\n")
                        translation.setProperty("expertiseBody", body)
                        migrated++
                    }
                }
                session.save()
                logger.info("Partner expertise unified in {} translations in edit; legacy values preserved, no publication performed", migrated)
                return null
            }
        })
