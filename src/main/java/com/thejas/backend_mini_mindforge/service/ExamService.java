package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.ExamRequest;
import com.thejas.backend_mini_mindforge.entity.Exam;
import com.thejas.backend_mini_mindforge.entity.ExamStatus;
import com.thejas.backend_mini_mindforge.repository.ExamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ExamService {

    private final ExamRepository examRepository;

    public ExamService(ExamRepository examRepository) {
        this.examRepository = examRepository;
    }

    public Exam create(ExamRequest req, String createdBy) {
        validate(req);
        Exam exam = new Exam();
        exam.setTitle(req.getTitle().trim());
        exam.setDescription(req.getDescription());
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setTotalMarks(req.getTotalMarks());
        exam.setPassMarks(req.getPassMarks());
        exam.setStatus(parseStatus(req.getStatus(), ExamStatus.DRAFT));
        exam.setCreatedBy(createdBy);
        return examRepository.save(exam);
    }

    public List<Exam> getAll(String createdBy) {
        return examRepository.findByCreatedBy(createdBy);
    }

    public List<Exam> getPublished() {
        return examRepository.findByStatus(ExamStatus.PUBLISHED);
    }

    public Exam getById(Long id, String createdBy) {
        return examRepository.findByIdAndCreatedBy(id, createdBy)
                .orElseThrow(() -> new RuntimeException("Exam not found with id: " + id));
    }

    @Transactional
    public Exam update(Long id, ExamRequest req, String createdBy) {
        Exam exam = getById(id, createdBy);
        validate(req);
        exam.setTitle(req.getTitle().trim());
        exam.setDescription(req.getDescription());
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setTotalMarks(req.getTotalMarks());
        exam.setPassMarks(req.getPassMarks());
        if (req.getStatus() != null) {
            exam.setStatus(parseStatus(req.getStatus(), exam.getStatus()));
        }
        return examRepository.save(exam);
    }

    @Transactional
    public void delete(Long id, String createdBy) {
        getById(id, createdBy);
        examRepository.deleteByIdAndCreatedBy(id, createdBy);
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private void validate(ExamRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank())
            throw new IllegalArgumentException("Exam title is required");
        if (req.getTitle().trim().length() > 255)
            throw new IllegalArgumentException("Exam title must not exceed 255 characters");
        if (req.getDurationMinutes() == null || req.getDurationMinutes() < 1)
            throw new IllegalArgumentException("Duration must be at least 1 minute");
        if (req.getTotalMarks() == null || req.getTotalMarks() < 1)
            throw new IllegalArgumentException("Total marks must be at least 1");
        if (req.getPassMarks() == null || req.getPassMarks() < 1)
            throw new IllegalArgumentException("Pass marks must be at least 1");
        if (req.getPassMarks() > req.getTotalMarks())
            throw new IllegalArgumentException("Pass marks cannot exceed total marks");
    }

    private ExamStatus parseStatus(String value, ExamStatus fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return ExamStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid exam status: " + value + ". Allowed: DRAFT, PUBLISHED, ARCHIVED");
        }
    }
}
