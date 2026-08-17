import groovy.json.JsonOutput
import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.query.Query

final def logger = log
final List<String> partnerRoots = [
        "/sites/www/contents/Partenaires",
        "/sites/mySite/contents/Partenaires"
]

for (String workspace : [Constants.EDIT_WORKSPACE, Constants.LIVE_WORKSPACE]) {
    JCRTemplate.getInstance().doExecuteWithSystemSession(
            null,
            workspace,
            new JCRCallback<Object>() {
                @Override
                Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                    int migratedParents = 0
                    int removedLocations = 0

                    for (String partnerRoot : partnerRoots) {
                        if (!session.nodeExists(partnerRoot)) {
                            continue
                        }

                        NodeIterator partners = session.getWorkspace().getQueryManager()
                                .createQuery(
                                        "SELECT * FROM [jahiacom:partner] " +
                                                "WHERE ISDESCENDANTNODE('${partnerRoot}')",
                                        Query.JCR_SQL2
                                )
                                .execute()
                                .getNodes()

                        while (partners.hasNext()) {
                            JCRNodeWrapper partner = (JCRNodeWrapper) partners.nextNode()
                            List<JCRNodeWrapper> obsoleteLocations = []
                            NodeIterator children = partner.getNodes()

                            while (children.hasNext()) {
                                JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
                                if (child.isNodeType("jahiacom:partnerLocation")) {
                                    obsoleteLocations.add(child)
                                }
                            }

                            if (obsoleteLocations.isEmpty()) {
                                continue
                            }

                            if (!partner.hasProperty("partnerLocationsData") ||
                                    !partner.getProperty("partnerLocationsData").getString().trim()) {
                                List<Map<String, String>> locations = obsoleteLocations.collect {
                                    JCRNodeWrapper location ->
                                        String region = location.hasProperty("region")
                                                ? location.getProperty("region").getString().trim()
                                                : ""
                                        String country = location.hasProperty("country")
                                                ? location.getProperty("country").getString().trim()
                                                : ""
                                        [region: region, country: country]
                                }.findAll { Map<String, String> location -> location.region }

                                if (!locations.isEmpty()) {
                                    partner.setProperty("partnerLocationsData", JsonOutput.toJson(locations))
                                    migratedParents++
                                }
                            }

                            obsoleteLocations.each { JCRNodeWrapper location ->
                                location.remove()
                                removedLocations++
                            }
                        }
                    }

                    if (migratedParents > 0 || removedLocations > 0) {
                        session.save()
                    }

                    logger.info(
                            "Partner location cleanup completed in {}: {} parent(s) migrated, " +
                                    "{} obsolete child node(s) removed",
                            workspace,
                            migratedParents,
                            removedLocations
                    )
                    return null
                }
            }
    )
}
