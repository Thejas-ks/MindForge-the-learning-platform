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

    // Create finalized question
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping
    public ResponseEntity<BankQuestionResponse> create(@RequestBody BankQuestionRequest req,
                                                       Authentication auth) {
        return ResponseEntity.ok(questionService.create(req, auth.getName()));
    }

    // Create draft question (partial data allowed, no exam context)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/draft")
    public ResponseEntity<BankQuestionResponse> createDraft(@RequestBody BankQuestionRequest req,
                                                             Authentication auth) {
        return ResponseEntity.ok(questionService.createDraft(req, auth.getName(), null));
    }

    // Finalize a draft (validate + promote to finalized)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/{id}/finalize")
    public ResponseEntity<BankQuestionResponse> finalizeDraft(@PathVariable Long id,
                                                               @RequestBody BankQuestionRequest req,
                                                               Authentication auth) {
        return ResponseEntity.ok(questionService.finalizeDraft(id, req, auth.getName()));
    }

    // Get all finalized questions — supports ?difficulty=EASY, ?topic=Java, ?search=keyword
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping
    public ResponseEntity<List<BankQuestionResponse>> getAll(
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String search,
            Authentication auth) {
        String email = auth.getName();
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(questionService.search(email, search, difficulty));
        }
        if (difficulty != null && !difficulty.isBlank()) {
            return ResponseEntity.ok(questionService.getByDifficulty(email, difficulty));
        }
        if (topic != null && !topic.isBlank()) {
            return ResponseEntity.ok(questionService.getByTopic(email, topic));
        }
        return ResponseEntity.ok(questionService.getAll(email));
    }

    // Get draft questions — optionally scoped to a specific exam via ?examId=
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/drafts")
    public ResponseEntity<List<BankQuestionResponse>> getDrafts(
            @RequestParam(required = false) Long examId,
            Authentication auth) {
        String email = auth.getName();
        if (examId != null) {
            return ResponseEntity.ok(questionService.getDraftsByExam(email, examId));
        }
        return ResponseEntity.ok(questionService.getDrafts(email));
    }

    // Get single question by ID
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/{id}")
    public ResponseEntity<BankQuestionResponse> getById(@PathVariable Long id,
                                                        Authentication auth) {
        return ResponseEntity.ok(questionService.getById(id, auth.getName()));
    }

    // Update question
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PutMapping("/{id}")
    public ResponseEntity<BankQuestionResponse> update(@PathVariable Long id,
                                                       @RequestBody BankQuestionRequest req,
                                                       Authentication auth) {
        return ResponseEntity.ok(questionService.update(id, req, auth.getName()));
    }

    // Delete question
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        questionService.delete(id, auth.getName());
        return ResponseEntity.ok().build();
    }
}
