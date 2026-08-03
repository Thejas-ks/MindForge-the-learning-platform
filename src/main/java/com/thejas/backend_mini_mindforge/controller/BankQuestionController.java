package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.BankQuestionRequest;
import com.thejas.backend_mini_mindforge.dto.response.BankQuestionResponse;
import com.thejas.backend_mini_mindforge.service.BankQuestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/question-bank")
public class BankQuestionController {

    private final BankQuestionService questionService;

    public BankQuestionController(BankQuestionService questionService) {
        this.questionService = questionService;
    }

    // Create question — ADMIN only
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<BankQuestionResponse> create(@RequestBody BankQuestionRequest req,
                                                       Authentication auth) {
        return ResponseEntity.ok(questionService.create(req, auth.getName()));
    }

    // Get all questions created by the authenticated admin
    // Optional filters: ?difficulty=EASY or ?topic=Java
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<BankQuestionResponse>> getAll(
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String topic,
            Authentication auth) {
        if (difficulty != null && !difficulty.isBlank()) {
            return ResponseEntity.ok(questionService.getByDifficulty(auth.getName(), difficulty));
        }
        if (topic != null && !topic.isBlank()) {
            return ResponseEntity.ok(questionService.getByTopic(auth.getName(), topic));
        }
        return ResponseEntity.ok(questionService.getAll(auth.getName()));
    }

    // Get single question by ID — only the creator can access
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<BankQuestionResponse> getById(@PathVariable Long id,
                                                        Authentication auth) {
        return ResponseEntity.ok(questionService.getById(id, auth.getName()));
    }

    // Update question — only the creator can update
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<BankQuestionResponse> update(@PathVariable Long id,
                                                       @RequestBody BankQuestionRequest req,
                                                       Authentication auth) {
        return ResponseEntity.ok(questionService.update(id, req, auth.getName()));
    }

    // Delete question — only the creator can delete
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        questionService.delete(id, auth.getName());
        return ResponseEntity.ok().build();
    }
}
