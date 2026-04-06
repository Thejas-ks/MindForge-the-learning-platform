package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findByEmail(String email);
}