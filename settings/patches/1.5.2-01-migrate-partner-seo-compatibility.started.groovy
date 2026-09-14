import org.jahia.api.Constants
import org.jahia.services.content.JCRTemplate
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRSessionWrapper
import javax.jcr.query.Query

final def logger = log
JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, new JCRCallback<Object>() {
    Object doInJCR(JCRSessionWrapper session) {
        // Migrate only existing legacy assignments; never change the registered CND constraints.
        def matches = session.workspace.queryManager.createQuery(
            "SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('/sites')", Query.JCR_SQL2).execute().nodes
        def partners = []
        while (matches.hasNext()) {
            def node = matches.nextNode()
            if ((node.path.startsWith('/sites/mySite/') || node.path.startsWith('/sites/jahiacom/')) &&
                    node.mixinNodeTypes*.name.contains('jahiacommix:partnerSeo')) partners.add(node)
        }
        if (partners.isEmpty()) return null
        def backupDir = new File(System.getProperty('java.io.tmpdir'), 'jahiacom-partner-seo-1.5.2-' + UUID.randomUUID())
        if (!backupDir.mkdirs()) throw new IOException('Cannot create Partner SEO backup directory')
        logger.info('Partner SEO compatibility backups: ' + backupDir.absolutePath)
        partners.each { partner ->
            def backup = new File(backupDir, partner.identifier + '.xml')
            backup.withOutputStream { out -> session.exportSystemView(partner.path, out, false, false) }
            def nodes = [partner]
            def children = partner.nodes
            while (children.hasNext()) {
                def child = children.nextNode()
                if (child.isNodeType('jnt:translation')) nodes.add(child)
            }
            def saved = []
            nodes.each { node ->
                ['htmlTitle', 'jsonLd', 'seoKeywords', 'openGraphImage', 'seoDescription'].each { key ->
                    if (node.hasProperty(key)) {
                        def p = node.getProperty(key)
                        saved.add([path: node.path, key: key, multiple: p.multiple,
                            values: p.multiple ? p.values : [p.value] as javax.jcr.Value[]])
                    }
                }
            }
            partner.removeMixin('jahiacommix:partnerSeo')
            if (!partner.isNodeType('jmix:seoHtmlHead')) partner.addMixin('jmix:seoHtmlHead')
            if (!partner.isNodeType('jahiacommix:seoOptions')) partner.addMixin('jahiacommix:seoOptions')
            if (!partner.isNodeType('jmix:description')) partner.addMixin('jmix:description')
            saved.each { entry ->
                def node = session.getNode(entry.path)
                if (entry.multiple) node.setProperty(entry.key, entry.values as javax.jcr.Value[])
                else node.setProperty(entry.key, entry.values[0])
                if (entry.key == 'seoDescription' && (!node.hasProperty('jcr:description') || !node.getProperty('jcr:description').string.trim())) {
                    node.setProperty('jcr:description', entry.values[0])
                }
                def restored = node.getProperty(entry.key)
                def values = restored.multiple ? restored.values : [restored.value]
                assert values.collect { it.string } == entry.values.collect { it.string }
            }
        }
        // One transaction; failure leaves all editorial values untouched. No publication.
        session.save()
        logger.info('Partner SEO compatibility migrated: ' + partners.size())
        return null
    }
})
