import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException

JCRNodeWrapper translation(JCRNodeWrapper node, String language) {
    String name = "j:translation_" + language
    JCRNodeWrapper result = node.hasNode(name)
            ? (JCRNodeWrapper) node.getNode(name)
            : (JCRNodeWrapper) node.addNode(name, "jnt:translation")
    result.setProperty("jcr:language", language)
    return result
}

JCRNodeWrapper findDescendantOfType(JCRNodeWrapper node, String nodeType) {
    NodeIterator children = node.getNodes()
    while (children.hasNext()) {
        JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
        if (child.isNodeType(nodeType)) return child
        JCRNodeWrapper nested = findDescendantOfType(child, nodeType)
        if (nested != null) return nested
    }
    return null
}

JCRNodeWrapper topLevelBlock(JCRNodeWrapper main, JCRNodeWrapper node) {
    JCRNodeWrapper block = node
    while (block.getParent().getIdentifier() != main.getIdentifier()) {
        block = (JCRNodeWrapper) block.getParent()
    }
    return block
}

void setSection(JCRNodeWrapper section, String language, String title, String subtitle) {
    JCRNodeWrapper value = translation(section, language)
    value.setProperty("jcr:title", title)
    value.setProperty("subtitle", subtitle)
}

JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                for (String siteRoot : ["/sites/jahiacom", "/sites/mySite"]) {
                    String mainPath = "${siteRoot}/home/resources/find-a-partner/main"
                    if (!session.nodeExists(mainPath)) continue

                    JCRNodeWrapper main = (JCRNodeWrapper) session.getNode(mainPath)
                    JCRNodeWrapper directory = findDescendantOfType(main, "jahiacom:partnerList")
                    if (directory == null || !main.hasNode("partner-types") || !main.hasNode("partner-nearby")) continue

                    JCRNodeWrapper directoryBlock = topLevelBlock(main, directory)
                    JCRNodeWrapper overview = main.hasNode("solution-partner-overview")
                            ? (JCRNodeWrapper) main.getNode("solution-partner-overview")
                            : (JCRNodeWrapper) main.addNode("solution-partner-overview", "jahiacom:section")
                    overview.setProperty("columns", "100")
                    overview.setProperty("width", "75")
                    overview.setProperty("gap", "1")
                    overview.setProperty("ctaType", "none")
                    setSection(overview, "en", "Certified experts for your projects", "<p>A <strong>Solution Partner</strong> is a company trained and certified by Jahia—an integrator, digital services company or agency—that manages your project end to end with consultants who know the platform.</p>")
                    setSection(overview, "fr", "Des experts certifiés pour vos projets", "<p>Un <strong>Solution Partner</strong> est une entreprise formée et certifiée par Jahia — intégrateur, ESN ou agence — qui prend en charge votre projet de bout en bout et mobilise des consultants experts de la plateforme.</p>")

                    setSection(directoryBlock, "en", "Solution Partners", "<p>Find the right partner for your market and Jahia project.</p>")
                    setSection(directoryBlock, "fr", "Partenaires Solution", "<p>Trouvez le partenaire adapté à votre marché et à votre projet Jahia.</p>")

                    main.orderBefore("partner-nearby", directoryBlock.getName())
                    main.orderBefore("partner-types", "partner-nearby")
                    main.orderBefore("solution-partner-overview", "partner-types")
                }

                session.save()
                log.info("Solution Partner overview and catalog ordering repaired in the edit workspace")
                return null
            }
        })
