package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.ExamSettingsRequest;
import com.thejas.backend_mini_mindforge.dto.response.ExamSettingsResponse;
import com.thejas.backend_mini_mindforge.service.ExamSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exams/{examId}/settings")
@PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
public class ExamSettingsController {

    private final ExamSettingsService settingsService;

    public ExamSettingsController(ExamSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public ResponseEntity<ExamSettingsResponse> get(@PathVariable Long examId, Authentication auth) {
        return ResponseEntity.ok(settingsService.get(examId, auth.getName()));
    }

    @PutMapping
    public ResponseEntity<ExamSettingsResponse> update(@PathVariable Long examId,
                                                        @RequestBody ExamSettingsRequest req,
                                                        Authentication auth) {
        return ResponseEntity.ok(settingsService.update(examId, req, auth.getName()));
    }
}
