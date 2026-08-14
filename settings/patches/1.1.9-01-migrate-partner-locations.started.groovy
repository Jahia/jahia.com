import groovy.json.JsonOutput
import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.Value
import javax.jcr.query.Query

final def logger = log
final List<String> partnersRoots = [
        "/sites/www/contents/Partenaires",
        "/sites/mySite/contents/Partenaires"
]

JCRTemplate.getInstance().doExecuteWithSystemSession(
        null,
        Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                int migrated = 0
                int unchanged = 0
                int rootsFound = 0
                for (String partnersRoot : partnersRoots) {
                    if (!session.nodeExists(partnersRoot)) {
                        continue
                    }
                    rootsFound++

                    NodeIterator partners = session.getWorkspace().getQueryManager()
                            .createQuery(
                                    "SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('${partnersRoot}')",
                                    Query.JCR_SQL2
                            )
                            .execute()
                            .getNodes()

                    while (partners.hasNext()) {
                        JCRNodeWrapper partner = (JCRNodeWrapper) partners.nextNode()
                        if (partner.hasProperty("partnerLocationsData") &&
                                partner.getProperty("partnerLocationsData").getString().trim()) {
                            unchanged++
                            continue
                        }

                        List<Map<String, String>> locations = locationsFromLegacyProperties(partner)
                        if (locations.isEmpty()) {
                            locations = [[
                                    region : legacyRegion(partner.getPath()),
                                    country: legacyCountries(partner).find { String country -> country } ?: ""
                            ]]
                        }

                        partner.setProperty("partnerLocationsData", JsonOutput.toJson(locations))
                        migrated++
                    }
                }

                if (rootsFound == 0) {
                    logger.warn("Partner location migration skipped: none of the configured roots exist ({})",
                            partnersRoots)
                    return null
                }

                if (migrated > 0) {
                    session.save()
                }
                logger.info("Partner location migration completed under {} root(s): {} migrated, {} unchanged",
                        rootsFound, migrated, unchanged)
                return null
            }

            private static List<Map<String, String>> locationsFromLegacyProperties(JCRNodeWrapper partner)
                    throws RepositoryException {
                List<String> regions = values(partner, "regions")
                if (regions.isEmpty()) {
                    return []
                }

                List<String> countries = values(partner, "locationCountries")
                String legacyCountry = legacyCountries(partner).find { String country -> country } ?: ""

                return regions.withIndex().collect { String region, int index ->
                    String country = index < countries.size() ? countries[index] : ""
                    if (!country && index == 0) {
                        country = legacyCountry
                    }
                    [region: region, country: country]
                }
            }

            private static List<String> legacyCountries(JCRNodeWrapper partner) throws RepositoryException {
                return values(partner, "countries").findAll { String country -> country != "ZZ" }
            }

            private static List<String> values(JCRNodeWrapper node, String propertyName)
                    throws RepositoryException {
                if (!node.hasProperty(propertyName)) {
                    return []
                }
                return node.getProperty(propertyName).getValues().collect { Value value ->
                    value.getString().trim()
                }
            }

            private static String legacyRegion(String path) {
                String normalized = path.toLowerCase()
                if (normalized.contains("america") || normalized.contains("amérique")) return "americas"
                if (normalized.contains("asia") || normalized.contains("asie") || normalized.contains("apac")) {
                    return "apac"
                }
                return "europe"
            }
        }
)
