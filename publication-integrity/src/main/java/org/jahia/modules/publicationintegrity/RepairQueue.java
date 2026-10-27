package org.jahia.modules.publicationintegrity;

import java.util.LinkedHashSet;
import java.util.Set;

/** Bounded, deduplicated resource events; overflow requests a progressive audit. */
final class RepairQueue {
    static final int CAPACITY = 1024;
    private final Set<String> paths = new LinkedHashSet<>();
    private boolean overflow;

    synchronized void add(String path) {
        if (paths.size() < CAPACITY || paths.contains(path)) paths.add(path);
        else overflow = true;
    }

    synchronized String poll() {
        if (paths.isEmpty()) return null;
        String path = paths.iterator().next();
        paths.remove(path);
        return path;
    }

    synchronized boolean takeOverflow() {
        boolean value = overflow;
        overflow = false;
        return value;
    }

    synchronized void clear() { paths.clear(); overflow = false; }
    synchronized int size() { return paths.size(); }
}
