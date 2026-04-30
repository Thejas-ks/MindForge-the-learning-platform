package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.service.FileExtractorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/notes")
public class NotesController {

    private final FileExtractorService fileExtractorService;

    public NotesController(FileExtractorService fileExtractorService) {
        this.fileExtractorService = fileExtractorService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) throws Exception {
        String extracted = fileExtractorService.extract(file);
        return ResponseEntity.ok(Map.of(
                "content", extracted,
                "filename", file.getOriginalFilename() != null ? file.getOriginalFilename() : "file",
                "message", "Notes uploaded successfully"
        ));
    }
}
