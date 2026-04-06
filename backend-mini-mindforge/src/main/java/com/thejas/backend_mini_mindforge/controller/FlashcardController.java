package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.entity.Flashcard;
import com.thejas.backend_mini_mindforge.service.FlashcardService;
import com.thejas.backend_mini_mindforge.service.FileExtractorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/flashcard")
public class FlashcardController {

    private final FlashcardService flashcardService;
    private final FileExtractorService fileExtractorService;

    public FlashcardController(FlashcardService flashcardService, FileExtractorService fileExtractorService) {
        this.flashcardService = flashcardService;
        this.fileExtractorService = fileExtractorService;
    }

    @PostMapping("/generate/{questionId}")
    public ResponseEntity<List<Flashcard>> generateFromAnswer(
            @PathVariable Long questionId,
            @RequestParam(defaultValue = "5") int count,
            Authentication auth) {
        return ResponseEntity.ok(flashcardService.generateFromAnswer(questionId, auth.getName(), count));
    }

    @PostMapping("/upload")
    public ResponseEntity<List<Flashcard>> generateFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "5") int count,
            Authentication auth) throws Exception {
        String extractedText = fileExtractorService.extract(file);
        return ResponseEntity.ok(flashcardService.generateFromText(extractedText, auth.getName(), count));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Flashcard>> history(Authentication auth) {
        return ResponseEntity.ok(flashcardService.getHistory(auth.getName()));
    }
}
