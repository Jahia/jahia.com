package org.jahia.modules.publicationintegrity;

import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.*;
import javax.jcr.*;
import javax.jcr.query.Query;
import org.jahia.api.Constants;
import org.jahia.services.content.*;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.osgi.service.component.annotations.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Repairs bookkeeping only; never publishes EDIT or revives explicit false flags. */
@Component(service = PublicationIntegrity.class, immediate = true)
public class PublicationIntegrity {
    private static final Logger LOG = LoggerFactory.getLogger(PublicationIntegrity.class);
    static final int BATCH_SIZE = 25;
    static final int MAX_TRANSLATIONS = 128;
    private static final long TICK_BUDGET = TimeUnit.SECONDS.toNanos(1);
    private final RepairQueue pending = new RepairQueue();
    private final Deque<Scan> audits = new ArrayDeque<>();
    private final MetadataBackups backups = new MetadataBackups(Paths.get(System.getProperty("java.io.tmpdir"), "jahiacom-publication-integrity-metadata"));
    private ScheduledExecutorService worker;
    private long lastAudit;
    private long lastMaintenance;
    private volatile boolean stopped;
    private boolean auditRequested = true;
    private boolean auditFirst;

    private static final class Scan {
        final String site;
        String after = "";
        Scan(String site) { this.site = site; }
    }

    @Activate public void start() {
        stopped = false;
        worker = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "jahiacom-publication-integrity"); t.setDaemon(true); return t;
        });
        worker.scheduleWithFixedDelay(this::drain, 2, 2, TimeUnit.SECONDS);
    }
    @Deactivate public void stop() {
        stopped = true;
        if (worker != null) worker.shutdownNow();
        pending.clear();
    }
    // Listeners pass only added nodes or publication metadata events, never ordinary text edits.
    public void changed(String path) {
        int slash = path.lastIndexOf('/');
        if (slash < 0) return;
        if (metadataProperty(path.substring(slash + 1))) path = path.substring(0, slash);
        slash = path.lastIndexOf('/');
        if (slash >= 0 && path.substring(slash + 1).startsWith("j:translation_")) path = path.substring(0, slash);
        String[] parts = path.split("/");
        if (parts.length >= 4 && "sites".equals(parts[1]) && editorialPath(path, "/sites/" + parts[2])) pending.add(path);
    }
    static boolean metadataProperty(String name) {
        return Arrays.asList("j:published", "j:lastPublished", "j:lastPublishedBy", "j:liveProperties").contains(name);
    }
    private void drain() {
        if (stopped) return;
        long deadline = System.nanoTime() + TICK_BUDGET;
        try {
            if (lastMaintenance == 0 || System.nanoTime() - lastMaintenance > TimeUnit.MINUTES.toNanos(5)) {
                backups.maintain(System.currentTimeMillis());
                lastMaintenance = System.nanoTime();
            }
            auditRequested |= pending.takeOverflow();
            if (audits.isEmpty() && (auditRequested || System.nanoTime() - lastAudit > TimeUnit.MINUTES.toNanos(5))) {
                startAudit();
                auditRequested = false;
                lastAudit = System.nanoTime();
            }
            int remaining = BATCH_SIZE;
            // Alternate priority: a slow event storm must not starve the progressive audit.
            auditFirst = !auditFirst;
            if (auditFirst && !audits.isEmpty() && System.nanoTime() < deadline && !stopped) {
                scanPage(audits.peek(), BATCH_SIZE / 2, deadline);
                remaining -= BATCH_SIZE / 2;
            }
            for (int i = 0; i < BATCH_SIZE / 2 && System.nanoTime() < deadline && !stopped; i++) {
                String path = pending.poll();
                if (path == null) break;
                attempt(path); remaining--;
            }
            if (!audits.isEmpty() && System.nanoTime() < deadline && !stopped) scanPage(audits.peek(), remaining, deadline);
        } catch (Exception error) {
            auditRequested = true;
            LOG.error("Publication integrity batch failed; retry on a later tick", error);
        }
    }
    private void attempt(String path) {
        try { repairResource(path); }
        catch (Exception error) { LOG.warn("Publication integrity skipped {}; progressive audit will retry", path, error); }
    }
    private void startAudit() throws RepositoryException {
        JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, (JCRCallback<Object>) session -> {
            NodeIterator sites = session.getWorkspace().getQueryManager().createQuery("SELECT * FROM [jnt:virtualsite] WHERE ISCHILDNODE('/sites')", Query.JCR_SQL2).execute().getNodes();
            while (sites.hasNext()) {
                JCRSiteNode site = (JCRSiteNode) sites.nextNode();
                if (site.getInstalledModules().contains("jahiacom")) audits.add(new Scan(site.getPath()));
            }
            return null;
        });
    }
    private void scanPage(Scan scan, int limit, long deadline) throws RepositoryException {
        // Keyset pagination avoids offsets skipping nodes when publication state changes mid-audit.
        List<String[]> page = JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.LIVE_WORKSPACE, (JCRCallback<List<String[]>>) session -> {
            String root = scan.site.replace("'", "''"), after = scan.after.replace("'", "''");
            Query query = session.getWorkspace().getQueryManager().createQuery(
                "SELECT * FROM [nt:base] WHERE ISDESCENDANTNODE('" + root + "') AND [j:published] = true AND [jcr:uuid] > '" + after + "' ORDER BY [jcr:uuid]", Query.JCR_SQL2);
            query.setLimit(limit);
            NodeIterator nodes = query.execute().getNodes();
            List<String[]> result = new ArrayList<>();
            while (nodes.hasNext()) {
                Node node = nodes.nextNode();
                result.add(new String[]{node.getIdentifier(), node.getPath()});
            }
            return result;
        });
        int visited = 0;
        for (String[] entry : page) {
            // Always advance at least one cursor after a slow query, otherwise it would repeat forever.
            if ((visited > 0 && System.nanoTime() >= deadline) || stopped) break;
            String path = entry[1];
            if (editorialPath(path, scan.site) && !path.substring(path.lastIndexOf('/') + 1).startsWith("j:translation_")) attempt(path);
            scan.after = entry[0]; visited++;
        }
        if (visited == page.size() && page.size() < limit) audits.remove();
    }
    private static Boolean published(Node node) throws RepositoryException {
        return node.hasProperty("j:published") ? node.getProperty("j:published").getBoolean() : null;
    }
    private static long baseline(Node node) throws RepositoryException {
        long value = 0;
        for (String name : Arrays.asList("j:lastPublished", "jcr:lastModified"))
            if (node.hasProperty(name)) value = Math.max(value, node.getProperty(name).getDate().getTimeInMillis());
        return value;
    }
    private static boolean needsRepair(Node live, Node edit) throws RepositoryException {
        if (Boolean.FALSE.equals(published(live)) || Boolean.FALSE.equals(published(edit))) return false;
        long date = baseline(live);
        if (date == 0) return false;
        if (!live.hasProperty("j:published") || !edit.hasProperty("j:published") || !edit.hasProperty("j:lastPublished") || !live.hasProperty("j:lastPublished")) return true;
        if (live.getProperty("j:lastPublished").getDate().getTimeInMillis() < date) return true;
        if (live.hasProperty("j:liveProperties")) for (Value value : live.getProperty("j:liveProperties").getValues())
            if (Arrays.asList("j:lastPublished", "j:lastPublishedBy").contains(value.getString())) return true;
        return false;
    }
    private static void normalize(Node live, Node edit) throws RepositoryException {
        if (!needsRepair(live, edit)) return;
        Calendar date = Calendar.getInstance(); date.setTimeInMillis(baseline(live));
        if (live.hasProperty("j:liveProperties")) {
            List<String> retained = new ArrayList<>();
            for (Value value : live.getProperty("j:liveProperties").getValues())
                if (!Arrays.asList("j:lastPublished", "j:lastPublishedBy").contains(value.getString())) retained.add(value.getString());
            live.setProperty("j:liveProperties", retained.toArray(new String[0]));
        }
        live.setProperty("j:lastPublished", date);
        if (!live.hasProperty("j:published")) live.setProperty("j:published", true);
        if (!edit.hasProperty("j:published")) edit.setProperty("j:published", true);
        if (!edit.hasProperty("j:lastPublished")) edit.setProperty("j:lastPublished", date);
    }
    private static boolean editorialPath(String path, String site) {
        return path.equals(site + "/home") || path.startsWith(site + "/home/") || path.startsWith(site + "/contents/") || path.startsWith(site + "/files/");
    }
    private void repairResource(String path) throws RepositoryException {
        String[] parts = path.split("/");
        if (parts.length < 4 || !"sites".equals(parts[1])) return;
        String root = "/sites/" + parts[2];
        if (!editorialPath(path, root)) return;
        JCRObservationManager.pushEventListenersAvailableDuringPublishOnly();
        try {
            JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, (JCRCallback<Object>) edit -> {
                if (!edit.nodeExists(root) || !((JCRSiteNode) edit.getNode(root)).getInstalledModules().contains("jahiacom") || !edit.nodeExists(path)) return null;
                JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.LIVE_WORKSPACE, (JCRCallback<Object>) live -> {
                    if (stopped || !live.nodeExists(path)) return null;
                    JCRNodeWrapper candidate = live.getNode(path), staged = edit.getNode(path);
                    if (candidate.isNodeType("jnt:translation")) return null;
                    Node liveRoot = candidate.getRealNode(), editRoot = staged.getRealNode();
                    if (!staged.getIdentifier().equals(candidate.getIdentifier()) || !Boolean.TRUE.equals(published(liveRoot)) || Boolean.FALSE.equals(published(editRoot))) return null;
                    List<Node[]> pairs = new ArrayList<>();
                    if (needsRepair(liveRoot, editRoot)) pairs.add(new Node[]{liveRoot, editRoot});
                    NodeIterator translations = liveRoot.getNodes("j:translation_*");
                    int count = 0;
                    while (translations.hasNext()) {
                        if (++count > MAX_TRANSLATIONS) throw new RepositoryException("Resource exceeds bounded translation limit");
                        Node translation = translations.nextNode();
                        if (translation.isNodeType("jnt:translation") && editRoot.hasNode(translation.getName())) {
                            Node other = editRoot.getNode(translation.getName());
                            if (other.getIdentifier().equals(translation.getIdentifier()) && needsRepair(translation, other)) pairs.add(new Node[]{translation, other});
                        }
                    }
                    if (pairs.isEmpty() || stopped) return null;
                    java.nio.file.Path backup;
                    try { backup = backups.save(pairs); }
                    catch (java.io.IOException error) { throw new RepositoryException("Metadata backup failed; resource unchanged", error); }
                    for (Node[] pair : pairs) normalize(pair[0], pair[1]);
                    if (stopped) return null;
                    live.save();
                    edit.save();
                    LOG.info("Publication bookkeeping repaired: {}; metadata backup {}", path, backup);
                    return null;
                });
                return null;
            });
        } finally { JCRObservationManager.popEventListenersAvailableDuringPublishOnly(); }
    }
}
