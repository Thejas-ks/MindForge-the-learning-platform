package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.QuestionRequest;
import com.thejas.backend_mini_mindforge.entity.Question;
import com.thejas.backend_mini_mindforge.repository.QuestionRepository;
import com.thejas.backend_mini_mindforge.service.AiService;
import com.thejas.backend_mini_mindforge.service.FileExtractorService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final QuestionRepository questionRepository;
    private final FileExtractorService fileExtractorService;

    public AiController(AiService aiService, QuestionRepository questionRepository,
                        FileExtractorService fileExtractorService) {
        this.aiService = aiService;
        this.questionRepository = questionRepository;
        this.fileExtractorService = fileExtractorService;
    }

    @PostMapping("/ask")
    public ResponseEntity<Question> ask(@RequestBody QuestionRequest request, Authentication auth) {
        String answer = request.getHistory() != null && !request.getHistory().isEmpty()
                ? aiService.generateAnswerWithHistory(request.getQuestion(), request.getHistory())
                : aiService.generateAnswer(request.getQuestion());
        Question q = new Question();
        q.setQuestion(request.getQuestion());
        q.setAnswer(answer);
        q.setEmail(auth.getName());
        return ResponseEntity.ok(questionRepository.save(q));
    }

    // Upload file in chat — optional user message sent together
    @PostMapping("/ask-file")
    public ResponseEntity<Question> askFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "message", required = false) String message,
            Authentication auth) throws Exception {
        String extractedText = fileExtractorService.extract(file);
        String userContext = (message != null && !message.isBlank()) ? "User note: " + message + "\n\n" : "";
        String prompt = userContext + "The user uploaded a document. Summarize the key concepts clearly with bullet points.\n\nContent:\n" + extractedText;
        String answer = aiService.generateAnswer(prompt);
        String label = (message != null && !message.isBlank())
                ? file.getOriginalFilename() + " - " + message
                : file.getOriginalFilename();
        Question q = new Question();
        q.setQuestion(label);
        q.setAnswer(answer);
        q.setEmail(auth.getName());
        return ResponseEntity.ok(questionRepository.save(q));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Question>> history(Authentication auth) {
        return ResponseEntity.ok(questionRepository.findByEmail(auth.getName()));
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<Void> deleteOne(@PathVariable Long id, Authentication auth) {
        questionRepository.deleteByIdAndEmail(id, auth.getName());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/history")
    public ResponseEntity<Void> deleteAll(Authentication auth) {
        questionRepository.deleteByEmail(auth.getName());
        return ResponseEntity.ok().build();
    }
}
