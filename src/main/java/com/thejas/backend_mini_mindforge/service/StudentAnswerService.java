package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.StudentAnswerRequest;
import com.thejas.backend_mini_mindforge.dto.response.AttemptQuestionResponse;
import com.thejas.backend_mini_mindforge.dto.response.SavedAnswerView;
import com.thejas.backend_mini_mindforge.dto.response.StudentAnswerResponse;
import com.thejas.backend_mini_mindforge.entity.*;
import com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException;
import com.thejas.backend_mini_mindforge.repository.BankQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.ExamAttemptRepository;
import com.thejas.backend_mini_mindforge.repository.ExamQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.StudentAnswerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class StudentAnswerService {

    private final StudentAnswerRepository answerRepository;
    private final ExamAttemptRepository attemptRepository;
    private final BankQuestionRepository bankQuestionRepository;
    private final ExamQuestionRepository examQuestionRepository;

    public StudentAnswerService(StudentAnswerRepository answerRepository,
                                 ExamAttemptRepository attemptRepository,
                                 BankQuestionRepository bankQuestionRepository,
                                 ExamQuestionRepository examQuestionRepository) {
        this.answerRepository = answerRepository;
        this.attemptRepository = attemptRepository;
        this.bankQuestionRepository = bankQuestionRepository;
        this.examQuestionRepository = examQuestionRepository;
    }

    @Transactional
    public StudentAnswerResponse upsert(Long attemptId, Long questionId,
                                         StudentAnswerRequest req, String studentEmail) {
        // 1. Attempt exists and belongs to this student
        ExamAttempt attempt = attemptRepository.findByIdAndStudentEmail(attemptId, studentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found with id: " + attemptId));

        // 2. Attempt must be IN_PROGRESS
        if (attempt.getStatus() != ExamAttemptStatus.IN_PROGRESS)
            throw new IllegalArgumentException("Answers can only be saved for an IN_PROGRESS attempt");

        // 3. BankQuestion must belong to this exam
        if (!examQuestionRepository.existsByExamIdAndBankQuestionId(attempt.getExam().getId(), questionId))
            throw new IllegalArgumentException("Question " + questionId + " is not part of this exam");

        BankQuestion question = bankQuestionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with id: " + questionId));

        // 4. Validate answer format per question type
        validateAnswerFormat(req, question);

        // 5. Upsert
        LocalDateTime now = LocalDateTime.now();
        StudentAnswer answer = answerRepository
                .findByAttemptIdAndBankQuestionId(attemptId, questionId)
                .orElseGet(() -> {
                    StudentAnswer a = new StudentAnswer();
                    a.setAttempt(attempt);
                    a.setBankQuestion(question);
                    a.setAnsweredAt(now);
                    return a;
                });

        applyAnswer(answer, req, question.getQuestionType(), now);
        return StudentAnswerResponse.from(answerRepository.save(answer));
    }

    @Transactional
    public List<StudentAnswerResponse> getAnswers(Long attemptId, String studentEmail) {
        // Verify ownership
        attemptRepository.findByIdAndStudentEmail(attemptId, studentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found with id: " + attemptId));

        return answerRepository.findByAttemptIdOrderByAnsweredAtAsc(attemptId)
                .stream()
                .map(StudentAnswerResponse::from)
                .toList();
    }

    @Transactional
    public List<AttemptQuestionResponse> getQuestionsForAttempt(Long attemptId, String studentEmail) {
        ExamAttempt attempt = attemptRepository.findByIdAndStudentEmail(attemptId, studentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

        if (attempt.getStatus() != ExamAttemptStatus.IN_PROGRESS)
            throw new IllegalArgumentException(
                    "Questions can only be retrieved for an IN_PROGRESS attempt. Current status: "
                    + attempt.getStatus().name());

        Long examId = attempt.getExam().getId();

        List<ExamQuestion> examQuestions =
                examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(examId);

        Map<Long, StudentAnswer> answersByQuestionId =
                answerRepository.findByAttemptIdOrderByAnsweredAtAsc(attemptId)
                        .stream()
                        .collect(Collectors.toMap(
                                a -> a.getBankQuestion().getId(),
                                a -> a
                        ));

        return examQuestions.stream()
                .map(eq -> {
                    StudentAnswer saved = answersByQuestionId.get(eq.getBankQuestion().getId());
                    SavedAnswerView savedView = saved != null ? SavedAnswerView.from(saved) : null;
                    return AttemptQuestionResponse.from(eq, savedView);
                })
                .collect(Collectors.toList());
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private void validateAnswerFormat(StudentAnswerRequest req, BankQuestion question) {
        BankQuestionType type = question.getQuestionType();

        switch (type) {
            case MCQ_SINGLE, TRUE_FALSE -> {
                if (req.getSelectedOptionId() == null)
                    throw new IllegalArgumentException("selectedOptionId is required for " + type);
                if (req.getTextAnswer() != null)
                    throw new IllegalArgumentException("textAnswer is not applicable for " + type);
                validateOptionBelongsToQuestion(req.getSelectedOptionId(), question);
            }
            case MCQ_MULTIPLE -> {
                if (req.getSelectedOptionIds() == null || req.getSelectedOptionIds().isEmpty())
                    throw new IllegalArgumentException("selectedOptionIds is required for MCQ_MULTIPLE");
                if (req.getTextAnswer() != null)
                    throw new IllegalArgumentException("textAnswer is not applicable for MCQ_MULTIPLE");
                Set<Long> validIds = question.getOptions().stream()
                        .map(QuestionOption::getId)
                        .collect(Collectors.toSet());
                for (Long id : req.getSelectedOptionIds()) {
                    if (!validIds.contains(id))
                        throw new IllegalArgumentException("Option " + id + " does not belong to question " + question.getId());
                }
            }
            case SHORT_ANSWER, LONG_ANSWER, FILL_BLANK -> {
                if (req.getTextAnswer() == null || req.getTextAnswer().isBlank())
                    throw new IllegalArgumentException("textAnswer is required for " + type);
                if (req.getSelectedOptionId() != null || (req.getSelectedOptionIds() != null && !req.getSelectedOptionIds().isEmpty()))
                    throw new IllegalArgumentException("Option selection is not applicable for " + type);
            }
        }
    }

    private void validateOptionBelongsToQuestion(Long optionId, BankQuestion question) {
        boolean valid = question.getOptions().stream()
                .anyMatch(o -> o.getId().equals(optionId));
        if (!valid)
            throw new IllegalArgumentException("Option " + optionId + " does not belong to question " + question.getId());
    }

    private void applyAnswer(StudentAnswer answer, StudentAnswerRequest req,
                              BankQuestionType type, LocalDateTime now) {
        // Clear all answer fields first to avoid stale data on type change
        answer.setSelectedOptionId(null);
        answer.setSelectedOptionIds(null);
        answer.setTextAnswer(null);

        switch (type) {
            case MCQ_SINGLE, TRUE_FALSE -> answer.setSelectedOptionId(req.getSelectedOptionId());
            case MCQ_MULTIPLE -> answer.setSelectedOptionIds(
                    req.getSelectedOptionIds().stream()
                            .map(String::valueOf)
                            .collect(Collectors.joining(","))
            );
            case SHORT_ANSWER, LONG_ANSWER, FILL_BLANK -> answer.setTextAnswer(req.getTextAnswer().trim());
        }

        answer.setLastSavedAt(now);
    }
}
