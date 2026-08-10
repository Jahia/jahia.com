import org.jahia.api.Constants
import org.jahia.registries.ServicesRegistry
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.Value
import javax.jcr.query.Query

final String carouselNodeType = "jahiacom:resourceCarousel"
final Set<String> nodesToPublish = new HashSet<>()
final def logger = log

final Closure<Boolean> wasPublishedWithoutPendingChanges = { JCRNodeWrapper node ->
    if (!node.isNodeType(Constants.JAHIAMIX_LASTPUBLISHED) ||
            !node.hasProperty(Constants.LASTPUBLISHED) ||
            !node.hasProperty(Constants.JCR_LASTMODIFIED)) {
        return false
    }

    return !node.getProperty(Constants.JCR_LASTMODIFIED).getDate()
            .after(node.getProperty(Constants.LASTPUBLISHED).getDate())
}

final Closure<JCRNodeWrapper> findPublishableResource = { JCRNodeWrapper node ->
    JCRNodeWrapper current = node
    while (current.getDepth() > 0) {
        if (current.isNodeType("jmix:mainResource") || current.isNodeType("jnt:page")) {
            return current
        }
        current = current.getParent()
    }
    return null
}

JCRTemplate.getInstance().doExecuteWithSystemSession(
        null,
        Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                String statement = "SELECT * FROM [${carouselNodeType}] WHERE ISDESCENDANTNODE('/sites')"
                NodeIterator carousels = session.getWorkspace().getQueryManager()
                        .createQuery(statement, Query.JCR_SQL2)
                        .execute()
                        .getNodes()
                int migrated = 0
                int ignoredReferences = 0

                while (carousels.hasNext()) {
                    JCRNodeWrapper carousel = (JCRNodeWrapper) carousels.nextNode()
                    if (carousel.getPropertyAsString("selectionMode") != "manual") {
                        continue
                    }

                    Value[] selectedValues = null
                    if (carousel.hasProperty("selectedItems")) {
                        selectedValues = carousel.getProperty("selectedItems").getValues()
                    } else if (carousel.hasProperty("selectedResources")) {
                        selectedValues = carousel.getProperty("selectedResources").getValues()
                    } else if (carousel.hasProperty("manualItems")) {
                        selectedValues = carousel.getProperty("manualItems").getValues()
                    }

                    boolean updated = false
                    if (!carousel.hasProperty("selectedContent") &&
                            selectedValues != null && selectedValues.length > 0) {
                        List<Value> compatibleValues = selectedValues.findAll { Value value ->
                            try {
                                JCRNodeWrapper selectedNode =
                                        (JCRNodeWrapper) session.getNodeByIdentifier(value.getString())
                                return selectedNode.isNodeType("jnt:page") ||
                                        selectedNode.isNodeType("jahiacom:blogEntry")
                            } catch (Exception ignored) {
                                return false
                            }
                        }
                        ignoredReferences += selectedValues.length - compatibleValues.size()

                        if (!compatibleValues.isEmpty()) {
                            carousel.setProperty("selectedContent", compatibleValues.toArray(new Value[0]))
                            updated = true
                        }
                    }

                    if (carousel.hasProperty("selectedItems")) {
                        carousel.getProperty("selectedItems").remove()
                        updated = true
                    }

                    if (!updated) {
                        continue
                    }

                    JCRNodeWrapper publishableResource = findPublishableResource.call(carousel)
                    if (publishableResource != null &&
                            wasPublishedWithoutPendingChanges.call(publishableResource)) {
                        nodesToPublish.add(publishableResource.getIdentifier())
                    }
                    migrated++
                }

                session.save()

                if (!nodesToPublish.isEmpty()) {
                    try {
                        ServicesRegistry.getInstance().getJCRPublicationService().publish(
                                nodesToPublish.toList(),
                                Constants.EDIT_WORKSPACE,
                                Constants.LIVE_WORKSPACE,
                                null)
                    } catch (Exception exception) {
                        logger.warn("The migrated resource carousel selections could not be published automatically", exception)
                    }
                }

                logger.info("Migrated {} manual resource carousel(s), ignored {} incompatible reference(s); " +
                        "queued {} unchanged resource(s) for publication",
                        migrated, ignoredReferences, nodesToPublish.size())
                return null
            }
        })
