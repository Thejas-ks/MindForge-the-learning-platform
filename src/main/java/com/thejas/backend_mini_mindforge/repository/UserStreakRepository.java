package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.UserStreak;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserStreakRepository extends JpaRepository<UserStreak, Long> {
    Optional<UserStreak> findByEmail(String email);
}
