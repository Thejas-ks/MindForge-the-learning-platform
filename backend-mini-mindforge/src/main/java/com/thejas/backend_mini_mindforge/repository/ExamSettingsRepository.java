package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.ExamSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExamSettingsRepository extends JpaRepository<ExamSettings, Long> {

    Optional<ExamSettings> findByExamId(Long examId);

    Optional<ExamSettings> findByExamIdAndExamCreatedBy(Long examId, String createdBy);
}
