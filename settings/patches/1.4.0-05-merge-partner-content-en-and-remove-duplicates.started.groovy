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
        Base64.decoder.decode("H4sIAAAAAAACCtW9y24cSbomuBegdzAkcFokyoOilJmVNwwGIZKimElKLAWVmWdp4W4RYUkPM08zd1JRmEVj3qDRveo3KKDRm972aupNzpMM/ovdPCJ0q1QOBucApQxGuNv1v37/9/8oV1qKa+l6o5wXE3Gll0722hpxKnvpVS8OFtYJp+60uj98+ODsbe9k3atGPD1++tfJ8beTJ1/+IGq77qTZiEb52ukOfu+FettJ06hGLJxdi47f8UjYxULXWrbiXs297pUX1qSnffWD0EacmWWr/epI3KyU6IZ5q2vxI461k0vlhXRK9CslvB1crYRdiN4N/epIvFZLGLz2olFO34W313YwvdscxamudCd8L10vGtnzA9Xbuh0a1RyJs3XXb8SdbAcl/g9hbE9j8CvViANj+5U2S6HNnTK9ag6PHj748qnQple8do+9bQdcxDBrIU0jnjwRvapXxrZ2uYl/Onr44CL9VDwWWz9++GB6df3wwc2mU9+L6VKZeiPE/yXEpbpT7fdipts75fATmv33YrpWTtfS44cnNPfvxRujYeNmPcz44YNfaPm/F6u+7/z3jx/f398fyTUssKk3R7VdP6bX2KUtv/Qb7AR+YaFb5R+3+k49xq18jH/K/mKX1sflmIQZPZbrDp+d9nTfG/KfPHzwy0r2sPEb0dgjMb26hp2WYjG07cQrd6drJdbS3aoedohmInr40bxVpvGidkr2+k73m0r43sleLTcV7s5creSdtk62wtdamVqJ3oraGqPqXsydNM1kPui2gSff634l5sMG/h1+eCQuei/CKOxioRz82XfS+PgufBUclbbVMDpVhSEp/FNtTa9MXwmneqlb/my9Vg6+2uil7iV96i1cokqsVaMlfrJW0g9OrfH38IGse31Hxwr/c921eqFr/ORITMUtrKOGgSrTa9lbh8tZ18p7mDyNoRJetsrTI/3Kdp1ycGukkL3wtWzhKjo7LFdC9144a3sPd3ja3EnTy6USM95/D0skVtKLtdSml9qoRrTWLCduMAYWy6kWRwf309Mq19b4Ya0cvp5XBXcDbs4vK0vHQTpF54Hvx730YmEHlD/aiCffffc1Lb0XKyWb3wfpeuXoj8+s762pxJX0Xtarwau+9xW9XTaNhgHJVrw5mh2R8FJeONVZ19PvX6p78e/W3Vbi0noxNUuFyzVTsu9bRes2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")))
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
    final List<String> expectedNames = [
            "AMP", "Avantia", "Ayasya", "DEPT®", "Lokion", "Monks", "Orium",
            "Purplepatch", "Red Alpha", "Sirahu", "Sponge.io", "SymSoft", "Thrillworks",
            "Verndale", "Deeply Digital", "Olive Lights", "ASI", "Atos", "Catamania",
            "CGI", "CHEN Consulting", "Contraste Europe", "COWEMO", "Efficy", "ekino",
            "Kodolion", "Ngoar", "NSI", "Sopra Steria", "Talan", "Tribal", "WIDE",
            "Akeneo", "Cloudinary", "Contentsquare", "DeepL", "FACIL'iti", "Keepeek",
            "Scaleflex Cloudimage", "Semji", "SiteImprove", "Translations.com"
    ]
    List<String> lines = source.readLines()
    List<Integer> metadataIndexes = []
    for (int index = 0; index < lines.size(); index++) {
        if (lines[index] ==~ /^(Type|Category)\s*:.*/) metadataIndexes.add(index)
    }

    List<Map<String, String>> records = []
    for (int position = 0; position < metadataIndexes.size(); position++) {
        int metadataIndex = metadataIndexes[position]
        int nameIndex = metadataIndex - 1
        while (nameIndex >= 0 && !lines[nameIndex].trim()) nameIndex--
        String precedingLine = lines[nameIndex].trim()
        String name = expectedNames
                .findAll { String candidate ->
                    precedingLine == candidate ||
                            precedingLine.startsWith(candidate + " -") ||
                            precedingLine.endsWith(candidate)
                }
                .sort { String left, String right -> right.length() <=> left.length() }
                .find { true }
        if (!name) {
            name = precedingLine.replaceFirst(/(?i)\s+-\s+(PAS SURE|NOT SURE|to review|a revoir).*$/, "")
        }

        int endIndex = lines.size() - 1
        if (position + 1 < metadataIndexes.size()) {
            int nextNameIndex = metadataIndexes[position + 1] - 1
            while (nextNameIndex >= 0 && !lines[nextNameIndex].trim()) nextNameIndex--
            endIndex = nextNameIndex - 1
        }
        String metadata = lines[metadataIndex].trim()
        String block = lines.subList(nameIndex, endIndex + 1).join("\n")
        records.add([
                name       : name,
                level      : capture(metadata, /Level\s*:\s*([^|]+)/),
                region     : capture(metadata, /Region\s*:\s*([^|]+)/),
                countries  : capture(metadata, /Country\s*:\s*(.+)$/),
                website    : capture(block, /Website\s*:\s*([^\s|]+)/),
                whatTheyDo : capture(block, /(?s)What they do\.\s*(.*?)(?=\s*Who they are\.|\s*How the Jahia partnership works\.|\s*Notes\.|$)/),
                whoTheyAre : capture(block, /(?s)Who they are\.\s*(.*?)(?=\s*How the Jahia partnership works\.|\s*Notes\.|$)/),
                partnership: capture(block, /(?s)How the Jahia partnership works\.\s*(.*?)(?=\s*Notes\.|$)/)
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
            .split(/(?<=[.!?])\s+(?=[A-Z])/)
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
    JCRNodeWrapper english = translation(node, "en", false)
    return english != null && english.hasProperty("jcr:title")
            ? english.getProperty("jcr:title").getString().trim()
            : node.getName()
}

List<String> countryCodes(String value) {
    final Map<String, String> codes = [
            "France"        : "FR",
            "United States" : "US",
            "Canada"        : "CA",
            "Australia"     : "AU",
            "India"         : "IN",
            "Singapore"     : "SG",
            "United Kingdom": "GB",
            "Belgium"       : "BE",
            "Switzerland"   : "CH",
            "Germany"       : "DE",
            "Denmark"       : "DK"
    ]
    return value.split(/\s*,\s*/)
            .collect { String country -> codes[country.trim()] }
            .findAll { String code -> code }
}

String regionCode(String value) {
    if (value.equalsIgnoreCase("APAC")) return "apac"
    if (value.equalsIgnoreCase("Americas")) return "americas"
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
    if (certification[record.level]) partner.setProperty("certification", certification[record.level])

    JCRNodeWrapper english = translation(partner, "en", true)
    String about = record.whoTheyAre ?: record.whatTheyDo
    if (about) english.setProperty("description", richText(about))
    if (record.whatTheyDo) {
        english.setProperty("shortDescription", record.whatTheyDo.replaceAll(/\s+/, " ").take(240))
        english.setProperty("expertiseTitle", "Areas of expertise")
        english.setProperty("expertise", expertiseItems(record.whatTheyDo) as String[])
    }
    if (record.partnership) english.setProperty("partnership", richText(record.partnership))
    if (record.website) english.setProperty("website", record.website)
    english.setProperty("aboutTitle", record.name)
}

final List<Map<String, String>> records = parseRecords(sourceDocument)
final List<Map<String, String>> solutionRecords = records.take(32)
final List<Map<String, String>> technologyRecords = records.drop(32) +
        solutionRecords.findAll { Map<String, String> record -> record.name == "Efficy" }

if (records.size() != 42) {
    logger.error("English Partner content merge aborted: expected 42 records but parsed {}", records.size())
    return
}
if (records.collect { Map<String, String> record -> record.name }.toSet().size() != 42) {
    logger.error("English Partner content merge aborted: the dataset contains duplicate partner names")
    return
}

for (String workspace : [Constants.EDIT_WORKSPACE, Constants.LIVE_WORKSPACE]) {
    JCRTemplate.getInstance().doExecuteWithSystemSession(
            null,
            workspace,
            new JCRCallback<Object>() {
                @Override
                Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                    int solutionUpdates = 0
                    int technologyUpdates = 0
                    int duplicatesRemoved = 0
                    String siteRoot = partnerSiteRoot(session)
                    if (siteRoot == null) {
                        logger.error("English Partner content merge aborted: Partner content roots are unavailable")
                        return null
                    }
                    String solutionPath = "${siteRoot}/contents/solution-partners"
                    if (session.nodeExists(solutionPath)) {
                        JCRNodeWrapper solutionRoot = (JCRNodeWrapper) session.getNode(solutionPath)
                        List<JCRNodeWrapper> nodes = partners(solutionRoot)
                        for (Map<String, String> record : solutionRecords) {
                            List<JCRNodeWrapper> matches = nodes.findAll { JCRNodeWrapper candidate ->
                                title(candidate).equalsIgnoreCase(record.name)
                            }
                            if (!matches.isEmpty()) {
                                matches.each { JCRNodeWrapper partner -> applyRecord(partner, record, false) }
                                solutionUpdates++
                            } else {
                                logger.warn("Solution Partner not found for English record {}", record.name)
                            }
                        }

                        for (String duplicateName : ["asia-pacific-ekino", "asia-pacific-talan"]) {
                            String canonicalName = duplicateName.replace("asia-pacific", "europe-and-middle-east")
                            if (solutionRoot.hasNode(duplicateName) && solutionRoot.hasNode(canonicalName)) {
                                solutionRoot.getNode(duplicateName).remove()
                                duplicatesRemoved++
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
                                logger.warn("Technology Partner not found for English record {}", record.name)
                            }
                        }
                    }

                    session.save()
                    logger.info(
                            "Merged latest English Partner content: {} Solution, {} Technology; removed {} duplicate nodes in {}",
                            solutionUpdates,
                            technologyUpdates,
                            duplicatesRemoved,
                            workspace)
                    return null
                }
            })
}
