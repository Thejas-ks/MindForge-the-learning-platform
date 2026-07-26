package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.service.AiService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    private final AiService aiService;

    public TestController(AiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/health")
    public String health() {
        return "Backend Running";
    }

    @GetMapping("/api/test")
    public String test(Authentication auth) {
        return "Hello " + (auth != null ? auth.getName() : "anonymous");
    }

    @GetMapping("/api/test/ai")
    public String testAi() {
        try {
            String result = aiService.generateAnswer("Say hello in one sentence.");
            return "AI OK: " + result;
        } catch (Exception e) {
            return "AI FAILED: " + e.getMessage();
        }
    }
}