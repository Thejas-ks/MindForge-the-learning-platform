package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.LoginRequest;
import com.thejas.backend_mini_mindforge.dto.request.RegisterRequest;
import com.thejas.backend_mini_mindforge.dto.response.ApiResponse;
import com.thejas.backend_mini_mindforge.service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ApiResponse<String> register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public ApiResponse<String> login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/google")
    public ApiResponse<String> googleLogin(@RequestBody Map<String, String> body) {
        String credential = body.get("credential");
        if (credential == null || credential.isBlank())
            return new ApiResponse<>(false, "Missing Google credential", null);
        return authService.googleLogin(credential);
    }
}