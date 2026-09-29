package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.response.ExamAttemptResponse;
import com.thejas.backend_mini_mindforge.dto.response.TeacherAnswerReviewResponse;
import com.thejas.backend_mini_mindforge.service.TeacherResultService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class TeacherResultController {

    private final TeacherResultService teacherResultService;

    public TeacherResultController(TeacherResultService teacherResultService) {
        this.teacherResultService = teacherResultService;
    }

    // All attempts for an exam the teacher owns
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/api/exams/{examId}/attempts")
    public ResponseEntity<List<ExamAttemptResponse>> getExamAttempts(
            @PathVariable Long examId,
            Authentication auth) {
        return ResponseEntity.ok(
                teacherResultService.getAttemptsForExam(examId, auth.getName()));
    }

    // Single attempt — teacher access via exam ownership
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/api/teacher/attempts/{attemptId}")
    public ResponseEntity<ExamAttemptResponse> getAttempt(
            @PathVariable Long attemptId,
            Authentication auth) {
        return ResponseEntity.ok(
                teacherResultService.getAttemptForTeacher(attemptId, auth.getName()));
    }

    // Full answer review with question context and correct answers — teacher only
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/api/teacher/attempts/{attemptId}/answers")
    public ResponseEntity<List<TeacherAnswerReviewResponse>> getAnswers(
            @PathVariable Long attemptId,
            Authentication auth) {
        return ResponseEntity.ok(
                teacherResultService.getAnswersForTeacher(attemptId, auth.getName()));
    }
}
