import org.jahia.api.Constants
import org.jahia.registries.ServicesRegistry
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.query.Query

final String blogNodeType = "jahiacom:blogEntry"
final String areaNodeType = "jahiacom:blogResourceCarouselArea"
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

JCRTemplate.getInstance().doExecuteWithSystemSession(
        null,
        Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                String statement = "SELECT * FROM [${blogNodeType}] WHERE ISDESCENDANTNODE('/sites')"
                NodeIterator blogs = session.getWorkspace().getQueryManager()
                        .createQuery(statement, Query.JCR_SQL2)
                        .execute()
                        .getNodes()
                int created = 0

                while (blogs.hasNext()) {
                    JCRNodeWrapper blog = (JCRNodeWrapper) blogs.nextNode()
                    boolean publishAfterMigration = wasPublishedWithoutPendingChanges.call(blog)
                    boolean areaCreated = !blog.hasNode("resourceCarousel")
                    JCRNodeWrapper area = areaCreated
                            ? blog.addNode("resourceCarousel", areaNodeType)
                            : blog.getNode("resourceCarousel")

                    if (!area.isNodeType(areaNodeType)) {
                        continue
                    }

                    JCRNodeWrapper carousel = null
                    NodeIterator areaChildren = area.getNodes()
                    while (areaChildren.hasNext()) {
                        JCRNodeWrapper child = (JCRNodeWrapper) areaChildren.nextNode()
                        if (child.isNodeType(carouselNodeType)) {
                            carousel = child
                            break
                        }
                    }

                    boolean carouselCreated = carousel == null
                    if (carouselCreated) {
                        carousel = area.addNode("carousel", carouselNodeType)
                    }

                    if (!areaCreated && !carouselCreated) {
                        continue
                    }

                    if (blog.hasProperty("blogType") &&
                            blog.getProperty("blogType").getValues().length > 0 &&
                            !carousel.isNodeType("jahiacommix:resourceCarouselFilteredSelection")) {
                        carousel.addMixin("jahiacommix:resourceCarouselFilteredSelection")
                        carousel.setProperty("selectionMode", "filtered")
                        carousel.setProperty("filteredBlogTypes", blog.getProperty("blogType").getValues())
                    }

                    created++
                    if (publishAfterMigration) {
                        nodesToPublish.add(blog.getIdentifier())
                    }
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
                        logger.warn("The migrated blog carousels could not be published automatically", exception)
                    }
                }

                logger.info("Created {} editable blog resource carousel(s); queued {} unchanged blog(s) for publication",
                        created, nodesToPublish.size())
                return null
            }
        })
