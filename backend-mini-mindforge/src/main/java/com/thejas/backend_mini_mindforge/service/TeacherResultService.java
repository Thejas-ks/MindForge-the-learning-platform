package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.response.ExamAttemptResponse;
import com.thejas.backend_mini_mindforge.dto.response.TeacherAnswerReviewResponse;
import com.thejas.backend_mini_mindforge.entity.ExamAttempt;
import com.thejas.backend_mini_mindforge.entity.ExamQuestion;
import com.thejas.backend_mini_mindforge.entity.StudentAnswer;
import com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException;
import com.thejas.backend_mini_mindforge.repository.ExamAttemptRepository;
import com.thejas.backend_mini_mindforge.repository.ExamQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.ExamRepository;
import com.thejas.backend_mini_mindforge.repository.StudentAnswerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TeacherResultService {

    private final ExamAttemptRepository attemptRepository;
    private final ExamRepository examRepository;
    private final ExamQuestionRepository examQuestionRepository;
    private final StudentAnswerRepository answerRepository;

    public TeacherResultService(ExamAttemptRepository attemptRepository,
                                ExamRepository examRepository,
                                ExamQuestionRepository examQuestionRepository,
                                StudentAnswerRepository answerRepository) {
        this.attemptRepository = attemptRepository;
        this.examRepository = examRepository;
        this.examQuestionRepository = examQuestionRepository;
        this.answerRepository = answerRepository;
    }

    // ─── GET ALL ATTEMPTS FOR AN EXAM ────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExamAttemptResponse> getAttemptsForExam(Long examId, String teacherEmail) {
        // Verify the teacher owns this exam — throws 404 if not found or not owned
        examRepository.findByIdAndCreatedBy(examId, teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + examId));

        return attemptRepository.findByExamIdOrderByStartedAtDesc(examId)
                .stream()
                .map(a -> ExamAttemptResponse.from(a, -1))   // remainingAttempts not meaningful for teacher
                .collect(Collectors.toList());
    }

    // ─── GET SINGLE ATTEMPT (TEACHER VIEW) ───────────────────────────────────

    @Transactional(readOnly = true)
    public ExamAttemptResponse getAttemptForTeacher(Long attemptId, String teacherEmail) {
        ExamAttempt attempt = attemptRepository.findByIdAndExamCreatedBy(attemptId, teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));
        return ExamAttemptResponse.from(attempt, -1);
    }

    // ─── GET ANSWERS WITH FULL QUESTION CONTEXT (TEACHER VIEW) ───────────────

    @Transactional(readOnly = true)
    public List<TeacherAnswerReviewResponse> getAnswersForTeacher(Long attemptId, String teacherEmail) {
        // Ownership check: attempt must belong to an exam owned by this teacher
        ExamAttempt attempt = attemptRepository.findByIdAndExamCreatedBy(attemptId, teacherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found with id: " + attemptId));

        Long examId = attempt.getExam().getId();

        // Load exam questions ordered by questionOrder
        List<ExamQuestion> examQuestions =
                examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(examId);

        // Index student answers by bankQuestion ID
        Map<Long, StudentAnswer> answerMap = answerRepository
                .findByAttemptIdOrderByAnsweredAtAsc(attemptId)
                .stream()
                .collect(Collectors.toMap(
                        a -> a.getBankQuestion().getId(),
                        a -> a
                ));

        // Build one review entry per exam question (null answer = not answered)
        return examQuestions.stream()
                .map(eq -> TeacherAnswerReviewResponse.from(
                        eq,
                        answerMap.get(eq.getBankQuestion().getId())
                ))
                .collect(Collectors.toList());
    }
}
