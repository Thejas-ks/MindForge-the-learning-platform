package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.UserPerformance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserPerformanceRepository extends JpaRepository<UserPerformance, Long> {
    Optional<UserPerformance> findByEmail(String email);
}
