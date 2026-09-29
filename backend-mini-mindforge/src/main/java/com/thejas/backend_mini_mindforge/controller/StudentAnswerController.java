package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.StudentAnswerRequest;
import com.thejas.backend_mini_mindforge.dto.response.AttemptQuestionResponse;
import com.thejas.backend_mini_mindforge.dto.response.StudentAnswerResponse;
import com.thejas.backend_mini_mindforge.service.StudentAnswerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attempts/{attemptId}")
public class StudentAnswerController {

    private final StudentAnswerService answerService;

    public StudentAnswerController(StudentAnswerService answerService) {
        this.answerService = answerService;
    }

    @PutMapping("/answers/{questionId}")
    public ResponseEntity<StudentAnswerResponse> upsert(@PathVariable Long attemptId,
                                                         @PathVariable Long questionId,
                                                         @RequestBody StudentAnswerRequest req,
                                                         Authentication auth) {
        return ResponseEntity.ok(answerService.upsert(attemptId, questionId, req, auth.getName()));
    }

    @GetMapping("/answers")
    public ResponseEntity<List<StudentAnswerResponse>> getAnswers(@PathVariable Long attemptId,
                                                                   Authentication auth) {
        return ResponseEntity.ok(answerService.getAnswers(attemptId, auth.getName()));
    }

    @GetMapping("/questions")
    public ResponseEntity<List<AttemptQuestionResponse>> getQuestions(@PathVariable Long attemptId,
                                                                       Authentication auth) {
        return ResponseEntity.ok(answerService.getQuestionsForAttempt(attemptId, auth.getName()));
    }
}
