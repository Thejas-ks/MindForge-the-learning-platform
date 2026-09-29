package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.BankQuestionRequest;
import com.thejas.backend_mini_mindforge.dto.request.BulkAddQuestionsRequest;
import com.thejas.backend_mini_mindforge.dto.request.BulkCreateAndAssignRequest;
import com.thejas.backend_mini_mindforge.dto.request.ExamQuestionRequest;
import com.thejas.backend_mini_mindforge.dto.response.BankQuestionResponse;
import com.thejas.backend_mini_mindforge.dto.response.BulkAddSummaryResponse;
import com.thejas.backend_mini_mindforge.dto.response.BulkCreateAndAssignResponse;
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
    private final BankQuestionService bankQuestionService;

    public ExamQuestionService(ExamQuestionRepository examQuestionRepository,
                               ExamRepository examRepository,
                               BankQuestionRepository bankQuestionRepository,
                               BankQuestionService bankQuestionService) {
        this.examQuestionRepository = examQuestionRepository;
        this.examRepository = examRepository;
        this.bankQuestionRepository = bankQuestionRepository;
        this.bankQuestionService = bankQuestionService;
    }

    // ─── BULK ADD (existing bank questions) ───────────────────────────────────

    @Transactional
    public BulkAddSummaryResponse bulkAdd(Long examId, BulkAddQuestionsRequest req, String createdBy) {
        if (req.getQuestionIds() == null || req.getQuestionIds().isEmpty())
            throw new IllegalArgumentException("questionIds must not be empty");

        Exam exam = findOwnedExam(examId, createdBy);
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Questions cannot be modified after the exam is published.");
        }

        ExamSection section = parseSection(req.getSection(), ExamSection.GENERAL);
        boolean mandatory = req.getMandatory() != null ? req.getMandatory() : false;

        Set<Long> existingIds = examQuestionRepository.findBankQuestionIdsByExamId(examId);
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

            if (Boolean.TRUE.equals(bankQuestion.getIsDraft()))
                throw new IllegalArgumentException("Question " + bankQuestionId + " is a draft and cannot be assigned to an exam");

            ExamQuestion eq = new ExamQuestion();
            eq.setExam(exam);
            eq.setBankQuestion(bankQuestion);
            eq.setQuestionOrder(nextOrder++);
            eq.setSection(section);
            eq.setMandatory(mandatory);
            eq.setMarksOverride(null);
            toSave.add(eq);
            existingIds.add(bankQuestionId);
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
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Questions cannot be modified after the exam is published.");
        }


        if (examQuestionRepository.existsByExamIdAndBankQuestionId(examId, req.getBankQuestionId()))
            throw new IllegalArgumentException("Question " + req.getBankQuestionId() + " is already in this exam");

        BankQuestion bankQuestion = bankQuestionRepository.findById(req.getBankQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("BankQuestion not found with id: " + req.getBankQuestionId()));

        if (Boolean.TRUE.equals(bankQuestion.getIsDraft()))
            throw new IllegalArgumentException("Question " + req.getBankQuestionId() + " is a draft and cannot be assigned to an exam");

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

    // ─── BULK CREATE AND ASSIGN (atomic, new questions only) ──────────────────

    /**
     * Atomically validates, creates finalized BankQuestion records, and assigns them.
     * Used when the teacher clicks "Save & Add to Exam" with no existing draft IDs.
     * All validation runs before any persistence — full rollback on failure.
     */
    @Transactional
    public BulkCreateAndAssignResponse bulkCreateAndAssign(Long examId,
                                                            BulkCreateAndAssignRequest req,
                                                            String createdBy) {
        if (req.getQuestions() == null || req.getQuestions().isEmpty())
            throw new IllegalArgumentException("questions must not be empty");

        Exam exam = findOwnedExam(examId, createdBy);
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Questions cannot be modified after the exam is published.");
        }


        // Phase 1: validate ALL entries before touching the database
        List<BankQuestionRequest> bankReqs = new ArrayList<>();
        for (int i = 0; i < req.getQuestions().size(); i++) {
            BankQuestionRequest bqr = entryToBankRequest(req.getQuestions().get(i));
            try {
                bankQuestionService.validateFull(bqr);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Question " + (i + 1) + ": " + e.getMessage());
            }
            bankReqs.add(bqr);
        }

        // Phase 2: persist
        int nextOrder = examQuestionRepository.findMaxQuestionOrderByExamId(examId) + 1;
        List<ExamQuestion> examQuestions = new ArrayList<>();

        for (int i = 0; i < req.getQuestions().size(); i++) {
            BulkCreateAndAssignRequest.QuestionEntry entry = req.getQuestions().get(i);
            BankQuestion bq = bankQuestionService.buildEntity(bankReqs.get(i), createdBy, false);
            BankQuestion savedBq = bankQuestionRepository.save(bq);

            ExamQuestion eq = new ExamQuestion();
            eq.setExam(exam);
            eq.setBankQuestion(savedBq);
            eq.setQuestionOrder(nextOrder++);
            eq.setSection(parseSection(entry.getSection(), ExamSection.GENERAL));
            eq.setMandatory(entry.getMandatory() != null ? entry.getMandatory() : false);
            if (entry.getMarksOverride() != null && entry.getMarksOverride() >= 1)
                eq.setMarksOverride(entry.getMarksOverride());
            examQuestions.add(eq);
        }

        List<ExamQuestion> saved = examQuestionRepository.saveAll(examQuestions);
        long total = examQuestionRepository.countByExamId(examId);

        return new BulkCreateAndAssignResponse(
                saved.size(), total,
                saved.stream().map(ExamQuestionResponse::from).collect(Collectors.toList()));
    }

    // ─── BULK SAVE AS DRAFT ───────────────────────────────────────────────────

    /**
     * Saves question entries as drafts scoped to this exam (isDraft=true, examDraftId=examId).
     * Drafts are NOT assigned to the exam.
     * Returns the created draft records so the frontend can store their IDs for later resume.
     */
    @Transactional
    public List<BankQuestionResponse> bulkSaveAsDraft(Long examId,
                                                       BulkCreateAndAssignRequest req,
                                                       String createdBy) {
        if (req.getQuestions() == null || req.getQuestions().isEmpty())
            throw new IllegalArgumentException("questions must not be empty");

        findOwnedExam(examId, createdBy);

        List<BankQuestionResponse> results = new ArrayList<>();
        for (BulkCreateAndAssignRequest.QuestionEntry entry : req.getQuestions()) {
            BankQuestionRequest bqr = entryToBankRequest(entry);
            // If entry already has a draftId, update the existing draft in-place
            if (entry.getDraftId() != null) {
                results.add(bankQuestionService.updateDraft(entry.getDraftId(), bqr, createdBy, examId));
            } else {
                results.add(bankQuestionService.createDraft(bqr, createdBy, examId));
            }
        }
        return results;
    }

    // ─── FINALIZE DRAFTS AND ASSIGN (draft resume flow) ───────────────────────

    /**
     * Finalizes existing draft questions in-place and assigns them to the exam.
     * Used when the teacher resumes a draft session and clicks "Save & Add to Exam".
     *
     * Entry with draftId: the existing BankQuestion draft is validated, promoted to
     * finalized (isDraft=false, examDraftId cleared), and assigned. No new record created.
     *
     * Entry without draftId: treated as a brand-new question (fallback path).
     *
     * Duplicate ExamQuestion assignments are silently skipped (idempotent).
     * Full rollback on any validation or persistence failure.
     */
    @Transactional
    public BulkCreateAndAssignResponse finalizeAndAssign(Long examId,
                                                          BulkCreateAndAssignRequest req,
                                                          String createdBy) {
        if (req.getQuestions() == null || req.getQuestions().isEmpty())
            throw new IllegalArgumentException("questions must not be empty");

        Exam exam = findOwnedExam(examId, createdBy);
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Questions cannot be modified after the exam is published.");
        }


        // Phase 1: validate all entries before any persistence
        List<BankQuestionRequest> bankReqs = new ArrayList<>();
        for (int i = 0; i < req.getQuestions().size(); i++) {
            BankQuestionRequest bqr = entryToBankRequest(req.getQuestions().get(i));
            try {
                bankQuestionService.validateFull(bqr);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Question " + (i + 1) + ": " + e.getMessage());
            }
            bankReqs.add(bqr);
        }

        // Phase 2: finalize or create, then assign
        Set<Long> existingIds = examQuestionRepository.findBankQuestionIdsByExamId(examId);
        int nextOrder = examQuestionRepository.findMaxQuestionOrderByExamId(examId) + 1;
        List<ExamQuestion> examQuestions = new ArrayList<>();

        for (int i = 0; i < req.getQuestions().size(); i++) {
            BulkCreateAndAssignRequest.QuestionEntry entry = req.getQuestions().get(i);
            BankQuestion bq;

            if (entry.getDraftId() != null) {
                // Finalize the existing draft in-place — no new BankQuestion record created
                BankQuestionResponse finalized =
                        bankQuestionService.finalizeDraft(entry.getDraftId(), bankReqs.get(i), createdBy);
                bq = bankQuestionService.findOwned(finalized.getId(), createdBy);
            } else {
                // No draftId — create a new finalized question
                bq = bankQuestionService.buildEntity(bankReqs.get(i), createdBy, false);
                bq = bankQuestionRepository.save(bq);
            }

            // Skip if already assigned — prevents duplicates on double-submit
            if (existingIds.contains(bq.getId())) continue;

            ExamQuestion eq = new ExamQuestion();
            eq.setExam(exam);
            eq.setBankQuestion(bq);
            eq.setQuestionOrder(nextOrder++);
            eq.setSection(parseSection(entry.getSection(), ExamSection.GENERAL));
            eq.setMandatory(entry.getMandatory() != null ? entry.getMandatory() : false);
            if (entry.getMarksOverride() != null && entry.getMarksOverride() >= 1)
                eq.setMarksOverride(entry.getMarksOverride());
            examQuestions.add(eq);
            existingIds.add(bq.getId());
        }

        List<ExamQuestion> saved = examQuestionRepository.saveAll(examQuestions);
        long total = examQuestionRepository.countByExamId(examId);

        return new BulkCreateAndAssignResponse(
                saved.size(), total,
                saved.stream().map(ExamQuestionResponse::from).collect(Collectors.toList()));
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExamQuestionResponse> getByExam(Long examId, String createdBy) {
        findOwnedExam(examId, createdBy);
        return examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(examId).stream()
                .map(ExamQuestionResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
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
        Exam exam = findOwnedExam(examId, createdBy);
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Questions cannot be modified after the exam is published.");
        }
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
        Exam exam = findOwnedExam(examId, createdBy);
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Questions cannot be modified after the exam is published.");
        }
        if (!examQuestionRepository.existsByExamIdAndBankQuestionId(examId, bankQuestionId))
            throw new ResourceNotFoundException("Question " + bankQuestionId + " is not in exam " + examId);
        examQuestionRepository.deleteByExamIdAndBankQuestionId(examId, bankQuestionId);
    }

    @Transactional
    public void removeAll(Long examId, String createdBy) {
        Exam exam = findOwnedExam(examId, createdBy);
        if (exam.getStatus() != ExamStatus.DRAFT) {
            throw new IllegalStateException("Questions cannot be modified after the exam is published.");
        }
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

    private BankQuestionRequest entryToBankRequest(BulkCreateAndAssignRequest.QuestionEntry entry) {
        BankQuestionRequest bqr = new BankQuestionRequest();
        bqr.setTitle(entry.getTitle());
        bqr.setQuestionText(entry.getQuestionText());
        bqr.setQuestionType(entry.getQuestionType());
        bqr.setDifficulty(entry.getDifficulty());
        bqr.setTopic(entry.getTopic());
        bqr.setMarks(entry.getMarks());
        bqr.setEstimatedTimeSeconds(entry.getEstimatedTimeSeconds());
        bqr.setExplanation(entry.getExplanation());
        bqr.setOptions(entry.getOptions());
        return bqr;
    }
}
