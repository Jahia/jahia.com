import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException

boolean containsPartnerDirectory(JCRNodeWrapper node) {
    NodeIterator children = node.getNodes()
    while (children.hasNext()) {
        JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
        if (child.isNodeType("jahiacom:partnerList") || containsPartnerDirectory(child)) return true
    }
    return false
}

JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                for (String siteRoot : ["/sites/jahiacom", "/sites/mySite"]) {
                    String mainPath = "${siteRoot}/home/resources/find-a-partner/main"
                    if (!session.nodeExists(mainPath)) continue

                    JCRNodeWrapper main = (JCRNodeWrapper) session.getNode(mainPath)
                    if (!main.hasNode("solution-partner-overview") || !main.hasNode("solution-partner-intro")) continue

                    JCRNodeWrapper legacyIntro = (JCRNodeWrapper) main.getNode("solution-partner-intro")
                    if (!containsPartnerDirectory(legacyIntro)) legacyIntro.remove()
                }

                session.save()
                log.info("Duplicate Solution Partner overview removed from the edit workspace")
                return null
            }
        })
