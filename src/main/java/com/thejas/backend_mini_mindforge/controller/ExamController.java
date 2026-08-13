package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.ExamRequest;
import com.thejas.backend_mini_mindforge.entity.Exam;
import com.thejas.backend_mini_mindforge.service.ExamService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamService examService;

    public ExamController(ExamService examService) {
        this.examService = examService;
    }

    // Create exam — TEACHER or ADMIN
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PostMapping
    public ResponseEntity<Exam> create(@RequestBody ExamRequest req, Authentication auth) {
        return ResponseEntity.ok(examService.create(req, auth.getName()));
    }

    // Get all exams created by the authenticated user
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping
    public ResponseEntity<List<Exam>> getAll(Authentication auth) {
        return ResponseEntity.ok(examService.getAll(auth.getName()));
    }

    // Get all published exams — accessible by any authenticated user
    @GetMapping("/published")
    public ResponseEntity<List<Exam>> getPublished() {
        return ResponseEntity.ok(examService.getPublished());
    }

    // Get single exam by ID — only the creator can access
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @GetMapping("/{id}")
    public ResponseEntity<Exam> getById(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(examService.getById(id, auth.getName()));
    }

    // Update exam — only the creator can update
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @PutMapping("/{id}")
    public ResponseEntity<Exam> update(@PathVariable Long id,
                                       @RequestBody ExamRequest req,
                                       Authentication auth) {
        return ResponseEntity.ok(examService.update(id, req, auth.getName()));
    }

    // Delete exam — only the creator can delete
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        examService.delete(id, auth.getName());
        return ResponseEntity.ok().build();
    }
}
