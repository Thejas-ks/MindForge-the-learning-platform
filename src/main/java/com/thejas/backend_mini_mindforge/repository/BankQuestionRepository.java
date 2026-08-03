package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.BankQuestion;
import com.thejas.backend_mini_mindforge.entity.Difficulty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BankQuestionRepository extends JpaRepository<BankQuestion, Long> {

    List<BankQuestion> findByCreatedBy(String createdBy);

    List<BankQuestion> findByCreatedByAndDifficulty(String createdBy, Difficulty difficulty);

    List<BankQuestion> findByCreatedByAndTopic(String createdBy, String topic);

    Optional<BankQuestion> findByIdAndCreatedBy(Long id, String createdBy);

    void deleteByIdAndCreatedBy(Long id, String createdBy);
}
