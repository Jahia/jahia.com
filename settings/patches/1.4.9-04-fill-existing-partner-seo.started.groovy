import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate
import javax.jcr.query.Query

String text(node, String key) {
    return node.hasProperty(key) ? node.getProperty(key).getString().trim() : ""
}
final def logger = log
JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, new JCRCallback<Object>() {
    Object doInJCR(JCRSessionWrapper session) {
        int partnersCount = 0
        int translationsCount = 0
        int updated = 0
        def nodes = session.getWorkspace().getQueryManager().createQuery(
            "SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('/sites')", Query.JCR_SQL2).execute().getNodes()
        while (nodes.hasNext()) {
            def partner = nodes.nextNode()
            // Limit this editorial operation to the known Jahia.com sites.
            if (!(partner.getPath().startsWith("/sites/mySite/") || partner.getPath().startsWith("/sites/jahiacom/"))) continue
            partnersCount++
            if (!partner.isNodeType("jmix:seoHtmlHead") && !partner.isNodeType("jahiacommix:partnerSeo")) partner.addMixin("jmix:seoHtmlHead")
            if (!partner.isNodeType("jahiacommix:seoOptions")) partner.addMixin("jahiacommix:seoOptions")
            if (!partner.isNodeType("jmix:description")) partner.addMixin("jmix:description")
            if (!partner.hasProperty("openGraphImage") && partner.hasProperty("logo")) {
                partner.setProperty("openGraphImage", partner.getProperty("logo").getValue())
                updated++
            }
            def children = partner.getNodes()
            while (children.hasNext()) {
                def tr = children.nextNode()
                if (!tr.isNodeType("jnt:translation")) continue
                translationsCount++
                String name = text(tr, "jcr:title") ?: text(partner, "jcr:title")
                String desc = text(tr, "jcr:description")
                if (!desc) {
                    desc = text(tr, "seoDescription") ?: text(tr, "shortDescription")
                    if (desc) { tr.setProperty("jcr:description", desc); updated++ }
                }
                if (name && !text(tr, "htmlTitle")) { tr.setProperty("htmlTitle", name); updated++ }
                logger.info("Partner SEO checked: " + tr.getPath() + "; description=" + Boolean.valueOf(desc != "") + "; title=" + Boolean.valueOf(name != ""))
            }
        }
        session.save()
        logger.info("Partner SEO complete: partners=" + partnersCount + ", translations=" + translationsCount + ", fields=" + updated)
        return null
    }
})
