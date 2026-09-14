import org.jahia.api.Constants
import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate
import javax.jcr.query.Query

final def logger = log
JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, new JCRCallback<Object>() {
 Object doInJCR(JCRSessionWrapper session) {
  int checked = 0
  int fixed = 0
  int maximum = 0
  def nodes = session.getWorkspace().getQueryManager().createQuery("SELECT * FROM [jahiacom:partner] WHERE ISDESCENDANTNODE('/sites')", Query.JCR_SQL2).execute().getNodes()
  while (nodes.hasNext()) {
   def partner = nodes.nextNode()
   if (!(partner.getPath().startsWith("/sites/mySite/") || partner.getPath().startsWith("/sites/jahiacom/"))) continue
   def children = partner.getNodes()
   while (children.hasNext()) {
    def tr = children.nextNode()
    if (!tr.isNodeType("jnt:translation")) continue
    checked++
    String desc = tr.hasProperty("jcr:description") ? tr.getProperty("jcr:description").getString() : ""
    int before = desc.length()
    if (before >= 160) {
     desc = desc.replaceAll(/\s+/, " ").trim()
     if (desc.length() >= 160) {
      // Reserve one character for the ellipsis: strict maximum 159, including spaces.
      String prefix = desc.substring(0, 158)
      int boundary = prefix.lastIndexOf(" ")
      desc = (boundary > 0 ? prefix.substring(0, boundary) : prefix).trim().replaceAll(/[\s,;:.!?…]+$/, "") + "…"
     }
     tr.setProperty("jcr:description", desc)
     fixed++
     logger.info("Partner meta strict limit: " + tr.getPath() + "; before=" + before + "; after=" + desc.length())
    }
    if (desc.length() >= 160) throw new IllegalStateException("Meta description too long: " + tr.getPath())
    maximum = Math.max(maximum, desc.length())
   }
  }
  session.save()
  logger.info("Partner meta strict limit complete: checked=" + checked + ", corrected=" + fixed + ", maximum=" + maximum)
  return null
 }
})
