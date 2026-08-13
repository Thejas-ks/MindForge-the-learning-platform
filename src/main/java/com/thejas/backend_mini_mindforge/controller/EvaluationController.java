package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.response.EvaluationResponse;
import com.thejas.backend_mini_mindforge.service.EvaluationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/attempts/{attemptId}")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @PostMapping("/evaluate")
    public ResponseEntity<EvaluationResponse> evaluate(@PathVariable Long attemptId,
                                                        Authentication auth) {
        return ResponseEntity.ok(evaluationService.evaluate(attemptId, auth.getName()));
    }
}
