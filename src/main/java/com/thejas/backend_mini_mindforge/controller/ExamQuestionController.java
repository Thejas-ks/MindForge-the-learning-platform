package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.BulkAddQuestionsRequest;
import com.thejas.backend_mini_mindforge.dto.request.ExamQuestionRequest;
import com.thejas.backend_mini_mindforge.dto.response.BulkAddSummaryResponse;
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

    // Bulk add questions to an exam
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping
    public ResponseEntity<BulkAddSummaryResponse> bulkAdd(@PathVariable Long examId,
                                                          @RequestBody BulkAddQuestionsRequest req,
                                                          Authentication auth) {
        return ResponseEntity.ok(examQuestionService.bulkAdd(examId, req, auth.getName()));
    }

    // Add a single question with optional marksOverride
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping("/single")
    public ResponseEntity<ExamQuestionResponse> addSingle(@PathVariable Long examId,
                                                          @RequestBody ExamQuestionRequest req,
                                                          Authentication auth) {
        return ResponseEntity.ok(examQuestionService.addSingle(examId, req, auth.getName()));
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
