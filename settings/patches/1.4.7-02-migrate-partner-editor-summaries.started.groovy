import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.NodeIterator
import javax.jcr.RepositoryException
import javax.jcr.query.Query

final def logger = log
final String contentRoot = "/sites/jahiacom/contents"
final List<String> languages = ["en", "fr"]

String textProperty(JCRNodeWrapper node, String propertyName) throws RepositoryException {
    return node.hasProperty(propertyName) ? node.getProperty(propertyName).getString()?.trim() : null
}

List<String> textValues(JCRNodeWrapper node, String propertyName) throws RepositoryException {
    if (!node.hasProperty(propertyName)) return []
    return node.getProperty(propertyName).getValues()
            .collect { value -> value.getString()?.trim() }
            .findAll { value -> value }
}

List<String> expertiseSentences(JCRNodeWrapper translation) throws RepositoryException {
    String expertiseText = textProperty(translation, "expertiseText")
    if (!expertiseText) return []
    return expertiseText.split(/\r?\n/)
            .collect { sentence -> sentence.trim() }
            .findAll { sentence -> sentence }
}

String summaryThroughCompleteSentence(List<String> sentences, int minimumLength) {
    List<String> selected = []
    for (String sentence : sentences) {
        selected.add(sentence)
        if (selected.join(" ").length() >= minimumLength) break
    }
    return selected.join(" ")
}

boolean isGeneratedExpertisePrefix(String summary, List<String> sentences) {
    if (!summary || summary.length() < 230 || sentences.isEmpty()) return false
    List<String> selected = []
    for (String sentence : sentences) {
        selected.add(sentence)
        if (selected.join(" ") == summary) return true
        if (selected.join(" ").length() > summary.length()) return false
    }
    return false
}

JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, new JCRCallback<Object>() {
    @Override
    Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
        if (!session.nodeExists(contentRoot)) {
            logger.info("Partner editor migration skipped: {} does not exist in the edit workspace", contentRoot)
            return null
        }

        int expertiseMigrated = 0
        int cardSummariesCreated = 0
        int generatedCardSummariesShortened = 0
        int editorialCardSummariesPreserved = 0
        int heroSummariesCreated = 0
        int editorialHeroSummariesPreserved = 0

        NodeIterator partners = session.getWorkspace().getQueryManager().createQuery(
                "SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('${contentRoot}')",
                Query.JCR_SQL2).execute().getNodes()

        while (partners.hasNext()) {
            JCRNodeWrapper partner = (JCRNodeWrapper) partners.nextNode()
            for (String language : languages) {
                String translationName = "j:translation_${language}"
                if (!partner.hasNode(translationName)) continue

                JCRNodeWrapper translation = (JCRNodeWrapper) partner.getNode(translationName)
                List<String> legacyExpertise = textValues(translation, "expertise")
                if (!textProperty(translation, "expertiseText") && !legacyExpertise.isEmpty()) {
                    translation.setProperty("expertiseText", legacyExpertise.join("\n"))
                    expertiseMigrated++
                }

                List<String> sentences = expertiseSentences(translation)
                String currentCard = textProperty(translation, "shortDescription")
                String currentHero = textProperty(translation, "heroSubtitle")

                if (!currentHero) {
                    String heroSummary = sentences.isEmpty()
                            ? currentCard
                            : summaryThroughCompleteSentence(sentences, Math.max(currentCard?.length() ?: 0, 240))
                    if (heroSummary) {
                        translation.setProperty("heroSubtitle", heroSummary)
                        heroSummariesCreated++
                    }
                } else {
                    editorialHeroSummariesPreserved++
                }

                if (!sentences.isEmpty()) {
                    if (!currentCard) {
                        translation.setProperty("shortDescription", sentences.first())
                        cardSummariesCreated++
                    } else if (isGeneratedExpertisePrefix(currentCard, sentences)) {
                        translation.setProperty("shortDescription", sentences.first())
                        generatedCardSummariesShortened++
                    } else {
                        editorialCardSummariesPreserved++
                    }
                } else if (currentCard) {
                    editorialCardSummariesPreserved++
                }
            }
        }

        session.save()
        logger.info(
                "Partner editor migration completed in edit workspace under {}: {} expertise fields migrated, {} card summaries created, {} generated card summaries shortened, {} editorial card summaries preserved, {} Hero summaries created, {} editorial Hero summaries preserved",
                contentRoot,
                expertiseMigrated,
                cardSummariesCreated,
                generatedCardSummariesShortened,
                editorialCardSummariesPreserved,
                heroSummariesCreated,
                editorialHeroSummariesPreserved)
        return null
    }
})
