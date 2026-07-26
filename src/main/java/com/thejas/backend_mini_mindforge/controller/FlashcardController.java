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

    @PostMapping("/generate-topic")
    public ResponseEntity<List<Flashcard>> generateFromTopic(
            @RequestParam(defaultValue = "5") int count,
            @RequestBody java.util.Map<String, String> body,
            Authentication auth) {
        String topic = body.getOrDefault("topic", "");
        if (topic.isBlank()) throw new RuntimeException("Topic is required");
        return ResponseEntity.ok(flashcardService.generateFromTopic(topic, auth.getName(), count));
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

    @DeleteMapping("/history/{questionId}")
    public ResponseEntity<Void> deleteByTopic(@PathVariable Long questionId, Authentication auth) {
        flashcardService.deleteByTopic(questionId, auth.getName());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/history")
    public ResponseEntity<Void> deleteAll(Authentication auth) {
        flashcardService.deleteAll(auth.getName());
        return ResponseEntity.ok().build();
    }
}
