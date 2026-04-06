package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.QuestionRequest;
import com.thejas.backend_mini_mindforge.entity.Question;
import com.thejas.backend_mini_mindforge.repository.QuestionRepository;
import com.thejas.backend_mini_mindforge.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final QuestionRepository questionRepository;

    public AiController(AiService aiService, QuestionRepository questionRepository) {
        this.aiService = aiService;
        this.questionRepository = questionRepository;
    }

    @PostMapping("/ask")
    public ResponseEntity<Question> ask(@RequestBody QuestionRequest request, Authentication auth) {
        String answer = aiService.generateAnswer(request.getQuestion());
        Question q = new Question();
        q.setQuestion(request.getQuestion());
        q.setAnswer(answer);
        q.setEmail(auth.getName());
        return ResponseEntity.ok(questionRepository.save(q));
    }

    @GetMapping("/history")
    public ResponseEntity<List<Question>> history(Authentication auth) {
        return ResponseEntity.ok(questionRepository.findByEmail(auth.getName()));
    }
}
