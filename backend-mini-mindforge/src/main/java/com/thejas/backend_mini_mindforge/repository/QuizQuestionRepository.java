package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findByEmail(String email);
    List<QuizQuestion> findByQuestionId(Long questionId);
}
