import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate
import javax.jcr.query.Query
String text(node, String key) { return node.hasProperty(key) ? node.getProperty(key).getString().trim() : "" }
final def logger = log
JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, new JCRCallback<Object>() {
 Object doInJCR(JCRSessionWrapper session) {
  int fixed = 0
  def nodes = session.getWorkspace().getQueryManager().createQuery("SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('/sites')", Query.JCR_SQL2).execute().getNodes()
  while (nodes.hasNext()) {
   def partner = nodes.nextNode()
   if (!(partner.getPath().startsWith("/sites/mySite/") || partner.getPath().startsWith("/sites/jahiacom/"))) continue
   def children = partner.getNodes()
   while (children.hasNext()) {
    def tr = children.nextNode()
    if (!tr.isNodeType("jnt:translation")) continue
    String desc = text(tr, "jcr:description")
    String source = text(tr, "seoDescription") ?: text(tr, "shortDescription")
    if (desc.length() > 160 && desc == source) {
     String prefix = desc.substring(0, 159)
     int boundary = prefix.lastIndexOf(" ")
     tr.setProperty("jcr:description", (boundary > 0 ? prefix.substring(0, boundary) : prefix).trim() + "…")
     fixed++
    }
   }
  }
  session.save()
  logger.info("Partner meta description length corrected: " + fixed)
  return null
 }
})
