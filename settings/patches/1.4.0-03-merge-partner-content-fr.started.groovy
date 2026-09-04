import groovy.json.JsonOutput
import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import java.util.zip.GZIPInputStream

final def logger = log
final String sourceDocument = new GZIPInputStream(new ByteArrayInputStream(
        Base64.decoder.decode("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")))
        .getText("UTF-8")

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

List<Map<String, String>> parseRecords(String source) {
    List<String> lines = source.readLines()
    List<Integer> metadataIndexes = []
    for (int index = 0; index < lines.size(); index++) {
        if (lines[index] ==~ /^(Type|Catégorie)\s*:.*/) metadataIndexes.add(index)
    }

    List<Map<String, String>> records = []
    for (int position = 0; position < metadataIndexes.size(); position++) {
        int metadataIndex = metadataIndexes[position]
        int nameIndex = metadataIndex - 1
        while (nameIndex >= 0 && !lines[nameIndex].trim()) nameIndex--
        int endIndex = lines.size() - 1
        if (position + 1 < metadataIndexes.size()) {
            int nextNameIndex = metadataIndexes[position + 1] - 1
            while (nextNameIndex >= 0 && !lines[nextNameIndex].trim()) nextNameIndex--
            endIndex = nextNameIndex - 1
        }

        String name = lines[nameIndex].trim()
                .replaceFirst(/(?i)\s+-\s+(PAS SURE|a revoir).*$/, "")
        String metadata = lines[metadataIndex].trim()
        String block = lines.subList(nameIndex, endIndex + 1).join("\n")
        records.add([
                name       : name,
                level      : capture(metadata, /Niveau\s*:\s*([^|]+)/),
                region     : capture(metadata, /Région\s*:\s*([^|]+)/),
                countries  : capture(metadata, /Pays\s*:\s*(.+)$/),
                website    : capture(block, /Site web\s*:\s*([^\s|]+)/),
                whatTheyDo : capture(block, /(?s)Ce qu'ils font\.\s*(.*?)(?=\s*Qui ils sont\.|\s*Comment fonctionne le partenariat avec Jahia\.|\s*Notes\.|$)/),
                whoTheyAre : capture(block, /(?s)Qui ils sont\.\s*(.*?)(?=\s*Comment fonctionne le partenariat avec Jahia\.|\s*Notes\.|$)/),
                partnership: capture(block, /(?s)Comment fonctionne le partenariat avec Jahia\.\s*(.*?)(?=\s*Notes\.|$)/)
        ])
    }
    return records
}

String capture(String value, def pattern) {
    def matcher = value =~ pattern
    return matcher.find() ? matcher.group(1).trim() : ""
}

String escapeHtml(String value) {
    return value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
}

String richText(String value) {
    if (!value) return ""
    return value.split(/\n\s*\n/)
            .collect { String paragraph -> "<p>${escapeHtml(paragraph.replaceAll(/\s+/, ' ').trim())}</p>" }
            .findAll { String paragraph -> paragraph != "<p></p>" }
            .join("\n")
}

List<String> expertiseItems(String value) {
    if (!value) return []
    return value.replaceAll(/\s+/, " ")
            .trim()
            .split(/(?<=[.!?])\s+(?=[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ])/)
            .collect { String item -> item.trim() }
            .findAll { String item -> item }
}

List<JCRNodeWrapper> partners(JCRNodeWrapper root) throws RepositoryException {
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

JCRNodeWrapper translation(JCRNodeWrapper node, String language, boolean create)
        throws RepositoryException {
    String name = "j:translation_${language}"
    if (node.hasNode(name)) return (JCRNodeWrapper) node.getNode(name)
    if (!create) return null
    JCRNodeWrapper result = (JCRNodeWrapper) node.addNode(name, "jnt:translation")
    if (!result.isNodeType("mix:title")) result.addMixin("mix:title")
    result.setProperty("jcr:language", language)
    return result
}

String title(JCRNodeWrapper node) throws RepositoryException {
    JCRNodeWrapper french = translation(node, "fr", false)
    return french != null && french.hasProperty("jcr:title")
            ? french.getProperty("jcr:title").getString().trim()
            : node.getName()
}

List<String> countryCodes(String value) {
    final Map<String, String> codes = [
            "France"       : "FR",
            "États-Unis"   : "US",
            "Canada"       : "CA",
            "Australie"    : "AU",
            "Inde"         : "IN",
            "Singapour"    : "SG",
            "Royaume-Uni"  : "GB",
            "Belgique"     : "BE",
            "Suisse"       : "CH",
            "Allemagne"    : "DE",
            "Danemark"     : "DK"
    ]
    return value.split(/\s*,\s*/)
            .collect { String country -> codes[country.trim()] }
            .findAll { String code -> code }
}

String regionCode(String value) {
    if (value.equalsIgnoreCase("APAC")) return "apac"
    if (value.toLowerCase().startsWith("amérique")) return "americas"
    return "europe"
}

void applyRecord(JCRNodeWrapper partner, Map<String, String> record, boolean technology)
        throws RepositoryException {
    List<String> countries = countryCodes(record.countries)
    String region = regionCode(record.region)
    if (!countries.isEmpty()) partner.setProperty("countries", countries as String[])
    partner.setProperty("regions", [region] as String[])
    partner.setProperty(
            "partnerLocationsData",
            JsonOutput.toJson(countries.isEmpty()
                    ? [[region: region]]
                    : countries.collect { String country -> [region: region, country: country] }))

    if (technology) {
        partner.setProperty("partnerType", "technology")
        partner.setProperty("integrationPartner", !record.name.equalsIgnoreCase("Efficy"))
    }

    Map<String, String> certification = [
            "Silver": "silver",
            "Gold": "gold",
            "Diamond": "diamond"
    ]
    if (certification[record.level]) {
        partner.setProperty("certification", certification[record.level])
    }

    JCRNodeWrapper french = translation(partner, "fr", true)
    String about = record.whoTheyAre ?: record.whatTheyDo
    if (about) french.setProperty("description", richText(about))
    if (record.whatTheyDo) {
        french.setProperty("shortDescription", record.whatTheyDo.replaceAll(/\s+/, " ").take(240))
        french.setProperty("expertiseTitle", "Domaines d’expertise")
        french.setProperty("expertise", expertiseItems(record.whatTheyDo) as String[])
    }
    if (record.partnership) french.setProperty("partnership", richText(record.partnership))
    if (record.website) french.setProperty("website", record.website)
    french.setProperty("aboutTitle", record.name)
}

final List<Map<String, String>> records = parseRecords(sourceDocument)
final List<Map<String, String>> solutionRecords = records.take(32)
final List<Map<String, String>> technologyRecords = records.drop(32) +
        solutionRecords.findAll { Map<String, String> record -> record.name == "Efficy" }

for (String workspace : [Constants.EDIT_WORKSPACE, Constants.LIVE_WORKSPACE]) {
    JCRTemplate.getInstance().doExecuteWithSystemSession(
            null,
            workspace,
            new JCRCallback<Object>() {
                @Override
                Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                    int solutionUpdates = 0
                    int technologyUpdates = 0
                    String siteRoot = partnerSiteRoot(session)
                    if (siteRoot == null) {
                        logger.error("French Partner content merge aborted: Partner content roots are unavailable")
                        return null
                    }
                    String solutionPath = "${siteRoot}/contents/solution-partners"
                    if (session.nodeExists(solutionPath)) {
                        List<JCRNodeWrapper> nodes = partners((JCRNodeWrapper) session.getNode(solutionPath))
                        for (Map<String, String> record : solutionRecords) {
                            List<JCRNodeWrapper> matchingPartners = nodes.findAll { JCRNodeWrapper candidate ->
                                title(candidate).equalsIgnoreCase(record.name)
                            }
                            if (!matchingPartners.isEmpty()) {
                                matchingPartners.each { JCRNodeWrapper partner ->
                                    applyRecord(partner, record, false)
                                }
                                solutionUpdates++
                            } else {
                                logger.warn("Solution Partner not found for document record {}", record.name)
                            }
                        }
                    }

                    String technologyPath = "${siteRoot}/contents/technology-partners"
                    if (session.nodeExists(technologyPath)) {
                        List<JCRNodeWrapper> nodes = partners((JCRNodeWrapper) session.getNode(technologyPath))
                        for (Map<String, String> record : technologyRecords) {
                            JCRNodeWrapper partner = nodes.find { JCRNodeWrapper candidate ->
                                title(candidate).equalsIgnoreCase(record.name)
                            }
                            if (partner != null) {
                                applyRecord(partner, record, true)
                                technologyUpdates++
                            } else {
                                logger.warn("Technology Partner not found for document record {}", record.name)
                            }
                        }
                    }

                    session.save()
                    logger.info(
                            "Merged latest French partner content: {} Solution and {} Technology records in {}",
                            solutionUpdates,
                            technologyUpdates,
                            workspace)
                    return null
                }
            })
}
