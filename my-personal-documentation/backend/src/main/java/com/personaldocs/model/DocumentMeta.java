package com.personaldocs.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Lightweight list entry — excludes the full content to keep list responses small.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentMeta {
    private String id;
    private String title;
    private String category;
    private String format;
    private Instant lastModified;
}
