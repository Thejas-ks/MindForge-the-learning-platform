package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.Exam;
import com.thejas.backend_mini_mindforge.entity.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    List<Exam> findByCreatedBy(String createdBy);

    List<Exam> findByStatus(ExamStatus status);

    Optional<Exam> findByIdAndCreatedBy(Long id, String createdBy);

    void deleteByIdAndCreatedBy(Long id, String createdBy);
}
