package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.SubmitAnswerRequest;
import com.thejas.backend_mini_mindforge.dto.response.DailyWorkoutResponse;
import com.thejas.backend_mini_mindforge.dto.response.StreakResponse;
import com.thejas.backend_mini_mindforge.dto.response.SubmitAnswerResponse;
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

    // Returns today's workout — same questions per user per day (UTC)
    // Includes completion status and difficulty level
    @GetMapping("/today")
    public ResponseEntity<DailyWorkoutResponse> getToday(Authentication auth) {
        return ResponseEntity.ok(workoutService.getTodayWorkout(auth.getName()));
    }

    // Practice questions by type and difficulty
    @GetMapping("/practice")
    public ResponseEntity<List<BrainQuestion>> getPractice(
            @RequestParam String type,
            @RequestParam String difficulty) {
        return ResponseEntity.ok(workoutService.getPracticeQuestions(type, difficulty));
    }

    // Submit answer — updates session progress, streak, and difficulty
    @PostMapping("/submit")
    public ResponseEntity<SubmitAnswerResponse> submit(
            @RequestBody SubmitAnswerRequest request,
            Authentication auth) {
        return ResponseEntity.ok(workoutService.submitAnswer(request, auth.getName()));
    }

    // Get current streak
    @GetMapping("/streak")
    public ResponseEntity<StreakResponse> getStreak(Authentication auth) {
        return ResponseEntity.ok(workoutService.getStreak(auth.getName()));
    }
}
