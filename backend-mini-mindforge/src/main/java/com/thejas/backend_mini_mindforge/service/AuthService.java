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

import java.util.logging.Logger;

@Service
public class AuthService {

    private static final Logger log = Logger.getLogger(AuthService.class.getName());

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
        user.setRole(Role.USER);
        user.setAuthProvider("email");
        userRepository.save(user);
        return new ApiResponse<>(true, "User registered successfully", null);
    }

    public ApiResponse<String> login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) return new ApiResponse<>(false, "User not found", null);
        if (user.getPassword() == null || user.getPassword().startsWith("GOOGLE_AUTH_"))
            return new ApiResponse<>(false, "This account uses Google Sign-In. Please continue with Google.", null);
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword()))
            return new ApiResponse<>(false, "Invalid password", null);
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return new ApiResponse<>(true, "Login successful", token);
    }

    public ApiResponse<String> googleLogin(String accessToken) {
        try {
            // Verify token by calling Google's userinfo endpoint
            java.net.URL url = new java.net.URL("https://www.googleapis.com/oauth2/v3/userinfo");
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestProperty("Authorization", "Bearer " + accessToken);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            if (conn.getResponseCode() != 200) {
                log.warning("[GoogleAuth] Userinfo returned " + conn.getResponseCode());
                return new ApiResponse<>(false, "Invalid Google token", null);
            }

            String json = new String(conn.getInputStream().readAllBytes());
            com.fasterxml.jackson.databind.JsonNode node =
                    new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);

            String email   = node.path("email").asText(null);
            String name    = node.path("name").asText(null);
            String googleId = node.path("sub").asText(null);
            String picture = node.path("picture").asText(null);

            if (email == null || email.isBlank()) {
                return new ApiResponse<>(false, "Could not retrieve email from Google", null);
            }

            log.info("[GoogleAuth] Verified: " + email);

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                user = new User();
                user.setEmail(email);
                user.setName(name);
                user.setGoogleId(googleId);
                user.setProfileImage(picture);
                user.setAuthProvider("google");
                user.setRole(Role.USER);
                // Set a non-guessable placeholder — Google users never use password login
                user.setPassword("GOOGLE_AUTH_" + googleId);
                userRepository.save(user);
                log.info("[GoogleAuth] Created new user: " + email);
            } else {
                if (user.getGoogleId() == null) user.setGoogleId(googleId);
                if (user.getProfileImage() == null) user.setProfileImage(picture);
                userRepository.save(user);
            }

            String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
            return new ApiResponse<>(true, "Google login successful", token);

        } catch (Exception e) {
            log.severe("[GoogleAuth] Error: " + e.getMessage());
            return new ApiResponse<>(false, "Google authentication failed: " + e.getMessage(), null);
        }
    }
}
