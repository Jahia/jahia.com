import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate
import org.jahia.services.content.decorator.JCRSiteNode
import javax.jcr.query.Query

final def logger = log
JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, new JCRCallback<Object>() {
    Object doInJCR(JCRSessionWrapper session) {
        def sites = session.workspace.queryManager.createQuery(
            "SELECT * FROM [jnt:virtualsite] WHERE ISCHILDNODE('/sites')", Query.JCR_SQL2).execute().nodes
        int migrated = 0
        while (sites.hasNext()) {
            JCRSiteNode site = (JCRSiteNode) sites.nextNode()
            if (!site.getInstalledModules().contains('jahiacom')) continue
            def home = site.getHome()
            // An existing mixin may intentionally have an empty selection: do not replace it.
            if (home == null || home.isNodeType('jahiacommix:homeUtilityNavigation')) continue
            home.addMixin('jahiacommix:homeUtilityNavigation')
            if (site.hasProperty('utilityNavigationLinks')) {
                home.setProperty('utilityNavigationLinks', site.getProperty('utilityNavigationLinks').values)
            }
            def rssPath = ['footer/iconsLeft/rss', 'footer/iconsRight/rss'].find { site.hasNode(it) }
            home.setProperty('utilityRssVisible', rssPath != null)
            if (rssPath != null) {
                def rss = site.getNode(rssPath)
                if (rss.hasProperty('href')) home.setProperty('utilityRssUrl', rss.getProperty('href').string)
            }
            migrated++
        }
        // Keep the site-level values as the LIVE fallback until an editor publishes Home.
        // Never publish a page or its draft translations from this compatibility patch.
        session.save()
        logger.info('Upper navigation settings prepared on {} home page(s); no publication', migrated)
        return null
    }
})
