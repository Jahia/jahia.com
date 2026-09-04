import groovy.json.JsonOutput
import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException

final def logger = log

String partnerSiteRoot(JCRSessionWrapper session) throws RepositoryException {
    for (String siteName : ["jahiacom", "mySite"]) {
        String path = "/sites/${siteName}"
        if (session.nodeExists("${path}/contents/solution-partners")) return path
    }
    if (!session.nodeExists("/sites")) return null
    NodeIterator sites = session.getNode("/sites").getNodes()
    while (sites.hasNext()) {
        String path = sites.nextNode().getPath()
        if (session.nodeExists("${path}/contents/solution-partners")) return path
    }
    return null
}

List<JCRNodeWrapper> partnerDescendants(JCRNodeWrapper root) throws RepositoryException {
    List<JCRNodeWrapper> result = []
    Closure<Void> visit
    visit = { JCRNodeWrapper node ->
        NodeIterator children = node.getNodes()
        while (children.hasNext()) {
            JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
            if (child.isNodeType("jahiacom:partner")) result.add(child)
            visit(child)
        }
        return null
    }
    visit(root)
    return result
}

String frenchTitle(JCRNodeWrapper node) throws RepositoryException {
    return node.hasNode("j:translation_fr") && node.getNode("j:translation_fr").hasProperty("jcr:title")
            ? node.getNode("j:translation_fr").getProperty("jcr:title").getString().trim()
            : node.getName()
}

for (String workspace : [Constants.EDIT_WORKSPACE, Constants.LIVE_WORKSPACE]) {
    JCRTemplate.getInstance().doExecuteWithSystemSession(
            null,
            workspace,
            new JCRCallback<Object>() {
                @Override
                Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                    String siteRoot = partnerSiteRoot(session)
                    if (siteRoot == null) return null
                    String rootPath = "${siteRoot}/contents/solution-partners"
                    if (!session.nodeExists(rootPath)) return null
                    int updated = 0
                    for (JCRNodeWrapper partner : partnerDescendants(
                            (JCRNodeWrapper) session.getNode(rootPath))) {
                        if (frenchTitle(partner) in ["ekino", "Talan"]) {
                            partner.setProperty("countries", ["FR"] as String[])
                            partner.setProperty("regions", ["europe"] as String[])
                            partner.setProperty(
                                    "partnerLocationsData",
                                    JsonOutput.toJson([[region: "europe", country: "FR"]]))
                            updated++
                        }
                    }
                    session.save()
                    logger.info("Normalized {} latest Solution Partner region records in {}", updated, workspace)
                    return null
                }
            })
}
