package org.jahia.modules.publicationintegrity;

import java.io.IOException;
import java.lang.reflect.*;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.*;
import javax.jcr.*;
import org.junit.*;
import org.junit.rules.TemporaryFolder;
import static org.junit.Assert.*;

public class SecurityLimitsTest {
    @Rule public TemporaryFolder temporary = new TemporaryFolder();
    private Path directory() { return temporary.getRoot().toPath().resolve("metadata"); }

    @Test public void eventStormIsDeduplicatedAndBoundedWithoutLosingAuditRequest() {
        RepairQueue queue = new RepairQueue();
        for (int i = 0; i < RepairQueue.CAPACITY * 10; i++) queue.add("/sites/s/contents/" + i);
        assertEquals(RepairQueue.CAPACITY, queue.size());
        assertTrue(queue.takeOverflow()); assertFalse(queue.takeOverflow());
        assertEquals("/sites/s/contents/0", queue.poll());
        queue.add("/sites/s/contents/1");
        assertEquals(RepairQueue.CAPACITY - 1, queue.size());
        queue.clear(); assertNull(queue.poll());
    }

    @Test public void translationEventsTargetOnlyTheirResourceAndSystemPathsAreIgnored() throws Exception {
        PublicationIntegrity integrity = new PublicationIntegrity();
        integrity.changed("/sites/s/contents/item/j:translation_en/j:published");
        integrity.changed("/sites/s/contents/item/j:lastPublished");
        integrity.changed("/sites/s/users/user/j:published");
        Field field = PublicationIntegrity.class.getDeclaredField("pending"); field.setAccessible(true);
        RepairQueue queue = (RepairQueue) field.get(integrity);
        assertEquals(1, queue.size());
        assertEquals("/sites/s/contents/item", queue.poll());
    }

    @Test public void snapshotCountEvictsOldestWithoutTouchingUnmanagedFiles() throws Exception {
        MetadataBackups store = new MetadataBackups(directory()); long now = System.currentTimeMillis();
        Path oldest = store.write(new byte[]{1}, now);
        Files.setLastModifiedTime(oldest, FileTime.fromMillis(now - 10000));
        Path unrelated = directory().resolve("operator-file.txt"); Files.write(unrelated, new byte[]{2});
        for (int i = 0; i < MetadataBackups.MAX_RECORDS; i++) store.write(new byte[]{1}, now);
        assertFalse(Files.exists(oldest)); assertTrue(Files.exists(unrelated));
        try (java.util.stream.Stream<Path> files = Files.list(directory())) {
            assertEquals(MetadataBackups.MAX_RECORDS, files.filter(p -> p.getFileName().toString().startsWith("snapshot-")).count());
        }
    }

    @Test public void totalBytesAreBoundedAndOversizedRecordIsRefusedBeforeWriting() throws Exception {
        MetadataBackups store = new MetadataBackups(directory()); long now = System.currentTimeMillis();
        try { store.write(new byte[MetadataBackups.MAX_RECORD_BYTES + 1], now); fail("oversized record accepted"); }
        catch (IOException expected) { assertFalse(Files.exists(directory())); }
        byte[] record = new byte[MetadataBackups.MAX_RECORD_BYTES];
        for (int i = 0; i < MetadataBackups.MAX_TOTAL_BYTES / record.length + 2; i++) store.write(record, now);
        long bytes = 0;
        try (DirectoryStream<Path> files = Files.newDirectoryStream(directory())) {
            for (Path file : files) bytes += Files.size(file);
        }
        assertTrue(bytes <= MetadataBackups.MAX_TOTAL_BYTES);
    }

    @Test public void expiredSnapshotsArePrunedEvenWithoutNewRepairs() throws Exception {
        MetadataBackups store = new MetadataBackups(directory()); long now = System.currentTimeMillis();
        Path file = store.write(new byte[]{1}, now);
        Files.setLastModifiedTime(file, FileTime.fromMillis(now - MetadataBackups.RETENTION_MILLIS - 1));
        store.maintain(now); assertFalse(Files.exists(file));
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
    }
    private static Node metadataNode() {
        return proxy(Node.class, (self, method, args) -> {
            switch (method.getName()) {
                case "getPath": return "/sites/s/contents/item";
                case "getIdentifier": return "uuid";
                case "hasProperty": return "j:published".equals(args[0]);
                case "getProperty":
                    assertEquals("j:published", args[0]);
                    return proxy(Property.class, (p, m, a) -> {
                        if (m.getName().equals("getType")) return PropertyType.BOOLEAN;
                        if (m.getName().equals("isMultiple")) return false;
                        if (m.getName().equals("getValue")) return proxy(Value.class, (v, vm, va) -> {
                            assertEquals("getString", vm.getName()); return "true";
                        });
                        throw new AssertionError(m.getName());
                    });
                default: throw new AssertionError("Unexpected content access: " + method.getName());
            }
        });
    }

    @Test public void backupReadsOnlyPublicationMetadataAndUsesPrivatePermissionsWhereSupported() throws Exception {
        MetadataBackups store = new MetadataBackups(directory());
        Path file = store.save(Collections.singletonList(new Node[]{metadataNode(), metadataNode()}));
        Properties snapshot = new Properties();
        try (java.io.InputStream input = Files.newInputStream(file)) { snapshot.load(input); }
        assertEquals("true", snapshot.getProperty("0.edit.j:published.value.0"));
        assertEquals("false", snapshot.getProperty("0.live.j:lastPublished.present"));
        assertFalse(snapshot.keySet().stream().anyMatch(key -> key.toString().contains("description")));
        if (Files.getFileStore(file).supportsFileAttributeView("posix")) {
            assertEquals(PosixFilePermissions.fromString("rw-------"), Files.getPosixFilePermissions(file));
            assertEquals(PosixFilePermissions.fromString("rwx------"), Files.getPosixFilePermissions(directory()));
        }
    }
}
