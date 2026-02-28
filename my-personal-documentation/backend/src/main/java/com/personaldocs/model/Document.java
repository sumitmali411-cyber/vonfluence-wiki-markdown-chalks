package com.personaldocs.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    /** Unique slug / ID (filename without extension). */
    private String id;

    /** Human-readable title derived from the first h1 heading or filename. */
    private String title;

    /** Optional category / folder grouping. */
    private String category;

    /** Raw Confluence wiki markup content. */
    private String content;

    /** Format of the document: "wiki" or "markdown". */
    private String format;

    /** ISO-8601 timestamp of last modification. */
    private Instant lastModified;
}
