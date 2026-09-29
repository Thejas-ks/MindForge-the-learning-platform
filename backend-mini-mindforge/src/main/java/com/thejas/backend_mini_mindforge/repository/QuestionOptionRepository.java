package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {

    List<QuestionOption> findByQuestionIdOrderByDisplayOrderAsc(Long questionId);

    void deleteByQuestionId(Long questionId);
}
