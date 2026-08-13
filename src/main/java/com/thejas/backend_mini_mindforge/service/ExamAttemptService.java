package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.response.ExamAttemptResponse;
import com.thejas.backend_mini_mindforge.entity.*;
import com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException;
import com.thejas.backend_mini_mindforge.repository.ExamAttemptRepository;
import com.thejas.backend_mini_mindforge.repository.ExamRepository;
import com.thejas.backend_mini_mindforge.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExamAttemptService {

    private final ExamAttemptRepository attemptRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;

    public ExamAttemptService(ExamAttemptRepository attemptRepository,
                               ExamRepository examRepository,
                               UserRepository userRepository) {
        this.attemptRepository = attemptRepository;
        this.examRepository = examRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ExamAttemptResponse start(Long examId, String studentEmail, String ipAddress, String userAgent) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found with id: " + examId));

        // 1. Exam must be PUBLISHED
        if (exam.getStatus() != ExamStatus.PUBLISHED)
            throw new IllegalArgumentException("Exam is not available for attempts");

        // 2. Current time must be within exam window (if configured)
        LocalDateTime now = LocalDateTime.now();
        if (exam.getStartTime() != null && now.isBefore(exam.getStartTime()))
            throw new IllegalArgumentException("Exam has not started yet");
        if (exam.getEndTime() != null && now.isAfter(exam.getEndTime()))
            throw new IllegalArgumentException("Exam window has closed");

        User student = userRepository.findByEmail(studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + studentEmail));

        // 3. Return existing IN_PROGRESS attempt (idempotent)
        return attemptRepository
                .findByExamIdAndStudentEmailAndStatus(examId, studentEmail, ExamAttemptStatus.IN_PROGRESS)
                .map(existing -> {
                    int remaining = computeRemaining(exam, examId, studentEmail);
                    return ExamAttemptResponse.from(existing, remaining);
                })
                .orElseGet(() -> {
                    // 4. Check maxAttempts
                    int used = attemptRepository.countByExamIdAndStudentEmail(examId, studentEmail);
                    if (exam.getMaxAttempts() != null && used >= exam.getMaxAttempts())
                        throw new IllegalArgumentException("Maximum attempts reached for this exam");

                    ExamAttempt attempt = new ExamAttempt();
                    attempt.setExam(exam);
                    attempt.setStudent(student);
                    attempt.setAttemptNumber(attemptRepository.findMaxAttemptNumber(examId, studentEmail) + 1);
                    attempt.setStatus(ExamAttemptStatus.IN_PROGRESS);
                    attempt.setStartedAt(now);
                    attempt.setIpAddress(ipAddress);
                    attempt.setUserAgent(userAgent);

                    ExamAttempt saved = attemptRepository.save(attempt);
                    int remaining = computeRemaining(exam, examId, studentEmail);
                    return ExamAttemptResponse.from(saved, remaining);
                });
    }

    public List<ExamAttemptResponse> getMyAttempts(String studentEmail) {
        return attemptRepository.findByStudentEmailOrderByStartedAtDesc(studentEmail)
                .stream()
                .map(a -> {
                    int remaining = computeRemaining(a.getExam(), a.getExam().getId(), studentEmail);
                    return ExamAttemptResponse.from(a, remaining);
                })
                .toList();
    }

    @Transactional
    public ExamAttemptResponse submit(Long attemptId, String studentEmail) {
        ExamAttempt attempt = attemptRepository.findByIdAndStudentEmail(attemptId, studentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found with id: " + attemptId));

        if (attempt.getStatus() != ExamAttemptStatus.IN_PROGRESS)
            throw new IllegalArgumentException(
                    "Cannot submit an attempt with status: " + attempt.getStatus().name() +
                    ". Only IN_PROGRESS attempts can be submitted.");

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endsAt = attempt.getStartedAt()
                .plusMinutes(attempt.getExam().getDurationMinutes());

        boolean expired = now.isAfter(endsAt);
        attempt.setStatus(expired ? ExamAttemptStatus.AUTO_SUBMITTED : ExamAttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(now);

        long secondsTaken = java.time.Duration.between(attempt.getStartedAt(), now).getSeconds();
        int durationCap = attempt.getExam().getDurationMinutes() * 60;
        attempt.setTimeTakenSeconds(expired ? durationCap : (int) secondsTaken);

        ExamAttempt saved = attemptRepository.save(attempt);
        int remaining = computeRemaining(saved.getExam(), saved.getExam().getId(), studentEmail);
        return ExamAttemptResponse.from(saved, remaining);
    }

    public ExamAttemptResponse getById(Long attemptId, String studentEmail) {
        ExamAttempt attempt = attemptRepository.findByIdAndStudentEmail(attemptId, studentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found with id: " + attemptId));
        int remaining = computeRemaining(attempt.getExam(), attempt.getExam().getId(), studentEmail);
        return ExamAttemptResponse.from(attempt, remaining);
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private int computeRemaining(Exam exam, Long examId, String studentEmail) {
        if (exam.getMaxAttempts() == null) return Integer.MAX_VALUE;
        int used = attemptRepository.countByExamIdAndStudentEmail(examId, studentEmail);
        return Math.max(0, exam.getMaxAttempts() - used);
    }
}
