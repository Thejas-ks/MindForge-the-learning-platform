package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, Long> {

    Optional<StudentAnswer> findByAttemptIdAndBankQuestionId(Long attemptId, Long bankQuestionId);

    List<StudentAnswer> findByAttemptIdOrderByAnsweredAtAsc(Long attemptId);
}
