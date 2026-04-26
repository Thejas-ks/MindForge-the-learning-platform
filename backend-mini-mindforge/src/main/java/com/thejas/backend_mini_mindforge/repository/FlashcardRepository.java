package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.Flashcard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FlashcardRepository extends JpaRepository<Flashcard, Long> {
    List<Flashcard> findByEmail(String email);
    List<Flashcard> findByQuestionId(Long questionId);
    void deleteByQuestionIdAndEmail(Long questionId, String email);
    void deleteByEmail(String email);
}
