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
final String filteredMixin = "jahiacommix:resourceCarouselFilteredSelection"
final String manualMixin = "jahiacommix:resourceCarouselManualSelection"
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

final Closure<JCRNodeWrapper> findMainResource = { JCRNodeWrapper node ->
    JCRNodeWrapper current = node
    while (current.getDepth() > 0) {
        if (current.isNodeType("jmix:mainResource")) {
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

                while (carousels.hasNext()) {
                    JCRNodeWrapper carousel = (JCRNodeWrapper) carousels.nextNode()
                    JCRNodeWrapper mainResource = findMainResource.call(carousel)
                    boolean publishAfterMigration = mainResource != null &&
                            wasPublishedWithoutPendingChanges.call(mainResource)
                    String mode = carousel.getPropertyAsString("selectionMode")
                    boolean updated = false

                    if (mode == "filtered" &&
                            !carousel.hasProperty("filteredThemes") &&
                            !carousel.hasProperty("filteredContentTypes")) {
                        if (carousel.hasProperty("filteredBlogTypes")) {
                            carousel.getProperty("filteredBlogTypes").remove()
                        }
                        carousel.setProperty("selectionMode", "automatic")
                        if (carousel.isNodeType(filteredMixin)) {
                            carousel.removeMixin(filteredMixin)
                        }
                        updated = true
                    }

                    if (mode == "manual" && !carousel.hasProperty("selectedItems")) {
                        Value[] selectedValues = null
                        if (carousel.hasProperty("selectedResources")) {
                            selectedValues = carousel.getProperty("selectedResources").getValues()
                        } else if (carousel.hasProperty("manualItems")) {
                            selectedValues = carousel.getProperty("manualItems").getValues()
                        }

                        if (selectedValues != null && selectedValues.length > 0) {
                            if (!carousel.isNodeType(manualMixin)) {
                                carousel.addMixin(manualMixin)
                            }
                            carousel.setProperty("selectedItems", selectedValues)
                            updated = true
                        }
                    }

                    if (!updated) {
                        continue
                    }

                    if (publishAfterMigration) {
                        nodesToPublish.add(mainResource.getIdentifier())
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
                        logger.warn("The migrated resource carousel settings could not be published automatically", exception)
                    }
                }

                logger.info("Migrated {} resource carousel(s); queued {} unchanged main resource(s) for publication",
                        migrated, nodesToPublish.size())
                return null
            }
        })
