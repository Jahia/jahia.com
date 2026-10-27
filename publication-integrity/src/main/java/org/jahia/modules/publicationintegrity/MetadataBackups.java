package org.jahia.modules.publicationintegrity;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.*;
import java.util.concurrent.TimeUnit;
import javax.jcr.*;

/** Flat, bounded metadata snapshots. No editorial text, binaries or descendant exports. */
final class MetadataBackups {
    static final int MAX_RECORD_BYTES = 1024 * 1024;
    static final long MAX_TOTAL_BYTES = 64L * 1024 * 1024;
    static final int MAX_RECORDS = 256;
    static final long RETENTION_MILLIS = TimeUnit.DAYS.toMillis(7);
    private static final List<String> FIELDS = Arrays.asList(
        "j:published", "j:lastPublished", "j:lastPublishedBy", "j:liveProperties");
    private final Path directory;

    private static final class Snapshot extends Properties {
        private int characters;
        @Override public synchronized Object setProperty(String key, String value) {
            // Bound memory before serialization too; properties escaping uses at most six bytes/char.
            int size = key.length() + value.length();
            if (size > MAX_RECORD_BYTES / 6 - characters) throw new IllegalArgumentException("Metadata snapshot exceeds memory limit");
            characters += size;
            return super.setProperty(key, value);
        }
    }

    MetadataBackups(Path directory) { this.directory = directory; }

    synchronized Path save(List<Node[]> pairs) throws IOException, RepositoryException {
        if (pairs.size() > PublicationIntegrity.MAX_TRANSLATIONS + 1) throw new IOException("Too many metadata pairs");
        Properties snapshot = new Snapshot();
        for (int i = 0; i < pairs.size(); i++) {
            for (int workspace = 0; workspace < 2; workspace++) {
                Node node = pairs.get(i)[workspace];
                String prefix = i + (workspace == 0 ? ".live." : ".edit.");
                snapshot.setProperty(prefix + "path", node.getPath());
                snapshot.setProperty(prefix + "uuid", node.getIdentifier());
                for (String name : FIELDS) {
                    snapshot.setProperty(prefix + name + ".present", Boolean.toString(node.hasProperty(name)));
                    if (!node.hasProperty(name)) continue;
                    Property property = node.getProperty(name);
                    snapshot.setProperty(prefix + name + ".type", Integer.toString(property.getType()));
                    snapshot.setProperty(prefix + name + ".multiple", Boolean.toString(property.isMultiple()));
                    Value[] values = property.isMultiple() ? property.getValues() : new Value[]{property.getValue()};
                    if (values.length > 256) throw new IOException("Publication metadata has too many values");
                    snapshot.setProperty(prefix + name + ".count", Integer.toString(values.length));
                    for (int v = 0; v < values.length; v++) {
                        String value = values[v].getString();
                        if (value.length() > 16384) throw new IOException("Publication metadata value is too large");
                        snapshot.setProperty(prefix + name + ".value." + v, value);
                    }
                }
            }
        }
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (OutputStream bounded = new OutputStream() {
            @Override public void write(int value) throws IOException {
                if (bytes.size() >= MAX_RECORD_BYTES) throw new IOException("Metadata snapshot exceeds size limit");
                bytes.write(value);
            }
            @Override public void write(byte[] data, int offset, int length) throws IOException {
                if (length > MAX_RECORD_BYTES - bytes.size()) throw new IOException("Metadata snapshot exceeds size limit");
                bytes.write(data, offset, length);
            }
        }) { snapshot.store(bounded, "Publication metadata only; pair order LIVE, EDIT"); }
        return write(bytes.toByteArray(), System.currentTimeMillis());
    }

    // Package-visible for quota/retention tests; only called with bounded metadata in production.
    synchronized Path write(byte[] data, long now) throws IOException {
        if (data.length > MAX_RECORD_BYTES) throw new IOException("Metadata snapshot exceeds size limit");
        if (!Files.exists(directory, LinkOption.NOFOLLOW_LINKS)) {
            try { Files.createDirectory(directory, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------"))); }
            catch (UnsupportedOperationException unsupported) { Files.createDirectory(directory); }
        }
        if (Files.isSymbolicLink(directory) || !Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS))
            throw new IOException("Unsafe metadata backup directory");
        prune(data.length, now, true);
        Path file = directory.resolve("snapshot-" + UUID.randomUUID() + ".properties");
        try {
            try { Files.createFile(file, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------"))); }
            catch (UnsupportedOperationException unsupported) { Files.createFile(file); }
            Files.write(file, data, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS);
            return file;
        } catch (IOException error) { Files.deleteIfExists(file); throw error; }
    }

    synchronized void maintain(long now) throws IOException {
        if (!Files.exists(directory, LinkOption.NOFOLLOW_LINKS)) return;
        if (Files.isSymbolicLink(directory) || !Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS))
            throw new IOException("Unsafe metadata backup directory");
        prune(0, now, false);
    }

    private void prune(int incomingBytes, long now, boolean reserveRecord) throws IOException {
        List<Path> records = new ArrayList<>();
        try (DirectoryStream<Path> files = Files.newDirectoryStream(directory, "snapshot-*.properties")) {
            for (Path file : files) {
                if (!file.getFileName().toString().matches("snapshot-[a-f0-9-]{36}\\.properties")) continue;
                if (!Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)) throw new IOException("Unsafe metadata snapshot");
                if (Files.getLastModifiedTime(file, LinkOption.NOFOLLOW_LINKS).toMillis() < now - RETENTION_MILLIS) Files.delete(file);
                else records.add(file);
            }
        }
        records.sort(Comparator.comparingLong(file -> {
            try { return Files.getLastModifiedTime(file, LinkOption.NOFOLLOW_LINKS).toMillis(); }
            catch (IOException error) { return Long.MIN_VALUE; }
        }));
        long total = 0;
        for (Path file : records) total += Files.size(file);
        int count = records.size();
        for (Path file : records) {
            if (count <= MAX_RECORDS - (reserveRecord ? 1 : 0) && total + incomingBytes <= MAX_TOTAL_BYTES) break;
            long size = Files.size(file);
            Files.delete(file); total -= size; count--;
        }
    }
}
