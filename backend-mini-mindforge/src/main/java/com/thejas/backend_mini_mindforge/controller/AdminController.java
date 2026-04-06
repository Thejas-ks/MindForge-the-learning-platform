package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.entity.BrainQuestion;
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

    // Promote any user to ADMIN — only accessible by existing ADMIN
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/promote")
    public ResponseEntity<String> promote(@RequestParam String email) {
        return userRepository.findByEmail(email)
                .map(user -> {
                    user.setRole(com.thejas.backend_mini_mindforge.entity.Role.ADMIN);
                    userRepository.save(user);
                    return ResponseEntity.ok("User promoted to ADMIN: " + email);
                })
                .orElse(ResponseEntity.badRequest().body("User not found: " + email));
    }
}
