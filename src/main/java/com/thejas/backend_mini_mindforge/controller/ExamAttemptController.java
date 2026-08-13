package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.response.ExamAttemptResponse;
import com.thejas.backend_mini_mindforge.service.ExamAttemptService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ExamAttemptController {

    private final ExamAttemptService attemptService;

    public ExamAttemptController(ExamAttemptService attemptService) {
        this.attemptService = attemptService;
    }

    @PostMapping("/api/exams/{examId}/start")
    public ResponseEntity<ExamAttemptResponse> start(@PathVariable Long examId,
                                                      Authentication auth,
                                                      HttpServletRequest request) {
        String ip = resolveClientIp(request);
        String ua = request.getHeader("User-Agent");
        return ResponseEntity.ok(attemptService.start(examId, auth.getName(), ip, ua));
    }

    @GetMapping("/api/my-attempts")
    public ResponseEntity<List<ExamAttemptResponse>> getMyAttempts(Authentication auth) {
        return ResponseEntity.ok(attemptService.getMyAttempts(auth.getName()));
    }

    @GetMapping("/api/attempts/{attemptId}")
    public ResponseEntity<ExamAttemptResponse> getById(@PathVariable Long attemptId,
                                                        Authentication auth) {
        return ResponseEntity.ok(attemptService.getById(attemptId, auth.getName()));
    }

    @PostMapping("/api/attempts/{attemptId}/submit")
    public ResponseEntity<ExamAttemptResponse> submit(@PathVariable Long attemptId,
                                                       Authentication auth) {
        return ResponseEntity.ok(attemptService.submit(attemptId, auth.getName()));
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
