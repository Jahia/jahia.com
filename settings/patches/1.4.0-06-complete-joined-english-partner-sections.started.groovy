import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException

final def logger = log
final String redAlphaDescription = "Red Alpha was founded in 2010, describing itself as having started as a small family of software engineers. It is headquartered in Columbia, Maryland, with a secondary presence in Annapolis Junction, Maryland. It is a privately owned small business and is SBA 8(a) certified."
final String scaleflexPartnership = "The ready-to-use Cloudimage integration automatically converts and optimizes images served by Jahia (PNG/JPEG to WebP) and delivers them through a multi-CDN, with no code changes or complex configuration. Developers can add srcset tags for responsive resizing, and the service also handles automated editing, watermarking and cutouts, cutting page-load times."

String partnerSiteRoot(JCRSessionWrapper session) throws RepositoryException {
    for (String siteName : ["jahiacom", "mySite"]) {
        String path = "/sites/${siteName}"
        if (session.nodeExists("${path}/contents/solution-partners") &&
                session.nodeExists("${path}/contents/technology-partners")) return path
    }
    if (!session.nodeExists("/sites")) return null
    NodeIterator sites = session.getNode("/sites").getNodes()
    while (sites.hasNext()) {
        String path = sites.nextNode().getPath()
        if (session.nodeExists("${path}/contents/solution-partners") &&
                session.nodeExists("${path}/contents/technology-partners")) return path
    }
    return null
}

String escapeHtml(String value) {
    return value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
}

String paragraph(String value) {
    return value ? "<p>${escapeHtml(value.replaceAll(/\s+/, " ").trim())}</p>" : ""
}

JCRNodeWrapper englishTranslation(JCRNodeWrapper node) throws RepositoryException {
    String name = "j:translation_en"
    if (node.hasNode(name)) return (JCRNodeWrapper) node.getNode(name)
    JCRNodeWrapper translation = (JCRNodeWrapper) node.addNode(name, "jnt:translation")
    if (!translation.isNodeType("mix:title")) translation.addMixin("mix:title")
    translation.setProperty("jcr:language", "en")
    return translation
}

for (String workspace : [Constants.EDIT_WORKSPACE, Constants.LIVE_WORKSPACE]) {
    JCRTemplate.getInstance().doExecuteWithSystemSession(
            null,
            workspace,
            new JCRCallback<Object>() {
                @Override
                Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                    String siteRoot = partnerSiteRoot(session)
                    if (siteRoot == null) {
                        logger.error("Joined English Partner section fix aborted in {}: Partner roots are unavailable", workspace)
                        return null
                    }
                    String redAlphaPath = "${siteRoot}/contents/solution-partners/americas-red-alpha"
                    String scaleflexPath = "${siteRoot}/contents/technology-partners/scaleflex-cloudimage-jahia"
                    if (!session.nodeExists(redAlphaPath) || !session.nodeExists(scaleflexPath)) {
                        logger.error("Joined English Partner section fix aborted in {}: target nodes are unavailable", workspace)
                        return null
                    }

                    englishTranslation((JCRNodeWrapper) session.getNode(redAlphaPath))
                            .setProperty("description", paragraph(redAlphaDescription))
                    englishTranslation((JCRNodeWrapper) session.getNode(scaleflexPath))
                            .setProperty("partnership", paragraph(scaleflexPartnership))
                    session.save()
                    logger.info("Completed joined English Partner sections for Red Alpha and Scaleflex in {}", workspace)
                    return null
                }
            })
}
