package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.ExamQuestion;
import com.thejas.backend_mini_mindforge.entity.ExamSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface ExamQuestionRepository extends JpaRepository<ExamQuestion, Long> {

    List<ExamQuestion> findByExamIdOrderByQuestionOrderAsc(Long examId);

    List<ExamQuestion> findByExamIdAndSectionOrderByQuestionOrderAsc(Long examId, ExamSection section);

    Optional<ExamQuestion> findByExamIdAndBankQuestionId(Long examId, Long bankQuestionId);

    boolean existsByExamIdAndBankQuestionId(Long examId, Long bankQuestionId);

    // Returns the IDs of bankQuestions already linked to this exam — used for bulk duplicate detection
    @Query("SELECT eq.bankQuestion.id FROM ExamQuestion eq WHERE eq.exam.id = :examId")
    Set<Long> findBankQuestionIdsByExamId(@Param("examId") Long examId);

    // Max order value in the exam — used to auto-assign next questionOrder
    @Query("SELECT COALESCE(MAX(eq.questionOrder), 0) FROM ExamQuestion eq WHERE eq.exam.id = :examId")
    int findMaxQuestionOrderByExamId(@Param("examId") Long examId);

    long countByExamId(Long examId);

    void deleteByExamIdAndBankQuestionId(Long examId, Long bankQuestionId);

    void deleteByExamId(Long examId);
}
