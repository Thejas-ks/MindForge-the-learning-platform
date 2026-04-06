package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.SubmitAnswerRequest;
import com.thejas.backend_mini_mindforge.dto.response.SubmitAnswerResponse;
import com.thejas.backend_mini_mindforge.dto.response.StreakResponse;
import com.thejas.backend_mini_mindforge.entity.BrainQuestion;
import com.thejas.backend_mini_mindforge.service.WorkoutService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workout")
public class WorkoutController {

    private final WorkoutService workoutService;

    public WorkoutController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    // Returns 3 daily questions (1 logic, 1 aptitude, 1 coding) — same for everyone today
    @GetMapping("/today")
    public ResponseEntity<List<BrainQuestion>> getToday() {
        return ResponseEntity.ok(workoutService.getTodayQuestions());
    }

    // Returns questions filtered by type and difficulty
    // Example: GET /api/workout/practice?type=LOGIC&difficulty=EASY
    @GetMapping("/practice")
    public ResponseEntity<List<BrainQuestion>> getPractice(
            @RequestParam String type,
            @RequestParam String difficulty) {
        return ResponseEntity.ok(workoutService.getPracticeQuestions(type, difficulty));
    }

    // Submit answer for a question — updates streak and returns result
    @PostMapping("/submit")
    public ResponseEntity<SubmitAnswerResponse> submit(
            @RequestBody SubmitAnswerRequest request,
            Authentication auth) {
        return ResponseEntity.ok(workoutService.submitAnswer(request, auth.getName()));
    }

    // Get current streak for logged-in user
    @GetMapping("/streak")
    public ResponseEntity<StreakResponse> getStreak(Authentication auth) {
        return ResponseEntity.ok(workoutService.getStreak(auth.getName()));
    }
}
