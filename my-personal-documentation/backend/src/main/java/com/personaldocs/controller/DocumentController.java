package com.personaldocs.controller;

import com.personaldocs.model.Document;
import com.personaldocs.model.DocumentMeta;
import com.personaldocs.service.DocumentService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * REST API for personal documentation.
 *
 * Base path: /api/docs
 *
 * GET    /api/docs              → list all document metadata
 * GET    /api/docs/{id}         → get full document by id
 * POST   /api/docs/{id}         → create or overwrite document
 * DELETE /api/docs/{id}         → delete document
 */
@RestController
@RequestMapping("/api/docs")
@CrossOrigin(origins = "*")          // allow Angular dev server (localhost:4200)
public class DocumentController {

    private final DocumentService service;

    public DocumentController(DocumentService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<DocumentMeta>> list() {
        try {
            return ResponseEntity.ok(service.listAll());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/**")
    public ResponseEntity<Document> get(@RequestAttribute("javax.servlet.forward.request_uri") String uri,
                                        jakarta.servlet.http.HttpServletRequest request) {
        String id = extractId(request);
        try {
            return service.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/**")
    public ResponseEntity<Document> save(@RequestBody Map<String, String> body,
                                         jakarta.servlet.http.HttpServletRequest request) {
        String id       = extractId(request);
        String content  = body.getOrDefault("content", "");
        String category = body.getOrDefault("category", "");
        if (id.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Document saved = service.save(id, content, category);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/**")
    public ResponseEntity<Void> delete(jakarta.servlet.http.HttpServletRequest request) {
        String id = extractId(request);
        try {
            boolean deleted = service.delete(id);
            return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /** Extract the document id (everything after /api/docs/). */
    private String extractId(jakarta.servlet.http.HttpServletRequest request) {
        String path = request.getRequestURI();
        String prefix = request.getContextPath() + "/api/docs/";
        return path.startsWith(prefix) ? path.substring(prefix.length()) : "";
    }
}
