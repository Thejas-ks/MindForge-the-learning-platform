package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.BulkAddQuestionsRequest;
import com.thejas.backend_mini_mindforge.dto.request.ExamQuestionRequest;
import com.thejas.backend_mini_mindforge.dto.response.BulkAddSummaryResponse;
import com.thejas.backend_mini_mindforge.dto.response.ExamQuestionResponse;
import com.thejas.backend_mini_mindforge.entity.*;
import com.thejas.backend_mini_mindforge.repository.BankQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.ExamQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.ExamRepository;
import com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ExamQuestionService {

    private final ExamQuestionRepository examQuestionRepository;
    private final ExamRepository examRepository;
    private final BankQuestionRepository bankQuestionRepository;

    public ExamQuestionService(ExamQuestionRepository examQuestionRepository,
                               ExamRepository examRepository,
                               BankQuestionRepository bankQuestionRepository) {
        this.examQuestionRepository = examQuestionRepository;
        this.examRepository = examRepository;
        this.bankQuestionRepository = bankQuestionRepository;
    }

    // ─── BULK ADD ─────────────────────────────────────────────────────────────

    @Transactional
    public BulkAddSummaryResponse bulkAdd(Long examId, BulkAddQuestionsRequest req, String createdBy) {
        if (req.getQuestionIds() == null || req.getQuestionIds().isEmpty())
            throw new IllegalArgumentException("questionIds must not be empty");

        Exam exam = findOwnedExam(examId, createdBy);
        ExamSection section = parseSection(req.getSection(), ExamSection.GENERAL);
        boolean mandatory = req.getMandatory() != null ? req.getMandatory() : false;

        // Fetch all bank question IDs already in this exam in one query
        Set<Long> existingIds = examQuestionRepository.findBankQuestionIdsByExamId(examId);

        // Start ordering from after the current max
        int nextOrder = examQuestionRepository.findMaxQuestionOrderByExamId(examId) + 1;

        int added = 0;
        int duplicates = 0;
        List<ExamQuestion> toSave = new ArrayList<>();

        for (Long bankQuestionId : req.getQuestionIds()) {
            if (existingIds.contains(bankQuestionId)) {
                duplicates++;
                continue;
            }
            BankQuestion bankQuestion = bankQuestionRepository.findById(bankQuestionId)
                    .orElseThrow(() -> new ResourceNotFoundException("BankQuestion not found with id: " + bankQuestionId));

            ExamQuestion eq = new ExamQuestion();
            eq.setExam(exam);
            eq.setBankQuestion(bankQuestion);
            eq.setQuestionOrder(nextOrder++);
            eq.setSection(section);
            eq.setMandatory(mandatory);
            eq.setMarksOverride(null);
            toSave.add(eq);
            existingIds.add(bankQuestionId); // guard against duplicates within the same request
            added++;
        }

        examQuestionRepository.saveAll(toSave);
        long total = examQuestionRepository.countByExamId(examId);
        return new BulkAddSummaryResponse(added, duplicates, total);
    }

    // ─── SINGLE ADD ───────────────────────────────────────────────────────────

    @Transactional
    public ExamQuestionResponse addSingle(Long examId, ExamQuestionRequest req, String createdBy) {
        if (req.getBankQuestionId() == null)
            throw new IllegalArgumentException("bankQuestionId is required");

        Exam exam = findOwnedExam(examId, createdBy);

        if (examQuestionRepository.existsByExamIdAndBankQuestionId(examId, req.getBankQuestionId()))
            throw new IllegalArgumentException("Question " + req.getBankQuestionId() + " is already in this exam");

        BankQuestion bankQuestion = bankQuestionRepository.findById(req.getBankQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("BankQuestion not found with id: " + req.getBankQuestionId()));

        if (req.getMarksOverride() != null && req.getMarksOverride() < 1)
            throw new IllegalArgumentException("marksOverride must be at least 1");

        int nextOrder = examQuestionRepository.findMaxQuestionOrderByExamId(examId) + 1;

        ExamQuestion eq = new ExamQuestion();
        eq.setExam(exam);
        eq.setBankQuestion(bankQuestion);
        eq.setQuestionOrder(nextOrder);
        eq.setMarksOverride(req.getMarksOverride());
        eq.setSection(parseSection(req.getSection(), ExamSection.GENERAL));
        eq.setMandatory(req.getMandatory() != null ? req.getMandatory() : false);

        return ExamQuestionResponse.from(examQuestionRepository.save(eq));
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    public List<ExamQuestionResponse> getByExam(Long examId, String createdBy) {
        findOwnedExam(examId, createdBy);
        return examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(examId).stream()
                .map(ExamQuestionResponse::from)
                .collect(Collectors.toList());
    }

    public List<ExamQuestionResponse> getBySection(Long examId, String section, String createdBy) {
        findOwnedExam(examId, createdBy);
        ExamSection s = parseSection(section, null);
        if (s == null) throw new IllegalArgumentException("section is required");
        return examQuestionRepository.findByExamIdAndSectionOrderByQuestionOrderAsc(examId, s).stream()
                .map(ExamQuestionResponse::from)
                .collect(Collectors.toList());
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    @Transactional
    public ExamQuestionResponse update(Long examId, Long examQuestionId,
                                       ExamQuestionRequest req, String createdBy) {
        findOwnedExam(examId, createdBy);
        ExamQuestion eq = examQuestionRepository.findById(examQuestionId)
                .filter(e -> e.getExam().getId().equals(examId))
                .orElseThrow(() -> new ResourceNotFoundException("ExamQuestion not found with id: " + examQuestionId));

        if (req.getMarksOverride() != null && req.getMarksOverride() < 1)
            throw new IllegalArgumentException("marksOverride must be at least 1");

        if (req.getMarksOverride() != null) eq.setMarksOverride(req.getMarksOverride());
        if (req.getSection() != null) eq.setSection(parseSection(req.getSection(), eq.getSection()));
        if (req.getMandatory() != null) eq.setMandatory(req.getMandatory());

        return ExamQuestionResponse.from(examQuestionRepository.save(eq));
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────

    @Transactional
    public void remove(Long examId, Long bankQuestionId, String createdBy) {
        findOwnedExam(examId, createdBy);
        if (!examQuestionRepository.existsByExamIdAndBankQuestionId(examId, bankQuestionId))
            throw new ResourceNotFoundException("Question " + bankQuestionId + " is not in exam " + examId);
        examQuestionRepository.deleteByExamIdAndBankQuestionId(examId, bankQuestionId);
    }

    @Transactional
    public void removeAll(Long examId, String createdBy) {
        findOwnedExam(examId, createdBy);
        examQuestionRepository.deleteByExamId(examId);
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private Exam findOwnedExam(Long examId, String createdBy) {
        return examRepository.findByIdAndCreatedBy(examId, createdBy)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + examId));
    }

    private ExamSection parseSection(String value, ExamSection fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return ExamSection.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid section: " + value +
                    ". Allowed: SECTION_A, SECTION_B, SECTION_C, SECTION_D, GENERAL");
        }
    }
}
