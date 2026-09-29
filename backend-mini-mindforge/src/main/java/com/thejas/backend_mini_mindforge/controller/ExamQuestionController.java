package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.BulkAddQuestionsRequest;
import com.thejas.backend_mini_mindforge.dto.request.BulkCreateAndAssignRequest;
import com.thejas.backend_mini_mindforge.dto.request.ExamQuestionRequest;
import com.thejas.backend_mini_mindforge.dto.response.BankQuestionResponse;
import com.thejas.backend_mini_mindforge.dto.response.BulkAddSummaryResponse;
import com.thejas.backend_mini_mindforge.dto.response.BulkCreateAndAssignResponse;
import com.thejas.backend_mini_mindforge.dto.response.ExamQuestionResponse;
import com.thejas.backend_mini_mindforge.service.ExamQuestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exams/{examId}/questions")
public class ExamQuestionController {

    private final ExamQuestionService examQuestionService;

    public ExamQuestionController(ExamQuestionService examQuestionService) {
        this.examQuestionService = examQuestionService;
    }

    // Bulk add existing bank questions to an exam
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping
    public ResponseEntity<BulkAddSummaryResponse> bulkAdd(@PathVariable Long examId,
                                                          @RequestBody BulkAddQuestionsRequest req,
                                                          Authentication auth) {
        return ResponseEntity.ok(examQuestionService.bulkAdd(examId, req, auth.getName()));
    }

    // Add a single existing bank question
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/single")
    public ResponseEntity<ExamQuestionResponse> addSingle(@PathVariable Long examId,
                                                          @RequestBody ExamQuestionRequest req,
                                                          Authentication auth) {
        return ResponseEntity.ok(examQuestionService.addSingle(examId, req, auth.getName()));
    }

    /**
     * Atomically create new Question Bank questions and assign them to this exam.
     * All questions are validated before any are persisted.
     * On any failure the entire operation rolls back.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/bulk-create")
    public ResponseEntity<BulkCreateAndAssignResponse> bulkCreate(@PathVariable Long examId,
                                                                   @RequestBody BulkCreateAndAssignRequest req,
                                                                   Authentication auth) {
        return ResponseEntity.ok(examQuestionService.bulkCreateAndAssign(examId, req, auth.getName()));
    }

    /**
     * Finalize existing draft questions and assign them to this exam.
     * Each entry must include draftId of the BankQuestion draft to finalize.
     * Entries without draftId are created as new questions (fallback).
     * Idempotent: already-assigned questions are skipped.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/finalize-and-assign")
    public ResponseEntity<BulkCreateAndAssignResponse> finalizeAndAssign(@PathVariable Long examId,
                                                                          @RequestBody BulkCreateAndAssignRequest req,
                                                                          Authentication auth) {
        return ResponseEntity.ok(examQuestionService.finalizeAndAssign(examId, req, auth.getName()));
    }

    /**
     * Save question entries as drafts (isDraft=true in Question Bank).
     * Drafts are NOT assigned to the exam.
     * Returns the created draft BankQuestion records for frontend state recovery.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/save-drafts")
    public ResponseEntity<List<BankQuestionResponse>> saveDrafts(@PathVariable Long examId,
                                                                  @RequestBody BulkCreateAndAssignRequest req,
                                                                  Authentication auth) {
        return ResponseEntity.ok(examQuestionService.bulkSaveAsDraft(examId, req, auth.getName()));
    }

    // Get all questions in an exam ordered by questionOrder
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping
    public ResponseEntity<List<ExamQuestionResponse>> getAll(@PathVariable Long examId,
                                                             Authentication auth) {
        return ResponseEntity.ok(examQuestionService.getByExam(examId, auth.getName()));
    }

    // Get questions filtered by section
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/section/{section}")
    public ResponseEntity<List<ExamQuestionResponse>> getBySection(@PathVariable Long examId,
                                                                   @PathVariable String section,
                                                                   Authentication auth) {
        return ResponseEntity.ok(examQuestionService.getBySection(examId, section, auth.getName()));
    }

    // Update marksOverride, section, or mandatory for a specific exam-question link
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PatchMapping("/{examQuestionId}")
    public ResponseEntity<ExamQuestionResponse> update(@PathVariable Long examId,
                                                       @PathVariable Long examQuestionId,
                                                       @RequestBody ExamQuestionRequest req,
                                                       Authentication auth) {
        return ResponseEntity.ok(examQuestionService.update(examId, examQuestionId, req, auth.getName()));
    }

    // Remove a single question from the exam by bankQuestionId
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @DeleteMapping("/{bankQuestionId}")
    public ResponseEntity<Void> remove(@PathVariable Long examId,
                                       @PathVariable Long bankQuestionId,
                                       Authentication auth) {
        examQuestionService.remove(examId, bankQuestionId, auth.getName());
        return ResponseEntity.ok().build();
    }

    // Remove all questions from the exam
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @DeleteMapping
    public ResponseEntity<Void> removeAll(@PathVariable Long examId, Authentication auth) {
        examQuestionService.removeAll(examId, auth.getName());
        return ResponseEntity.ok().build();
    }
}
