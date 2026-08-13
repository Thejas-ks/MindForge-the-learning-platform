package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.response.EvaluationResponse;
import com.thejas.backend_mini_mindforge.entity.*;
import com.thejas.backend_mini_mindforge.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class EvaluationService {

    private final ExamAttemptRepository attemptRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final ExamSettingsRepository examSettingsRepository;

    public EvaluationService(ExamAttemptRepository attemptRepository,
                              ExamQuestionRepository examQuestionRepository,
                              StudentAnswerRepository studentAnswerRepository,
                              ExamSettingsRepository examSettingsRepository) {
        this.attemptRepository = attemptRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.studentAnswerRepository = studentAnswerRepository;
        this.examSettingsRepository = examSettingsRepository;
    }

    @Transactional
    public EvaluationResponse evaluate(Long attemptId, String studentEmail) {
        // Pessimistic write lock — prevents two concurrent evaluation requests
        ExamAttempt attempt = attemptRepository.findByIdAndStudentEmailWithLock(attemptId, studentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found with id: " + attemptId));

        ExamAttemptStatus status = attempt.getStatus();
        if (status == ExamAttemptStatus.EVALUATED)
            throw new IllegalArgumentException("Attempt has already been evaluated");
        if (status != ExamAttemptStatus.SUBMITTED && status != ExamAttemptStatus.AUTO_SUBMITTED)
            throw new IllegalArgumentException(
                    "Attempt must be SUBMITTED or AUTO_SUBMITTED to evaluate. Current status: " + status.name());

        Long examId = attempt.getExam().getId();

        // Load exam questions and settings
        List<ExamQuestion> examQuestions = examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(examId);
        ExamSettings settings = examSettingsRepository.findByExamId(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam settings not found for exam: " + examId));

        // Index student answers by bankQuestion ID for O(1) lookup
        Map<Long, StudentAnswer> answerMap = studentAnswerRepository
                .findByAttemptIdOrderByAnsweredAtAsc(attemptId)
                .stream()
                .collect(Collectors.toMap(a -> a.getBankQuestion().getId(), a -> a));

        boolean negativeEnabled = settings.isNegativeMarkingEnabled();
        double negativeDeduction = settings.getNegativeMarksPerWrongAnswer();

        double totalPossible = 0;
        double rawScore = 0;
        List<StudentAnswer> answersToSave = new ArrayList<>();

        for (ExamQuestion eq : examQuestions) {
            BankQuestion bq = eq.getBankQuestion();
            BankQuestionType type = bq.getQuestionType();

            // Only Phase 1 types are auto-evaluated
            if (type != BankQuestionType.MCQ_SINGLE
                    && type != BankQuestionType.MCQ_MULTIPLE
                    && type != BankQuestionType.TRUE_FALSE) {
                continue;
            }

            int effectiveMarks = eq.getMarksOverride() != null ? eq.getMarksOverride() : bq.getMarks();
            totalPossible += effectiveMarks;

            StudentAnswer answer = answerMap.get(bq.getId());

            if (answer == null) {
                // Unanswered — 0 marks, no StudentAnswer created
                continue;
            }

            boolean correct = switch (type) {
                case MCQ_SINGLE, TRUE_FALSE -> evaluateSingle(answer.getSelectedOptionId(), bq);
                case MCQ_MULTIPLE -> evaluateMultiple(answer.getSelectedOptionIds(), bq);
                default -> false;
            };

            double marksAwarded;
            if (correct) {
                marksAwarded = effectiveMarks;
            } else {
                marksAwarded = negativeEnabled ? -negativeDeduction : 0.0;
            }

            answer.setIsCorrect(correct);
            answer.setMarksAwarded(marksAwarded);
            answersToSave.add(answer);

            rawScore += marksAwarded;
        }

        // Score must never go below 0
        double finalScore = Math.max(0, rawScore);
        double percentage = totalPossible > 0 ? (finalScore / totalPossible) * 100.0 : 0.0;
        boolean passed = finalScore >= attempt.getExam().getPassMarks();

        // Persist evaluated answers
        studentAnswerRepository.saveAll(answersToSave);

        // Update attempt
        attempt.setScore(finalScore);
        attempt.setPercentage(Math.round(percentage * 100.0) / 100.0);
        attempt.setPassed(passed);
        attempt.setEvaluatedAt(LocalDateTime.now());
        attempt.setStatus(ExamAttemptStatus.EVALUATED);
        attemptRepository.save(attempt);

        return EvaluationResponse.from(attempt, (int) totalPossible);
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private boolean evaluateSingle(Long selectedOptionId, BankQuestion bq) {
        if (selectedOptionId == null) return false;
        return bq.getOptions().stream()
                .anyMatch(o -> o.getId().equals(selectedOptionId) && Boolean.TRUE.equals(o.getCorrect()));
    }

    private boolean evaluateMultiple(String selectedOptionIds, BankQuestion bq) {
        if (selectedOptionIds == null || selectedOptionIds.isBlank()) return false;

        Set<Long> selected = Arrays.stream(selectedOptionIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toSet());

        Set<Long> correctIds = bq.getOptions().stream()
                .filter(o -> Boolean.TRUE.equals(o.getCorrect()))
                .map(QuestionOption::getId)
                .collect(Collectors.toSet());

        return selected.equals(correctIds);
    }
}
