package com.personaldocs.service;

import com.personaldocs.model.Document;
import com.personaldocs.model.DocumentMeta;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * File-system backed document store.
 *
 * Documents are stored as plain text files under {@code docs.storage-path}.
 * Subdirectories become the document category. Supported extensions: .wiki, .md, .txt
 *
 * <pre>
 *   docs/
 *   ├── getting-started.wiki
 *   ├── architecture/
 *   │   ├── overview.wiki
 *   │   └── data-flow.md
 *   └── team/
 *       └── on-boarding.wiki
 * </pre>
 */
@Service
public class DocumentService {

    private static final List<String> SUPPORTED_EXTS = List.of(".wiki", ".md", ".txt");
    private static final Pattern H1_WIKI = Pattern.compile("^h1\\.\\s+(.+)", Pattern.MULTILINE);
    private static final Pattern H1_MD   = Pattern.compile("^#\\s+(.+)",    Pattern.MULTILINE);

    @Value("${docs.storage-path}")
    private String storagePath;

    private Path docsRoot;

    @PostConstruct
    void init() throws IOException {
        docsRoot = Paths.get(storagePath).toAbsolutePath();
        Files.createDirectories(docsRoot);
    }

    // -------------------------------------------------------------------------
    // List
    // -------------------------------------------------------------------------

    public List<DocumentMeta> listAll() throws IOException {
        try (Stream<Path> stream = Files.walk(docsRoot)) {
            return stream
                    .filter(Files::isRegularFile)
                    .filter(p -> SUPPORTED_EXTS.stream().anyMatch(ext -> p.getFileName().toString().endsWith(ext)))
                    .sorted(Comparator.comparing(Path::toString))
                    .map(this::toMeta)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        }
    }

    // -------------------------------------------------------------------------
    // Get
    // -------------------------------------------------------------------------

    public Optional<Document> findById(String id) throws IOException {
        Path file = resolveById(id);
        if (file == null || !Files.exists(file)) return Optional.empty();
        String content = Files.readString(file);
        return Optional.of(buildDocument(id, file, content));
    }

    // -------------------------------------------------------------------------
    // Create / Update
    // -------------------------------------------------------------------------

    public Document save(String id, String content, String category) throws IOException {
        String safeId = sanitiseId(id);
        Path dir = (category != null && !category.isBlank())
                ? docsRoot.resolve(sanitiseId(category))
                : docsRoot;
        Files.createDirectories(dir);
        Path file = dir.resolve(safeId + ".wiki");
        Files.writeString(file, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return buildDocument(safeId, file, content);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public boolean delete(String id) throws IOException {
        Path file = resolveById(id);
        if (file == null || !Files.exists(file)) return false;
        Files.delete(file);
        return true;
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Walk the docs tree to find a file whose base name (no extension) matches {@code id}.
     * Category-qualified IDs use "/" as separator, e.g. "architecture/overview".
     */
    private Path resolveById(String id) throws IOException {
        if (id == null || id.isBlank()) return null;
        String safe = id.replace('\\', '/');
        // Try direct category/name lookup first
        for (String ext : SUPPORTED_EXTS) {
            Path candidate = docsRoot.resolve(safe + ext);
            if (Files.exists(candidate)) return candidate;
        }
        // Fall back to recursive search by base name
        String baseName = safe.contains("/") ? safe.substring(safe.lastIndexOf('/') + 1) : safe;
        try (Stream<Path> stream = Files.walk(docsRoot)) {
            return stream
                    .filter(Files::isRegularFile)
                    .filter(p -> stripExt(p.getFileName().toString()).equals(baseName))
                    .findFirst()
                    .orElse(null);
        }
    }

    private DocumentMeta toMeta(Path file) {
        try {
            String id = buildId(file);
            String content = Files.readString(file);
            Document doc = buildDocument(id, file, content);
            return DocumentMeta.builder()
                    .id(doc.getId())
                    .title(doc.getTitle())
                    .category(doc.getCategory())
                    .format(doc.getFormat())
                    .lastModified(doc.getLastModified())
                    .build();
        } catch (IOException e) {
            return null;
        }
    }

    private Document buildDocument(String id, Path file, String content) throws IOException {
        String format = file.getFileName().toString().endsWith(".md") ? "markdown" : "wiki";
        String title  = extractTitle(content, format);
        if (title == null || title.isBlank()) title = stripExt(file.getFileName().toString());
        String category = buildCategory(file);
        Instant lastMod = Files.getLastModifiedTime(file).toInstant();
        return Document.builder()
                .id(id)
                .title(title)
                .category(category)
                .content(content)
                .format(format)
                .lastModified(lastMod)
                .build();
    }

    private String buildId(Path file) {
        Path rel = docsRoot.relativize(file);
        String s = rel.toString().replace('\\', '/');
        for (String ext : SUPPORTED_EXTS) {
            if (s.endsWith(ext)) { s = s.substring(0, s.length() - ext.length()); break; }
        }
        return s;
    }

    private String buildCategory(Path file) {
        Path rel = docsRoot.relativize(file.getParent());
        String s = rel.toString().replace('\\', '/');
        return s.isBlank() ? "General" : s;
    }

    private String extractTitle(String content, String format) {
        Matcher m = "markdown".equals(format) ? H1_MD.matcher(content) : H1_WIKI.matcher(content);
        return m.find() ? m.group(1).trim() : null;
    }

    private static String stripExt(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    private static String sanitiseId(String raw) {
        return raw.toLowerCase(Locale.ROOT)
                  .replaceAll("[^a-z0-9/_-]", "-")
                  .replaceAll("-{2,}", "-")
                  .replaceAll("^-|-$", "");
    }
}
