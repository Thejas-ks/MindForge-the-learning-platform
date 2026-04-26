package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.DailyWorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyWorkoutSessionRepository extends JpaRepository<DailyWorkoutSession, Long> {
    Optional<DailyWorkoutSession> findByEmailAndSessionDate(String email, LocalDate sessionDate);
}
