import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException

List<JCRNodeWrapper> descendantsOfType(JCRNodeWrapper root, String nodeType) {
    List<JCRNodeWrapper> result = []
    NodeIterator children = root.getNodes()
    while (children.hasNext()) {
        JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
        if (child.isNodeType(nodeType)) result.add(child)
        result.addAll(descendantsOfType(child, nodeType))
    }
    return result
}

JCRNodeWrapper topLevelBlock(JCRNodeWrapper main, JCRNodeWrapper node) {
    JCRNodeWrapper block = node
    while (block.getParent().getIdentifier() != main.getIdentifier()) {
        block = (JCRNodeWrapper) block.getParent()
    }
    return block
}

JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                for (String siteRoot : ["/sites/jahiacom", "/sites/mySite"]) {
                    String mainPath = "${siteRoot}/home/resources/find-a-partner/main"
                    if (!session.nodeExists(mainPath)) continue

                    JCRNodeWrapper main = (JCRNodeWrapper) session.getNode(mainPath)
                    List<JCRNodeWrapper> directories = descendantsOfType(main, "jahiacom:partnerList")
                    if (directories.size() < 2) continue

                    JCRNodeWrapper keeper = directories.find { JCRNodeWrapper directory ->
                        topLevelBlock(main, directory).getName() == "solution-partner-intro"
                    } ?: directories[0]
                    JCRNodeWrapper keeperBlock = topLevelBlock(main, keeper)

                    Set<String> duplicateBlockIds = directories
                            .findAll { JCRNodeWrapper directory -> directory.getIdentifier() != keeper.getIdentifier() }
                            .collect { JCRNodeWrapper directory -> topLevelBlock(main, directory).getIdentifier() }
                            .findAll { String identifier -> identifier != keeperBlock.getIdentifier() }
                            .toSet()

                    for (String identifier : duplicateBlockIds) {
                        JCRNodeWrapper duplicate = (JCRNodeWrapper) session.getNodeByIdentifier(identifier)
                        if (duplicate.getParent().getIdentifier() == main.getIdentifier()) duplicate.remove()
                    }

                    if (main.hasNode("partner-nearby")) {
                        main.orderBefore("partner-nearby", keeperBlock.getName())
                    }
                }

                session.save()
                log.info("Duplicate generated Solution Partner directories removed from the edit workspace")
                return null
            }
        })
