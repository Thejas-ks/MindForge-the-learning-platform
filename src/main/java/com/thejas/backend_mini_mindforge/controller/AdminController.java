package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.entity.BrainQuestion;
import com.thejas.backend_mini_mindforge.entity.Role;
import com.thejas.backend_mini_mindforge.repository.BrainQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final BrainQuestionRepository brainQuestionRepository;
    private final UserRepository userRepository;

    public AdminController(BrainQuestionRepository brainQuestionRepository,
                           UserRepository userRepository) {
        this.brainQuestionRepository = brainQuestionRepository;
        this.userRepository = userRepository;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/add-question")
    public ResponseEntity<BrainQuestion> addQuestion(@RequestBody BrainQuestion question) {
        return ResponseEntity.ok(brainQuestionRepository.save(question));
    }

    // Promote any user to TEACHER or ADMIN — only accessible by existing ADMIN
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/promote")
    public ResponseEntity<String> promote(@RequestParam String email,
                                          @RequestParam(defaultValue = "ADMIN") String role) {
        Role targetRole;
        try {
            targetRole = Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid role: " + role + ". Allowed: TEACHER, ADMIN");
        }
        if (targetRole == Role.USER) {
            return ResponseEntity.badRequest().body("Cannot promote to USER. Allowed: TEACHER, ADMIN");
        }
        return userRepository.findByEmail(email)
                .map(user -> {
                    user.setRole(targetRole);
                    userRepository.save(user);
                    return ResponseEntity.ok("User " + email + " promoted to " + targetRole.name());
                })
                .orElse(ResponseEntity.badRequest().body("User not found: " + email));
    }
}
