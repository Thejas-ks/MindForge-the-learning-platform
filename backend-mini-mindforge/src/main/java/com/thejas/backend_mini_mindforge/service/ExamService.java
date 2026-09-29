package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.ExamRequest;
import com.thejas.backend_mini_mindforge.dto.response.ExamPreviewResponse;
import com.thejas.backend_mini_mindforge.entity.Exam;
import com.thejas.backend_mini_mindforge.entity.ExamQuestion;
import com.thejas.backend_mini_mindforge.entity.ExamSettings;
import com.thejas.backend_mini_mindforge.entity.ExamStatus;
import com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException;
import com.thejas.backend_mini_mindforge.repository.ExamQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.ExamRepository;
import com.thejas.backend_mini_mindforge.repository.ExamSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ExamService {

    private final ExamRepository examRepository;
    private final ExamSettingsRepository examSettingsRepository;
    private final ExamQuestionRepository examQuestionRepository;

    public ExamService(ExamRepository examRepository,
                       ExamSettingsRepository examSettingsRepository,
                       ExamQuestionRepository examQuestionRepository) {
        this.examRepository = examRepository;
        this.examSettingsRepository = examSettingsRepository;
        this.examQuestionRepository = examQuestionRepository;
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────

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
        exam.setMaxAttempts(req.getMaxAttempts());
        exam.setStartTime(req.getStartTime());
        exam.setEndTime(req.getEndTime());
        Exam saved = examRepository.save(exam);
        ExamSettings settings = new ExamSettings();
        settings.setExam(saved);
        examSettingsRepository.save(settings);
        return saved;
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    public List<Exam> getAll(String createdBy) {
        return examRepository.findByCreatedBy(createdBy);
    }

    public List<Exam> getPublished() {
        return examRepository.findByStatus(ExamStatus.PUBLISHED);
    }

    public Exam getById(Long id, String createdBy) {
        return examRepository.findByIdAndCreatedBy(id, createdBy)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + id));
    }

    /**
     * Teacher-only preview: returns full exam metadata plus enriched question list
     * (with questionText and answer options, including correct flags).
     *
     * Ownership is enforced via getById which uses findByIdAndCreatedBy.
     * This endpoint must remain gated by TEACHER/ADMIN role in the controller.
     */
    @Transactional(readOnly = true)
    public ExamPreviewResponse getPreview(Long id, String createdBy) {
        Exam exam = getById(id, createdBy);
        List<ExamQuestion> questions =
                examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(id);
        return ExamPreviewResponse.from(exam, questions);
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    @Transactional
    public Exam update(Long id, ExamRequest req, String createdBy) {
        Exam exam = getById(id, createdBy);
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Cannot update metadata of a non-draft exam.");
        }
        validate(req);
        exam.setTitle(req.getTitle().trim());
        exam.setDescription(req.getDescription());
        exam.setDurationMinutes(req.getDurationMinutes());
        exam.setTotalMarks(req.getTotalMarks());
        exam.setPassMarks(req.getPassMarks());
        exam.setMaxAttempts(req.getMaxAttempts());
        exam.setStartTime(req.getStartTime());
        exam.setEndTime(req.getEndTime());
        return examRepository.save(exam);
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long id, String createdBy) {
        getById(id, createdBy);
        examRepository.deleteByIdAndCreatedBy(id, createdBy);
    }

    // ─── LIFECYCLE ────────────────────────────────────────────────────────────

    @Transactional
    public Exam publish(Long id, String createdBy) {
        Exam exam = getById(id, createdBy);
        if (exam.getStatus() == ExamStatus.PUBLISHED || exam.getStatus() == ExamStatus.ARCHIVED) {
            throw new IllegalStateException("Exam is already " + exam.getStatus());
        }

        List<ExamQuestion> questions =
                examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(id);
        if (questions.isEmpty()) {
            throw new IllegalStateException("Cannot publish an exam with no questions.");
        }

        int sumEffectiveMarks = 0;
        for (ExamQuestion eq : questions) {
            sumEffectiveMarks += eq.getMarksOverride() != null
                    ? eq.getMarksOverride()
                    : eq.getBankQuestion().getMarks();
        }

        if (sumEffectiveMarks != exam.getTotalMarks()) {
            throw new IllegalStateException("Exam total marks must equal the sum of assigned question marks.");
        }

        exam.setStatus(ExamStatus.PUBLISHED);
        return examRepository.save(exam);
    }

    @Transactional
    public Exam archive(Long id, String createdBy) {
        Exam exam = getById(id, createdBy);
        if (exam.getStatus() != ExamStatus.PUBLISHED) {
            throw new IllegalStateException("Only published exams can be archived.");
        }
        exam.setStatus(ExamStatus.ARCHIVED);
        return examRepository.save(exam);
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
            throw new IllegalArgumentException(
                    "Invalid exam status: " + value + ". Allowed: DRAFT, PUBLISHED, ARCHIVED");
        }
    }
}
