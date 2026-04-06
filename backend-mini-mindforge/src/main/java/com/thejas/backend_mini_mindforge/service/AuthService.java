package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.config.JwtUtil;
import com.thejas.backend_mini_mindforge.dto.request.LoginRequest;
import com.thejas.backend_mini_mindforge.dto.request.RegisterRequest;
import com.thejas.backend_mini_mindforge.dto.response.ApiResponse;
import com.thejas.backend_mini_mindforge.entity.Role;
import com.thejas.backend_mini_mindforge.entity.User;
import com.thejas.backend_mini_mindforge.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public ApiResponse<String> register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return new ApiResponse<>(false, "Email already exists", null);
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setRole(Role.USER); // default role

        userRepository.save(user);
        return new ApiResponse<>(true, "User registered successfully", null);
    }

    public ApiResponse<String> login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user == null) {
            return new ApiResponse<>(false, "User not found", null);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return new ApiResponse<>(false, "Invalid password", null);
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return new ApiResponse<>(true, "Login successful", token);
    }
}
