import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate
import groovy.transform.Field

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException

@Field final Set<String> strategicTechnologyPartners = [
        "claude", "chatgpt", "salesforce", "akeneo", "contentsquare"
] as Set<String>

JCRNodeWrapper translation(JCRNodeWrapper node, String language) {
    String name = "j:translation_" + language
    JCRNodeWrapper result = node.hasNode(name)
            ? (JCRNodeWrapper) node.getNode(name)
            : (JCRNodeWrapper) node.addNode(name, "jnt:translation")
    result.setProperty("jcr:language", language)
    return result
}

JCRNodeWrapper media(JCRSessionWrapper session, String activeSiteRoot, String relativePath) {
    String path = "${activeSiteRoot}/files/${relativePath}"
    return session.nodeExists(path) ? (JCRNodeWrapper) session.getNode(path) : null
}

void configureSection(JCRNodeWrapper section, String columns, String width) {
    section.setProperty("columns", columns)
    section.setProperty("width", width)
    section.setProperty("gap", "1")
    section.setProperty("ctaType", "none")
}

void setSection(JCRNodeWrapper section, String language, String eyebrow, String title, String subtitle) {
    JCRNodeWrapper value = translation(section, language)
    if (eyebrow) value.setProperty("eyebrow", eyebrow)
    value.setProperty("jcr:title", title)
    value.setProperty("subtitle", subtitle)
}

void setCard(JCRSessionWrapper session, String activeSiteRoot, JCRNodeWrapper section, Map<String, Object> item) {
    String name = (String) item.name
    JCRNodeWrapper card = section.hasNode(name)
            ? (JCRNodeWrapper) section.getNode(name)
            : (JCRNodeWrapper) section.addNode(name, "jahiacom:card")
    card.setProperty("ctaType", "none")
    if (item.region) card.setProperty("partnerRegionTarget", (String) item.region)
    JCRNodeWrapper icon = item.icon ? media(session, activeSiteRoot, (String) item.icon) : null
    for (String language : ["en", "fr"]) {
        JCRNodeWrapper value = translation(card, language)
        value.setProperty("jcr:title", (String) item["title_" + language])
        value.setProperty("body", (String) item["body_" + language])
        if (icon != null) value.setProperty("icon", icon)
    }
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

JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE,
        new JCRCallback<Object>() {
            @Override
            Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
                for (String activeSiteRoot : ["/sites/jahiacom", "/sites/mySite"]) {
                String solutionPagePath = "${activeSiteRoot}/home/resources/find-a-partner"
                String technologyRootPath = "${activeSiteRoot}/contents/technology-partners"

                if (session.nodeExists(solutionPagePath + "/main")) {
                    JCRNodeWrapper main = (JCRNodeWrapper) session.getNode(solutionPagePath + "/main")
                    JCRNodeWrapper directory = findDescendantOfType(main, "jahiacom:partnerList")

                    JCRNodeWrapper intro = main.hasNode("solution-partner-intro")
                            ? (JCRNodeWrapper) main.getNode("solution-partner-intro")
                            : (JCRNodeWrapper) main.addNode("solution-partner-intro", "jahiacom:section")
                    configureSection(intro, "100", "75")
                    setSection(intro, "en", null, "Certified experts for your projects", "<p>A <strong>Solution Partner</strong> is a company trained and certified by Jahia—an integrator, digital services company or agency—that manages your project end to end with consultants who know the platform.</p>")
                    setSection(intro, "fr", null, "Des experts certifiés pour vos projets", "<p>Un <strong>Solution Partner</strong> est une entreprise formée et certifiée par Jahia — intégrateur, ESN ou agence — qui prend en charge votre projet de bout en bout et mobilise des consultants experts de la plateforme.</p>")

                    JCRNodeWrapper services = main.hasNode("partner-types")
                            ? (JCRNodeWrapper) main.getNode("partner-types")
                            : (JCRNodeWrapper) main.addNode("partner-types", "jahiacom:section")
                    configureSection(services, "33-33-33", "100")
                    setSection(services, "en", "What they do", "End-to-end support, at every stage", "<p>Our Solution Partners cover the full lifecycle of your Jahia project.</p>")
                    setSection(services, "fr", "Ce qu’ils font", "Un accompagnement complet, à chaque étape", "<p>Nos Solution Partners couvrent tout le cycle de vie de votre projet Jahia.</p>")
                    [
                            [name: "consulting", icon: "ICON/Small/site", title_en: "Consulting & planning", title_fr: "Conseil et cadrage", body_en: "<p>Digital strategy, architecture, functional and technical planning.</p>", body_fr: "<p>Stratégie digitale, architecture, cadrage fonctionnel et technique de votre projet.</p>"],
                            [name: "development", icon: "ICON/Small/Puzzle 2.png", title_en: "Development & integration", title_fr: "Développement et intégration", body_en: "<p>Custom development, UX/UI design and integration into your ecosystem.</p>", body_fr: "<p>Développement sur mesure, design UX/UI et intégration à votre écosystème.</p>"],
                            [name: "operations", icon: "ICON/Small/Cloud.png", title_en: "Deployment & managed services", title_fr: "Déploiement et TMA", body_en: "<p>Production launch, team training and application maintenance.</p>", body_fr: "<p>Mise en production, formation des équipes et maintenance applicative dans la durée.</p>"]
                    ].each { setCard(session, activeSiteRoot, services, (Map<String, Object>) it) }

                    JCRNodeWrapper regions = main.hasNode("partner-nearby")
                            ? (JCRNodeWrapper) main.getNode("partner-nearby")
                            : (JCRNodeWrapper) main.addNode("partner-nearby", "jahiacom:section")
                    configureSection(regions, "33-33-33", "100")
                    setSection(regions, "en", "International coverage", "Partners close to you", "<p>Select a region to view the relevant certified partners.</p>")
                    setSection(regions, "fr", "Une couverture internationale", "Des partenaires proches de vous", "<p>Sélectionnez une région pour afficher les partenaires certifiés correspondants.</p>")
                    [
                            [name: "europe", region: "europe", title_en: "Europe & MEA", title_fr: "Europe et Moyen-Orient", body_en: "<p><strong data-partner-region-count=\"europe\">0</strong> partners</p>", body_fr: "<p><strong data-partner-region-count=\"europe\">0</strong> partenaires</p>"],
                            [name: "americas", region: "americas", title_en: "Americas", title_fr: "Amériques", body_en: "<p><strong data-partner-region-count=\"americas\">0</strong> partners</p>", body_fr: "<p><strong data-partner-region-count=\"americas\">0</strong> partenaires</p>"],
                            [name: "apac", region: "apac", title_en: "Asia-Pacific", title_fr: "Asie-Pacifique", body_en: "<p><strong data-partner-region-count=\"apac\">0</strong> partners</p>", body_fr: "<p><strong data-partner-region-count=\"apac\">0</strong> partenaires</p>"]
                    ].each { setCard(session, activeSiteRoot, regions, (Map<String, Object>) it) }

                    if (directory != null) {
                        JCRNodeWrapper directoryBlock = topLevelBlock(main, directory)
                        main.orderBefore("partner-nearby", directoryBlock.getName())
                    }
                    main.orderBefore("partner-types", "partner-nearby")
                    main.orderBefore("solution-partner-intro", "partner-types")
                }

                if (session.nodeExists(technologyRootPath)) {
                    JCRNodeWrapper technologyRoot = (JCRNodeWrapper) session.getNode(technologyRootPath)
                    for (JCRNodeWrapper partner : descendantsOfType(technologyRoot, "jahiacom:partner")) {
                        String name = partner.getName().toLowerCase()
                        boolean strategic = strategicTechnologyPartners.contains(name)
                        partner.setProperty("strategicPartner", strategic)
                        if (strategic) partner.setProperty("integrationPartner", false)
                        if (name == "efficy") partner.setProperty("partnerType", "integrator")
                    }
                }

                }

                session.save()
                log.info("Partner page refinements prepared in the edit workspace")
                return null
            }
        })
