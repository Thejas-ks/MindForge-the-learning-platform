package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.service.FileExtractorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatFileController {

    private final FileExtractorService fileExtractorService;

    public ChatFileController(FileExtractorService fileExtractorService) {
        this.fileExtractorService = fileExtractorService;
    }

    // Extract text from file immediately on attach — returns content for use in chat
    @PostMapping("/extract-file")
    public ResponseEntity<Map<String, String>> extractFile(@RequestParam("file") MultipartFile file) throws Exception {
        String content = fileExtractorService.extract(file);
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        return ResponseEntity.ok(Map.of("filename", filename, "content", content));
    }
}
