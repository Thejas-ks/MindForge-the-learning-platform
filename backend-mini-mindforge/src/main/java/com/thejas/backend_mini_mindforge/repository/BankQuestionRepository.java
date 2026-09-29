package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.BankQuestion;
import com.thejas.backend_mini_mindforge.entity.Difficulty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BankQuestionRepository extends JpaRepository<BankQuestion, Long> {

    // Finalized questions only (isDraft = false)
    List<BankQuestion> findByCreatedByAndIsDraftFalse(String createdBy);

    List<BankQuestion> findByCreatedByAndDifficultyAndIsDraftFalse(String createdBy, Difficulty difficulty);

    List<BankQuestion> findByCreatedByAndTopicAndIsDraftFalse(String createdBy, String topic);

    Optional<BankQuestion> findByIdAndCreatedBy(Long id, String createdBy);

    void deleteByIdAndCreatedBy(Long id, String createdBy);

    // Draft questions for a specific exam context
    List<BankQuestion> findByCreatedByAndIsDraftTrue(String createdBy);

    List<BankQuestion> findByCreatedByAndIsDraftTrueAndExamDraftId(String createdBy, Long examDraftId);

    // Search: title or questionText contains keyword (finalized only)
    @Query("SELECT q FROM BankQuestion q WHERE q.createdBy = :createdBy AND q.isDraft = false " +
           "AND (LOWER(q.title) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "OR LOWER(q.questionText) LIKE LOWER(CONCAT('%', :kw, '%')))")
    List<BankQuestion> searchFinalized(@Param("createdBy") String createdBy, @Param("kw") String keyword);

    // Search with difficulty filter
    @Query("SELECT q FROM BankQuestion q WHERE q.createdBy = :createdBy AND q.isDraft = false " +
           "AND q.difficulty = :difficulty " +
           "AND (LOWER(q.title) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "OR LOWER(q.questionText) LIKE LOWER(CONCAT('%', :kw, '%')))")
    List<BankQuestion> searchFinalizedByDifficulty(@Param("createdBy") String createdBy,
                                                    @Param("difficulty") Difficulty difficulty,
                                                    @Param("kw") String keyword);
}
