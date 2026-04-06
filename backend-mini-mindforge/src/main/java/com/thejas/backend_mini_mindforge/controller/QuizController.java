package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.entity.QuizQuestion;
import com.thejas.backend_mini_mindforge.service.QuizService;
import com.thejas.backend_mini_mindforge.service.FileExtractorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private final QuizService quizService;
    private final FileExtractorService fileExtractorService;

    public QuizController(QuizService quizService, FileExtractorService fileExtractorService) {
        this.quizService = quizService;
        this.fileExtractorService = fileExtractorService;
    }

    @PostMapping("/generate/{questionId}")
    public ResponseEntity<List<QuizQuestion>> generateFromAnswer(
            @PathVariable Long questionId,
            @RequestParam(defaultValue = "5") int count,
            Authentication auth) {
        return ResponseEntity.ok(quizService.generateFromAnswer(questionId, auth.getName(), count));
    }

    @PostMapping("/upload")
    public ResponseEntity<List<QuizQuestion>> generateFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "5") int count,
            Authentication auth) throws Exception {
        String extractedText = fileExtractorService.extract(file);
        return ResponseEntity.ok(quizService.generateFromText(extractedText, auth.getName(), count));
    }

    @GetMapping("/history")
    public ResponseEntity<List<QuizQuestion>> history(Authentication auth) {
        return ResponseEntity.ok(quizService.getHistory(auth.getName()));
    }
}
