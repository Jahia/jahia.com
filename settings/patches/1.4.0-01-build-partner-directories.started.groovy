import groovy.json.JsonOutput
import groovy.xml.XmlSlurper
import org.jahia.api.Constants
import org.jahia.registries.ServicesRegistry
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.Value
import java.util.zip.ZipFile

final def logger = log
final List<Map<String, Object>> technologies = [
        [card: "claude-anthropic", partner: "claude", categories: ["ai-genai"]],
        [card: "chatgpt-openai", partner: "chatgpt", categories: ["ai-genai"]],
        [card: "mistral", partner: "mistral", categories: ["ai-genai"]],
        [card: "azure-openai", partner: "azure-openai", categories: ["ai-genai"]],
        [card: "gemini-google", partner: "gemini", categories: ["ai-genai"]],
        [card: "deepseek", partner: "deepseek", categories: ["ai-genai"]],
        [card: "semji", partner: "semji", categories: ["seo-content"]],
        [card: "siteimprove", partner: "siteimprove", categories: ["accessibility-web-quality"]],
        [card: "contentsquare", partner: "contentsquare", categories: ["analytics-data"]],
        [card: "translations-com", partner: "translationsdotcom", categories: ["translation-localization"]],
        [card: "deepl", partner: "deepl", categories: ["translation-localization"]],
        [card: "akeneo", partner: "akeneo", categories: ["pim"]],
        [card: "keepeek", partner: "keepeek", categories: ["dam-media"]],
        [card: "cloudinary", partner: "cloudinary", categories: ["dam-media"]],
        [card: "faciliti", partner: "faciliti", categories: ["accessibility-web-quality"]],
        [card: "scaleflex-cloudimage", partner: "scaleflex-cloudimage-jahia", categories: ["dam-media"]],
        [card: "salesforce", partner: "salesforce", categories: ["crm"]],
        [card: "marketo", partner: "marketo", categories: ["marketing-automation"]],
        [card: "slack", partner: "slack", categories: ["collaboration"]],
        [card: "zendesk", partner: "zendesk", categories: ["support-customer-service"]],
        [card: "intercom", partner: "intercom", categories: ["support-customer-service"]],
        [card: "microsoft-power-bi", partner: "microsoft-power-bi", categories: ["analytics-data"]]
]
final Map<String, Map<String, String>> categoryLabels = [
        "ai-genai"                    : [en: "AI & GenAI", fr: "IA & GenAI"],
        "crm"                         : [en: "CRM", fr: "CRM"],
        "marketing-automation"        : [en: "Marketing Automation", fr: "Marketing Automation"],
        "dam-media"                   : [en: "DAM & media", fr: "DAM & médias"],
        "pim"                         : [en: "PIM", fr: "PIM"],
        "translation-localization"    : [en: "Translation & localization", fr: "Traduction & localisation"],
        "analytics-data"              : [en: "Analytics & data", fr: "Analytics & données"],
        "seo-content"                 : [en: "SEO & content", fr: "SEO & contenu"],
        "accessibility-web-quality"   : [en: "Accessibility & web quality", fr: "Accessibilité & qualité web"],
        "support-customer-service"    : [en: "Support & customer service", fr: "Support & service client"],
        "collaboration"               : [en: "Collaboration", fr: "Collaboration"]
]
final Map<String, Map<String, Object>> publishedCards = [:]
final List<Map<String, Object>> publishedSolutions = []

String partnerSiteRoot(JCRSessionWrapper session) throws RepositoryException {
    for (String siteName : ["jahiacom", "mySite"]) {
        String path = "/sites/${siteName}"
        if (session.nodeExists("${path}/home/resources/find-a-partner") &&
                session.nodeExists("${path}/home/product/features/integrations")) return path
    }
    if (!session.nodeExists("/sites")) return null
    NodeIterator sites = session.getNode("/sites").getNodes()
    while (sites.hasNext()) {
        JCRNodeWrapper site = (JCRNodeWrapper) sites.nextNode()
        String path = site.getPath()
        if (session.nodeExists("${path}/home/resources/find-a-partner") &&
                session.nodeExists("${path}/home/product/features/integrations")) return path
    }
    return null
}

Closure<Map<String, Object>> xmlTranslation = { Object node, String language ->
    Object translation = node.children().find { Object child ->
        child.name().toString() == "j:translation_${language}"
    }
    if (translation == null) return [:]
    Map<String, Object> values = [:]
    for (String name : [
            "jcr:title", "description", "body", "shortDescription", "website",
            "partnerLevel", "aboutTitle", "expertiseTitle", "partnership", "scope",
            "quote", "quoteAuthor", "quoteAuthorTitle"
    ]) {
        String value = translation.attributes()[name]?.toString()
        if (value) values[name] = value
    }
    String iconPath = translation.attributes()["icon"]?.toString()
    if (iconPath) values.iconPath = iconPath
    return values
}
Closure<Void> loadExport = { String fileName, boolean cards ->
    File exportFile = [
            new File("/mnt/imports/${fileName}"),
            new File("/tmp/imports/${fileName}")
    ].find { File candidate -> candidate.isFile() }
    if (exportFile == null) {
        logger.warn("Partner export {} is unavailable", fileName)
        return null
    }
    ZipFile zip = new ZipFile(exportFile)
    try {
        def entry = zip.getEntry("repository.xml")
        if (entry == null) throw new RepositoryException("Missing repository.xml in ${exportFile}")
        Object root = new XmlSlurper(false, false).parse(zip.getInputStream(entry))
        Closure<Void> visitXml
        visitXml = { Object node, String path ->
            String name = node.name().toString()
            String currentPath = "${path}/${name}"
            String primaryType = node.attributes()["jcr:primaryType"]?.toString()
            if (cards && primaryType == "jahiacom:card" &&
                    technologies.any { Map<String, Object> item -> item.card == name }) {
                publishedCards[name] = [
                        name: name,
                        en  : xmlTranslation(node, "en"),
                        fr  : xmlTranslation(node, "fr")
                ]
            }
            if (!cards && primaryType == "jahiacom:partner") {
                String countriesValue = node.attributes()["countries"]?.toString()
                publishedSolutions.add([
                        sourcePath          : currentPath,
                        name                : name,
                        certification       : node.attributes()["certification"]?.toString() ?: "silver",
                        countries           : countriesValue
                                ? countriesValue.split("\\s+").findAll { String value -> value }
                                : ["ZZ"],
                        logoPath            : node.attributes()["logo"]?.toString(),
                        partnerLocationsData: node.attributes()["partnerLocationsData"]?.toString(),
                        en                  : xmlTranslation(node, "en"),
                        fr                  : xmlTranslation(node, "fr")
                ])
            }
            node.children().each { Object child -> visitXml(child, currentPath) }
            return null
        }
        visitXml(root, "")
    } finally {
        zip.close()
    }
    return null
}
loadExport("home.zip", true)
loadExport("implementation-partners.zip", false)
logger.info(
        "Loaded {} integration cards and {} Solution Partner contents from Jahia exports",
        publishedCards.size(),
        publishedSolutions.size())

JCRTemplate.getInstance().doExecuteWithSystemSession(
        null,
        Constants.LIVE_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                Set<String> cardNames = technologies.collect { Map<String, Object> item ->
                    item.card as String
                } as Set<String>
                Closure<String> scalar = { JCRNodeWrapper node, String name ->
                    node != null && node.hasProperty(name)
                            ? node.getProperty(name).getString()
                            : null
                }
                Closure<List<String>> strings = { JCRNodeWrapper node, String name ->
                    node != null && node.hasProperty(name)
                            ? node.getProperty(name).getValues().collect { Value value -> value.getString() }
                            : []
                }
                Closure<Map<String, Object>> localized = { JCRNodeWrapper node, String language ->
                    String translationName = "j:translation_${language}"
                    if (!node.hasNode(translationName)) return [:]
                    JCRNodeWrapper translation = (JCRNodeWrapper) node.getNode(translationName)
                    Map<String, Object> values = [:]
                    for (String name : [
                            "jcr:title", "description", "body", "shortDescription", "website",
                            "partnerLevel", "aboutTitle", "expertiseTitle", "partnership", "scope",
                            "quote", "quoteAuthor", "quoteAuthorTitle"
                    ]) {
                        String value = scalar(translation, name)
                        if (value != null) values[name] = value
                    }
                    if (translation.hasProperty("icon")) {
                        values.iconIdentifier = translation.getProperty("icon").getNode().getIdentifier()
                    }
                    return values
                }
                Closure<Void> visit
                visit = { JCRNodeWrapper node ->
                    if (node.isNodeType("jahiacom:card") && cardNames.contains(node.getName())) {
                        publishedCards.putIfAbsent(node.getName(), [
                                name: node.getName(),
                                en  : localized(node, "en"),
                                fr  : localized(node, "fr")
                        ])
                    }
                    if (node.isNodeType("jahiacom:partner") &&
                            !node.getPath().contains("/contents/technology-partners/") &&
                            !node.getPath().contains("/contents/solution-partners/") &&
                            (!node.hasProperty("partnerType") ||
                                    node.getProperty("partnerType").getString() != "technology")) {
                        String logoIdentifier = node.hasProperty("logo")
                                ? node.getProperty("logo").getNode().getIdentifier()
                                : null
                        if (!publishedSolutions.any { Map<String, Object> snapshot ->
                            snapshot.sourcePath == node.getPath()
                        }) publishedSolutions.add([
                                sourcePath          : node.getPath(),
                                name                : node.getName(),
                                certification       : scalar(node, "certification") ?: "silver",
                                countries           : strings(node, "countries"),
                                logoIdentifier      : logoIdentifier,
                                partnerLocationsData: scalar(node, "partnerLocationsData"),
                                en                  : localized(node, "en"),
                                fr                  : localized(node, "fr")
                        ])
                    }
                    NodeIterator children = node.getNodes()
                    while (children.hasNext()) visit((JCRNodeWrapper) children.nextNode())
                    return null
                }
                String sourceSiteRoot = partnerSiteRoot(session)
                if (sourceSiteRoot != null) {
                    visit((JCRNodeWrapper) session.getNode(sourceSiteRoot))
                }

                logger.info(
                        "Captured {} published integration cards and {} published Solution Partner contents",
                        publishedCards.size(),
                        publishedSolutions.size())
                return null
            }
        })

if (publishedCards.size() != technologies.size() || publishedSolutions.size() < 32) {
    logger.error(
            "Partner directory migration aborted without modifying content: expected {} Technology cards and at least 32 Solution Partners, captured {} and {}",
            technologies.size(),
            publishedCards.size(),
            publishedSolutions.size())
    return
}

JCRTemplate.getInstance().doExecuteWithSystemSession(
        null,
        Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
                @Override
                Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                    String siteRoot = partnerSiteRoot(session)
                    if (siteRoot == null) {
                        logger.warn("Partner directory migration skipped: no site contains both Partner pages")
                        return null
                    }
                    Map<String, JCRNodeWrapper> categories = ensureCategories(session)
                    JCRNodeWrapper solutionRoot = ensureFolder(
                            session,
                            "${siteRoot}/contents",
                            "solution-partners")
                    ensureSolutionPartners(solutionRoot, publishedSolutions)
                    migrateSolutionPartners(solutionRoot)
                    JCRNodeWrapper technologyRoot = ensureFolder(
                            session,
                            "${siteRoot}/contents",
                            "technology-partners")
                    logger.info(
                            "Partner migration discovered {} of {} Technology Partner source cards in {}",
                            publishedCards.size(),
                            technologies.size(),
                            Constants.EDIT_WORKSPACE)

                    int createdOrUpdated = 0
                    for (Map<String, Object> item : technologies) {
                        Map<String, Object> source = publishedCards[item.card as String]
                        if (source == null) {
                            logger.warn("Technology Partner source card {} is missing", item.card)
                            continue
                        }
                        JCRNodeWrapper partner = ensurePartner(
                                technologyRoot,
                                item.partner as String,
                                ((List<String>) item.categories).collect { String name -> categories[name] },
                                true)
                        copyCardSnapshot(source, partner)
                        createdOrUpdated++
                    }

                    Map<String, Object> efficy = publishedSolutions.find { Map<String, Object> partner ->
                        partner.name == "efficy"
                    }
                    if (efficy != null) {
                        JCRNodeWrapper technologyEfficy = ensurePartner(
                                technologyRoot,
                                "efficy",
                                [categories.crm],
                                false)
                        copyPartnerSnapshot(efficy, technologyEfficy)
                        createdOrUpdated++
                    } else {
                        logger.warn("Efficy source Partner is missing")
                    }

                    configurePages(session, siteRoot, technologyRoot, solutionRoot)
                    session.save()

                    Set<String> nodesToPublish = [] as Set<String>
                    nodesToPublish.add(technologyRoot.getIdentifier())
                    nodesToPublish.add(solutionRoot.getIdentifier())
                    for (JCRNodeWrapper partner : descendantsOfType(
                            technologyRoot,
                            "jahiacom:partner")) {
                        nodesToPublish.add(partner.getIdentifier())
                    }
                    if (!categories.isEmpty()) {
                        nodesToPublish.add(((JCRNodeWrapper) categories.values().iterator().next().getParent())
                                .getIdentifier())
                    }
                    for (JCRNodeWrapper partner : descendantsOfType(solutionRoot, "jahiacom:partner")) {
                        if (!partner.getPath().contains("/contents/technology-partners/") &&
                                (!partner.hasProperty("partnerType") ||
                                        partner.getProperty("partnerType").getString() != "technology")) {
                            nodesToPublish.add(partner.getIdentifier())
                        }
                    }
                    for (String pagePath : [
                            "${siteRoot}/home/resources/find-a-partner",
                            "${siteRoot}/home/product/features/integrations"
                    ]) {
                        if (session.nodeExists(pagePath)) {
                            nodesToPublish.add(session.getNode(pagePath).getIdentifier())
                        }
                    }
                    ServicesRegistry.getInstance().getJCRPublicationService().publish(
                            nodesToPublish.toList(),
                            Constants.EDIT_WORKSPACE,
                            Constants.LIVE_WORKSPACE,
                            null)
                    logger.info(
                            "Partner directories completed: {} Technology Partner content(s) ready; " +
                                    "{} content roots/pages queued for publication",
                            createdOrUpdated,
                            nodesToPublish.size())
                    return null
                }

                private Map<String, JCRNodeWrapper> ensureCategories(JCRSessionWrapper session)
                        throws RepositoryException {
                    String categoryRootPath = "/sites/systemsite/categories"
                    if (!session.nodeExists(categoryRootPath)) {
                        throw new RepositoryException("Missing Jahia category root ${categoryRootPath}")
                    }
                    JCRNodeWrapper root = (JCRNodeWrapper) session.getNode(categoryRootPath)
                    JCRNodeWrapper parent = root.hasNode("technology-partners")
                            ? (JCRNodeWrapper) root.getNode("technology-partners")
                            : (JCRNodeWrapper) root.addNode("technology-partners", "jnt:category")
                    setTranslation(parent, "en", ["jcr:title": "Technology Partners"])
                    setTranslation(parent, "fr", ["jcr:title": "Partenaires technologiques"])

                    Map<String, JCRNodeWrapper> result = [:]
                    for (Map.Entry<String, Map<String, String>> entry : categoryLabels.entrySet()) {
                        JCRNodeWrapper category = parent.hasNode(entry.key)
                                ? (JCRNodeWrapper) parent.getNode(entry.key)
                                : (JCRNodeWrapper) parent.addNode(entry.key, "jnt:category")
                        setTranslation(category, "en", ["jcr:title": entry.value.en])
                        setTranslation(category, "fr", ["jcr:title": entry.value.fr])
                        result[entry.key] = category
                    }
                    return result
                }

                private static void ensureSolutionPartners(
                        JCRNodeWrapper root,
                        List<Map<String, Object>> snapshots) throws RepositoryException {
                    for (Map<String, Object> snapshot : snapshots) {
                        String sourcePath = snapshot.sourcePath as String
                        String relative = sourcePath.contains("/implementation-partners/")
                                ? sourcePath.substring(sourcePath.indexOf("/implementation-partners/") + 25)
                                : sourcePath.substring(sourcePath.lastIndexOf("/") + 1)
                        String nodeName = relative
                                .replaceAll("[^A-Za-z0-9_-]+", "-")
                                .replaceAll("-+", "-")
                                .replaceAll('^-|-$', '')
                                .toLowerCase()
                        if (!nodeName) nodeName = snapshot.name as String
                        JCRNodeWrapper partner = root.hasNode(nodeName)
                                ? (JCRNodeWrapper) root.getNode(nodeName)
                                : (JCRNodeWrapper) root.addNode(nodeName, "jahiacom:partner")
                        partner.setProperty("certification", snapshot.certification as String)
                        List<String> countries = snapshot.countries as List<String>
                        partner.setProperty("countries", (countries ?: ["ZZ"]) as String[])
                        partner.setProperty("partnerType", "integrator")
                        partner.setProperty("integrationPartner", false)
                        String path = sourcePath.toLowerCase()
                        String region = path.contains("america") || path.contains("amérique")
                                ? "americas"
                                : path.contains("asia") || path.contains("asie") || path.contains("apac")
                                ? "apac"
                                : "europe"
                        partner.setProperty("regions", [region] as String[])
                        partner.setProperty(
                                "partnerLocationsData",
                                (snapshot.partnerLocationsData as String) ?: JsonOutput.toJson([[region: region]]))
                        setWeakReferenceByIdentifier(
                                partner,
                                "logo",
                                snapshot.logoIdentifier as String)
                        setWeakReferenceByPath(
                                partner,
                                "logo",
                                snapshot.logoPath as String)
                        applyLocalizedSnapshot(partner, "en", snapshot.en as Map<String, Object>)
                        applyLocalizedSnapshot(partner, "fr", snapshot.fr as Map<String, Object>)
                    }
                }

                private static void copyCardSnapshot(
                        Map<String, Object> snapshot,
                        JCRNodeWrapper target) throws RepositoryException {
                    Map<String, Object> english = snapshot.en as Map<String, Object>
                    Map<String, Object> french = snapshot.fr as Map<String, Object>
                    String logoIdentifier = (english.iconIdentifier ?: french.iconIdentifier) as String
                    setWeakReferenceByIdentifier(target, "logo", logoIdentifier)
                    String logoPath = (english.iconPath ?: french.iconPath) as String
                    setWeakReferenceByPath(target, "logo", logoPath)
                    for (String language : ["en", "fr"]) {
                        Map<String, Object> source = (snapshot[language] ?: english ?: french) as Map<String, Object>
                        String title = (source["jcr:title"] ?: snapshot.name) as String
                        String body = (source.body ?: "<p>${title}</p>") as String
                        setTranslation(target, language, [
                                "jcr:title"       : title,
                                "description"     : body,
                                "shortDescription": plainText(body).take(240),
                                "aboutTitle"      : title,
                                "expertiseTitle"  : language == "fr"
                                        ? "Technologies et intégration"
                                        : "Technology and integration"
                        ])
                    }
                }

                private static void copyPartnerSnapshot(
                        Map<String, Object> snapshot,
                        JCRNodeWrapper target) throws RepositoryException {
                    setWeakReferenceByIdentifier(
                            target,
                            "logo",
                            snapshot.logoIdentifier as String)
                    setWeakReferenceByPath(
                            target,
                            "logo",
                            snapshot.logoPath as String)
                    applyLocalizedSnapshot(target, "en", snapshot.en as Map<String, Object>)
                    applyLocalizedSnapshot(target, "fr", snapshot.fr as Map<String, Object>)
                }

                private static void applyLocalizedSnapshot(
                        JCRNodeWrapper target,
                        String language,
                        Map<String, Object> snapshot) throws RepositoryException {
                    if (snapshot == null || snapshot.isEmpty()) return
                    String title = (snapshot["jcr:title"] ?: target.getName()) as String
                    String description = (snapshot.description ?: "<p>${title}</p>") as String
                    Map<String, String> values = [
                            "jcr:title"       : title,
                            "description"     : description,
                            "shortDescription": (snapshot.shortDescription
                                    ?: plainText(description).take(240)) as String,
                            "aboutTitle"      : (snapshot.aboutTitle ?: title) as String
                    ]
                    for (String name : [
                            "website", "partnerLevel", "expertiseTitle", "partnership", "scope",
                            "quote", "quoteAuthor", "quoteAuthorTitle"
                    ]) {
                        if (snapshot[name] != null) values[name] = snapshot[name] as String
                    }
                    setTranslation(target, language, values)
                }

                private static void setWeakReferenceByIdentifier(
                        JCRNodeWrapper target,
                        String propertyName,
                        String identifier) throws RepositoryException {
                    if (!identifier) return
                    try {
                        target.setProperty(
                                propertyName,
                                target.getSession().getValueFactory().createValue(
                                        target.getSession().getNodeByIdentifier(identifier),
                                        true))
                    } catch (RepositoryException ignored) {
                        // The card/Partner remains usable when an imported logo asset is unavailable.
                    }
                }

                private static void setWeakReferenceByPath(
                        JCRNodeWrapper target,
                        String propertyName,
                        String path) throws RepositoryException {
                    if (!path || !target.getSession().nodeExists(path)) return
                    target.setProperty(
                            propertyName,
                            target.getSession().getValueFactory().createValue(
                                    target.getSession().getNode(path),
                                    true))
                }

                private static void migrateSolutionPartners(JCRNodeWrapper solutionRoot)
                        throws RepositoryException {
                    for (JCRNodeWrapper partner : descendantsOfType(solutionRoot, "jahiacom:partner")) {
                        partner.setProperty("partnerType", "integrator")
                        partner.setProperty("integrationPartner", false)
                        if (!partner.hasProperty("partnerLocationsData") ||
                                !partner.getProperty("partnerLocationsData").getString().trim()) {
                            String path = partner.getPath().toLowerCase()
                            String region = path.contains("america") || path.contains("amérique")
                                    ? "americas"
                                    : path.contains("asia") || path.contains("asie") || path.contains("apac")
                                    ? "apac"
                                    : "europe"
                            List<String> countries = values(partner, "countries")
                                    .findAll { String country -> country != "ZZ" }
                            List<Map<String, String>> locations = countries.isEmpty()
                                    ? [[region: region]]
                                    : countries.collect { String country -> [region: region, country: country] }
                            partner.setProperty("partnerLocationsData", JsonOutput.toJson(locations))
                        }
                        enrichPartnerTranslation(partner, "en")
                        enrichPartnerTranslation(partner, "fr")
                    }
                }

                private static void enrichPartnerTranslation(JCRNodeWrapper partner, String language)
                        throws RepositoryException {
                    JCRNodeWrapper translation = translation(partner, language, false)
                    if (translation == null) return
                    String title = property(translation, "jcr:title") ?: partner.getName()
                    String description = property(translation, "description") ?: ""
                    if (!translation.hasProperty("shortDescription") && description) {
                        translation.setProperty("shortDescription", plainText(description).take(240))
                    }
                    if (!translation.hasProperty("aboutTitle")) {
                        translation.setProperty("aboutTitle", title)
                    }
                }

                private static JCRNodeWrapper ensureFolder(
                        JCRSessionWrapper session,
                        String parentPath,
                        String name) throws RepositoryException {
                    if (!session.nodeExists(parentPath)) {
                        throw new RepositoryException("Missing content root ${parentPath}")
                    }
                    JCRNodeWrapper parent = (JCRNodeWrapper) session.getNode(parentPath)
                    return parent.hasNode(name)
                            ? (JCRNodeWrapper) parent.getNode(name)
                            : (JCRNodeWrapper) parent.addNode(name, "jnt:contentFolder")
                }

                private static JCRNodeWrapper ensurePartner(
                        JCRNodeWrapper root,
                        String name,
                        List<JCRNodeWrapper> categories,
                        boolean integration) throws RepositoryException {
                    JCRNodeWrapper partner = root.hasNode(name)
                            ? (JCRNodeWrapper) root.getNode(name)
                            : (JCRNodeWrapper) root.addNode(name, "jahiacom:partner")
                    partner.setProperty("certification", "silver")
                    partner.setProperty("countries", ["ZZ"] as String[])
                    partner.setProperty("partnerType", "technology")
                    partner.setProperty("integrationPartner", integration)
                    partner.setProperty("regions", ["europe"] as String[])
                    partner.setProperty("partnerLocationsData", JsonOutput.toJson([[region: "europe"]]))
                    Value[] tags = categories.findAll { JCRNodeWrapper category -> category != null }
                            .collect { JCRNodeWrapper category ->
                                root.getSession().getValueFactory().createValue(category, true)
                            } as Value[]
                    partner.setProperty("tags", tags)
                    return partner
                }

                private static void copyCardContent(JCRNodeWrapper source, JCRNodeWrapper target)
                        throws RepositoryException {
                    JCRNodeWrapper english = translation(source, "en", false)
                    JCRNodeWrapper french = translation(source, "fr", false)
                    JCRNodeWrapper logoSource = english ?: french
                    if (logoSource != null && logoSource.hasProperty("icon")) {
                        target.setProperty(
                                "logo",
                                target.getSession().getValueFactory().createValue(
                                        logoSource.getProperty("icon").getNode(),
                                        true))
                    }
                    copyCardTranslation(english, target, "en", null)
                    copyCardTranslation(french, target, "fr", english)
                }

                private static void copyCardTranslation(
                        JCRNodeWrapper source,
                        JCRNodeWrapper target,
                        String language,
                        JCRNodeWrapper fallback) throws RepositoryException {
                    JCRNodeWrapper effective = source ?: fallback
                    if (effective == null) return
                    String title = property(effective, "jcr:title") ?: target.getName()
                    String body = property(effective, "body") ?: "<p>${title}</p>"
                    setTranslation(target, language, [
                            "jcr:title"       : title,
                            "description"     : body,
                            "shortDescription": plainText(body).take(240),
                            "aboutTitle"      : title,
                            "expertiseTitle"  : language == "fr"
                                    ? "Technologies et intégration"
                                    : "Technology and integration"
                    ])
                }

                private static JCRNodeWrapper findPartner(JCRNodeWrapper solutionRoot, String name)
                        throws RepositoryException {
                    for (JCRNodeWrapper partner : descendantsOfType(solutionRoot, "jahiacom:partner")) {
                        if (partner.getName() == name) {
                            return partner
                        }
                    }
                    return null
                }

                private static List<JCRNodeWrapper> descendantsOfType(
                        JCRNodeWrapper root,
                        String nodeType) throws RepositoryException {
                    if (root == null) return []
                    List<JCRNodeWrapper> result = []
                    collectDescendantsOfType(root, nodeType, result)
                    return result
                }

                private static void collectDescendantsOfType(
                        JCRNodeWrapper root,
                        String nodeType,
                        List<JCRNodeWrapper> result) throws RepositoryException {
                    NodeIterator children = root.getNodes()
                    while (children.hasNext()) {
                        JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
                        if (child.isNodeType(nodeType)) result.add(child)
                        collectDescendantsOfType(child, nodeType, result)
                    }
                }

                private static void copyPartnerContent(JCRNodeWrapper source, JCRNodeWrapper target)
                        throws RepositoryException {
                    if (source.hasProperty("logo")) {
                        target.setProperty(
                                "logo",
                                target.getSession().getValueFactory().createValue(
                                        source.getProperty("logo").getNode(),
                                        true))
                    }
                    for (String language : ["en", "fr"]) {
                        JCRNodeWrapper sourceTranslation = translation(source, language, false)
                        if (sourceTranslation == null) continue
                        String title = property(sourceTranslation, "jcr:title") ?: "Efficy"
                        String description = property(sourceTranslation, "description") ?: "<p>${title}</p>"
                        setTranslation(target, language, [
                                "jcr:title"       : title,
                                "description"     : description,
                                "shortDescription": plainText(description).take(240),
                                "aboutTitle"      : title,
                                "expertiseTitle"  : language == "fr"
                                        ? "CRM et expérience client"
                                        : "CRM and customer experience"
                        ])
                    }
                }

                private static void configurePages(
                        JCRSessionWrapper session,
                        String siteRoot,
                        JCRNodeWrapper technologyRoot,
                        JCRNodeWrapper solutionRoot) throws RepositoryException {
                    String solutionPagePath = "${siteRoot}/home/resources/find-a-partner"
                    if (session.nodeExists(solutionPagePath)) {
                        JCRNodeWrapper page = (JCRNodeWrapper) session.getNode(solutionPagePath)
                        setTranslation(page, "en", ["jcr:title": "Solution Partners"])
                        setTranslation(page, "fr", ["jcr:title": "Partenaires Solution"])
                        JCRNodeWrapper main = (JCRNodeWrapper) page.getNode("main")
                        JCRNodeWrapper hero = firstChildOfType(main, "jahiacom:heroWithImage")
                        if (hero != null) {
                            setTranslation(hero, "en", [
                                    "jcr:title": "Find the right Solution Partner",
                                    "subtitle": "<p>Work with a Jahia-certified integrator or agency in your region.</p>"
                            ])
                            setTranslation(hero, "fr", [
                                    "jcr:title": "Trouvez le bon partenaire Solution",
                                    "subtitle": "<p>Collaborez avec un intégrateur ou une agence certifiée Jahia dans votre région.</p>"
                            ])
                        }
                        JCRNodeWrapper section = firstChildOfType(main, "jahiacom:section")
                        if (section == null) {
                            section = (JCRNodeWrapper) main.addNode("solution-partners", "jahiacom:section")
                            configureSection(section)
                        }
                        removeRenderableChildren(section)
                        setTranslation(section, "en", [
                                "jcr:title": "Solution Partners",
                                "subtitle": "<p>Find the right partner for your market and your Jahia project.</p>"
                        ])
                        setTranslation(section, "fr", [
                                "jcr:title": "Partenaires Solution",
                                "subtitle": "<p>Trouvez le partenaire adapté à votre marché et à votre projet Jahia.</p>"
                        ])
                        JCRNodeWrapper directory = (JCRNodeWrapper) section.addNode(
                                "partner-directory",
                                "jahiacom:partnerList")
                        directory.setProperty("directoryMode", "solution")
                        if (solutionRoot != null) {
                            directory.setProperty(
                                    "sourceRoot",
                                    session.getValueFactory().createValue(
                                            solutionRoot,
                                            true))
                        }
                    }

                    String technologyPagePath = "${siteRoot}/home/product/features/integrations"
                    if (session.nodeExists(technologyPagePath)) {
                        JCRNodeWrapper page = (JCRNodeWrapper) session.getNode(technologyPagePath)
                        setTranslation(page, "en", ["jcr:title": "Technology Partners"])
                        setTranslation(page, "fr", ["jcr:title": "Partenaires technologiques"])
                        JCRNodeWrapper main = (JCRNodeWrapper) page.getNode("main")
                        JCRNodeWrapper heroToKeep = firstChildOfType(main, "jahiacom:heroWithImage")
                        List<JCRNodeWrapper> obsolete = []
                        NodeIterator children = main.getNodes()
                        while (children.hasNext()) {
                            JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
                            if ((heroToKeep == null || child.getIdentifier() != heroToKeep.getIdentifier()) &&
                                    !child.getName().startsWith("j:translation_")) {
                                obsolete.add(child)
                            }
                        }
                        obsolete.each { JCRNodeWrapper child -> child.remove() }
                        JCRNodeWrapper section = (JCRNodeWrapper) main.addNode(
                                "technology-partners",
                                "jahiacom:section")
                        configureSection(section)
                        setTranslation(section, "en", [
                                "jcr:title": "Technology Partners",
                                "subtitle": "<p>Explore Jahia integrations by technology and relationship type.</p>"
                        ])
                        setTranslation(section, "fr", [
                                "jcr:title": "Partenaires technologiques",
                                "subtitle": "<p>Explorez les intégrations Jahia par technologie et par type de partenariat.</p>"
                        ])
                        JCRNodeWrapper directory = (JCRNodeWrapper) section.addNode(
                                "partner-directory",
                                "jahiacom:partnerList")
                        directory.setProperty("directoryMode", "technology")
                        directory.setProperty(
                                "sourceRoot",
                                session.getValueFactory().createValue(technologyRoot, true))
                    }
                }

                private static void configureSection(JCRNodeWrapper section) throws RepositoryException {
                    section.setProperty("columns", "100")
                    section.setProperty("width", "100")
                    section.setProperty("gap", "1")
                    section.setProperty("theme", "day")
                    section.setProperty("ctaType", "none")
                    section.setProperty("ctaVariant", "primary")
                }

                private static JCRNodeWrapper firstChildOfType(JCRNodeWrapper parent, String nodeType)
                        throws RepositoryException {
                    NodeIterator children = parent.getNodes()
                    while (children.hasNext()) {
                        JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
                        if (child.isNodeType(nodeType)) return child
                    }
                    return null
                }

                private static void removeRenderableChildren(JCRNodeWrapper parent)
                        throws RepositoryException {
                    List<JCRNodeWrapper> childrenToRemove = []
                    NodeIterator children = parent.getNodes()
                    while (children.hasNext()) {
                        JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
                        if (!child.getName().startsWith("j:translation_")) {
                            childrenToRemove.add(child)
                        }
                    }
                    childrenToRemove.each { JCRNodeWrapper child -> child.remove() }
                }

                private static void setTranslation(
                        JCRNodeWrapper node,
                        String language,
                        Map<String, String> properties) throws RepositoryException {
                    JCRNodeWrapper translation = translation(node, language, true)
                    for (Map.Entry<String, String> property : properties.entrySet()) {
                        translation.setProperty(property.key, property.value)
                    }
                }

                private static JCRNodeWrapper translation(
                        JCRNodeWrapper node,
                        String language,
                        boolean create) throws RepositoryException {
                    String name = "j:translation_${language}"
                    if (node.hasNode(name)) return (JCRNodeWrapper) node.getNode(name)
                    if (!create) return null
                    JCRNodeWrapper translation = (JCRNodeWrapper) node.addNode(name, "jnt:translation")
                    if (!translation.isNodeType("mix:title")) translation.addMixin("mix:title")
                    translation.setProperty("jcr:language", language)
                    return translation
                }

                private static List<String> values(JCRNodeWrapper node, String propertyName)
                        throws RepositoryException {
                    if (!node.hasProperty(propertyName)) return []
                    return node.getProperty(propertyName).getValues().collect { Value value ->
                        value.getString().trim()
                    }
                }

                private static String property(JCRNodeWrapper node, String name)
                        throws RepositoryException {
                    return node != null && node.hasProperty(name)
                            ? node.getProperty(name).getString()
                            : null
                }

                private static String plainText(String html) {
                    return (html ?: "")
                            .replaceAll("<[^>]+>", " ")
                            .replace("&nbsp;", " ")
                            .replace("&amp;", "&")
                            .replace("&#39;", "'")
                            .replaceAll("\\s+", " ")
                            .trim()
                }
            })

JCRTemplate.getInstance().doExecuteWithSystemSession(
        null,
        Constants.LIVE_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                String siteRoot = partnerSiteRoot(session)
                if (siteRoot == null) {
                    logger.warn("Partner live alignment skipped: no site contains both Partner pages")
                    return null
                }
                for (String generatedRoot : [
                        "${siteRoot}/contents/technology-partners",
                        "${siteRoot}/contents/solution-partners"
                ]) {
                    if (session.nodeExists(generatedRoot)) {
                        session.getNode(generatedRoot).remove()
                    }
                    session.save()
                    session.getWorkspace().clone(
                            Constants.EDIT_WORKSPACE,
                            generatedRoot,
                            generatedRoot,
                            true)
                }
                Closure<JCRNodeWrapper> translation = { JCRNodeWrapper node, String language ->
                    String name = "j:translation_${language}"
                    if (node.hasNode(name)) return (JCRNodeWrapper) node.getNode(name)
                    JCRNodeWrapper value = (JCRNodeWrapper) node.addNode(name, "jnt:translation")
                    if (!value.isNodeType("mix:title")) value.addMixin("mix:title")
                    value.setProperty("jcr:language", language)
                    return value
                }
                Closure<Void> setLocalized = {
                    JCRNodeWrapper node,
                    String language,
                    Map<String, String> properties ->
                    JCRNodeWrapper value = translation(node, language)
                    properties.each { String name, String propertyValue ->
                        value.setProperty(name, propertyValue)
                    }
                    return null
                }
                Closure<JCRNodeWrapper> keepHeroAndClear = { JCRNodeWrapper main ->
                    JCRNodeWrapper hero = null
                    List<JCRNodeWrapper> remove = []
                    NodeIterator children = main.getNodes()
                    while (children.hasNext()) {
                        JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode()
                        if (child.getName().startsWith("j:translation_")) continue
                        if (hero == null && child.isNodeType("jahiacom:heroWithImage")) {
                            hero = child
                        } else {
                            remove.add(child)
                        }
                    }
                    remove.each { JCRNodeWrapper child -> child.remove() }
                    return hero
                }
                Closure<Void> configureSection = { JCRNodeWrapper section ->
                    section.setProperty("columns", "100")
                    section.setProperty("width", "100")
                    section.setProperty("gap", "1")
                    section.setProperty("theme", "day")
                    section.setProperty("ctaType", "none")
                    section.setProperty("ctaVariant", "primary")
                    return null
                }

                String solutionPagePath = "${siteRoot}/home/resources/find-a-partner"
                String solutionRootPath = "${siteRoot}/contents/solution-partners"
                if (session.nodeExists(solutionPagePath) && session.nodeExists(solutionRootPath)) {
                    JCRNodeWrapper page = (JCRNodeWrapper) session.getNode(solutionPagePath)
                    setLocalized(page, "en", ["jcr:title": "Solution Partners"])
                    setLocalized(page, "fr", ["jcr:title": "Partenaires Solution"])
                    JCRNodeWrapper main = (JCRNodeWrapper) page.getNode("main")
                    JCRNodeWrapper hero = keepHeroAndClear(main)
                    if (hero != null) {
                        setLocalized(hero, "en", [
                                "jcr:title": "Find the right Solution Partner",
                                "subtitle": "<p>Work with a Jahia-certified integrator or agency in your region.</p>"
                        ])
                        setLocalized(hero, "fr", [
                                "jcr:title": "Trouvez le bon partenaire Solution",
                                "subtitle": "<p>Collaborez avec un intégrateur ou une agence certifiée Jahia dans votre région.</p>"
                        ])
                    }
                    JCRNodeWrapper section = (JCRNodeWrapper) main.addNode(
                            "solution-partners",
                            "jahiacom:section")
                    configureSection(section)
                    setLocalized(section, "en", [
                            "jcr:title": "Solution Partners",
                            "subtitle": "<p>Find the right partner for your market and your Jahia project.</p>"
                    ])
                    setLocalized(section, "fr", [
                            "jcr:title": "Partenaires Solution",
                            "subtitle": "<p>Trouvez le partenaire adapté à votre marché et à votre projet Jahia.</p>"
                    ])
                    JCRNodeWrapper directory = (JCRNodeWrapper) section.addNode(
                            "partner-directory",
                            "jahiacom:partnerList")
                    directory.setProperty("directoryMode", "solution")
                    directory.setProperty(
                            "sourceRoot",
                            session.getValueFactory().createValue(
                                    session.getNode(solutionRootPath),
                                    true))
                }

                String technologyPagePath = "${siteRoot}/home/product/features/integrations"
                String technologyRootPath = "${siteRoot}/contents/technology-partners"
                if (session.nodeExists(technologyPagePath) && session.nodeExists(technologyRootPath)) {
                    JCRNodeWrapper page = (JCRNodeWrapper) session.getNode(technologyPagePath)
                    setLocalized(page, "en", ["jcr:title": "Technology Partners"])
                    setLocalized(page, "fr", ["jcr:title": "Partenaires technologiques"])
                    JCRNodeWrapper main = (JCRNodeWrapper) page.getNode("main")
                    keepHeroAndClear(main)
                    JCRNodeWrapper section = (JCRNodeWrapper) main.addNode(
                            "technology-partners",
                            "jahiacom:section")
                    configureSection(section)
                    setLocalized(section, "en", [
                            "jcr:title": "Technology Partners",
                            "subtitle": "<p>Explore Jahia integrations by technology and relationship type.</p>"
                    ])
                    setLocalized(section, "fr", [
                            "jcr:title": "Partenaires technologiques",
                            "subtitle": "<p>Explorez les intégrations Jahia par technologie et par type de partenariat.</p>"
                    ])
                    JCRNodeWrapper directory = (JCRNodeWrapper) section.addNode(
                            "partner-directory",
                            "jahiacom:partnerList")
                    directory.setProperty("directoryMode", "technology")
                    directory.setProperty(
                            "sourceRoot",
                            session.getValueFactory().createValue(
                                    session.getNode(technologyRootPath),
                                    true))
                }
                session.save()
                logger.info(
                        "Cloned both Partner content trees to live and aligned their public directory pages")
                return null
            }
        })
