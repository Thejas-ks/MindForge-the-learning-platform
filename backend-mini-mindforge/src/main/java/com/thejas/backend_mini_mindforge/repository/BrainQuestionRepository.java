package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.BrainQuestion;
import com.thejas.backend_mini_mindforge.entity.Difficulty;
import com.thejas.backend_mini_mindforge.entity.QuestionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BrainQuestionRepository extends JpaRepository<BrainQuestion, Long> {
    List<BrainQuestion> findByType(QuestionType type);
    List<BrainQuestion> findByTypeAndDifficulty(QuestionType type, Difficulty difficulty);
}
