package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // find user by email (for login)
    Optional<User> findByEmail(String email);

    // check if email already exists (for register)
    boolean existsByEmail(String email);
}