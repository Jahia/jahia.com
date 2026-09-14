import groovy.json.JsonOutput
import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate
import javax.jcr.query.Query

String property(node, String name) {
    return node.hasProperty(name) ? node.getProperty(name).getString() : ""
}
final def logger = log
JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE,
    new JCRCallback<Object>() {
        Object doInJCR(JCRSessionWrapper session) {
            int count = 0
            def partners = session.getWorkspace().getQueryManager().createQuery(
                "SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('/sites')", Query.JCR_SQL2).execute().getNodes()
            while (partners.hasNext()) {
                def partner = partners.nextNode()
                def translations = []
                def quotes = []
                def children = partner.getNodes()
                while (children.hasNext()) {
                    def child = children.nextNode()
                    if (child.isNodeType("jnt:translation")) translations.add(child)
                    if (child.isNodeType("jahiacom:partnerTestimonial")) quotes.add(child)
                }
                quotes.sort { a, b ->
                    long first = a.hasProperty("position") ? a.getProperty("position").getLong() : 0
                    long second = b.hasProperty("position") ? b.getProperty("position").getLong() : 0
                    first <=> second ?: property(a, "jcr:created") <=> property(b, "jcr:created")
                }
                translations.each { translation ->
                    if (!translation.hasProperty("testimonialsData")) {
                        def rows = []
                        String html = property(translation, "quote")
                        if (html) rows.add([
                            comment: html.replaceAll(/<[^>]+>/, " ").replace("&nbsp;", " ").replace("&amp;", "&").trim(),
                            html: html,
                            author: property(translation, "quoteAuthor"),
                            authorTitle: property(translation, "quoteAuthorTitle")
                        ])
                        quotes.each { quote ->
                            if (quote.hasNode(translation.getName())) {
                                def localized = quote.getNode(translation.getName())
                                String comment = property(localized, "comment")
                                if (comment) rows.add([comment: comment, author: property(localized, "author"), authorTitle: property(localized, "authorTitle")])
                            }
                        }
                        translation.setProperty("testimonialsData", JsonOutput.toJson(rows))
                        count++
                    }
                }
            }
            session.save()
            logger.info("Inline partner testimonials initialized in {} edit translations; original content preserved, no publication", count)
            return null
        }
    })
