package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.ExamAttempt;
import com.thejas.backend_mini_mindforge.entity.ExamAttemptStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    // Find active IN_PROGRESS attempt for a student on a specific exam
    Optional<ExamAttempt> findByExamIdAndStudentEmailAndStatus(
            Long examId, String studentEmail, ExamAttemptStatus status);

    // Count total attempts by a student on a specific exam
    int countByExamIdAndStudentEmail(Long examId, String studentEmail);

    // Next attempt number = max + 1
    @Query("SELECT COALESCE(MAX(a.attemptNumber), 0) FROM ExamAttempt a WHERE a.exam.id = :examId AND a.student.email = :email")
    int findMaxAttemptNumber(@Param("examId") Long examId, @Param("email") String email);

    // All attempts by a student, newest first
    List<ExamAttempt> findByStudentEmailOrderByStartedAtDesc(String studentEmail);

    // Single attempt — student can only see their own
    Optional<ExamAttempt> findByIdAndStudentEmail(Long id, String studentEmail);

    // Pessimistic write lock — used by EvaluationService to prevent concurrent evaluation
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM ExamAttempt a WHERE a.id = :id AND a.student.email = :email")
    Optional<ExamAttempt> findByIdAndStudentEmailWithLock(@Param("id") Long id, @Param("email") String email);
}
