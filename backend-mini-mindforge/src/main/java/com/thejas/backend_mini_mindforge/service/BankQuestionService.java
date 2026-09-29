package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.BankQuestionRequest;
import com.thejas.backend_mini_mindforge.dto.request.QuestionOptionRequest;
import com.thejas.backend_mini_mindforge.dto.response.BankQuestionResponse;
import com.thejas.backend_mini_mindforge.entity.*;
import com.thejas.backend_mini_mindforge.repository.BankQuestionRepository;
import com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BankQuestionService {

    private final BankQuestionRepository questionRepository;

    public BankQuestionService(BankQuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    // ─── CREATE (finalized) ───────────────────────────────────────────────────

    @Transactional
    public BankQuestionResponse create(BankQuestionRequest req, String createdBy) {
        validate(req);
        BankQuestion question = new BankQuestion();
        mapRequestToEntity(req, question);
        question.setCreatedBy(createdBy);
        question.setIsDraft(false);
        setOptions(question, req.getOptions());
        return BankQuestionResponse.from(questionRepository.save(question));
    }

    // ─── CREATE DRAFT ─────────────────────────────────────────────────────────

    /**
     * Creates a draft question scoped to a specific exam.
     * Drafts are NOT returned by getAll/getByDifficulty/getByTopic
     * and CANNOT be assigned to exams until finalized.
     */
    @Transactional
    public BankQuestionResponse createDraft(BankQuestionRequest req, String createdBy, Long examDraftId) {
        if (req.getTitle() == null || req.getTitle().isBlank())
            throw new IllegalArgumentException("Question title is required");
        BankQuestion question = new BankQuestion();
        question.setTitle(req.getTitle().trim());
        question.setQuestionText(req.getQuestionText() != null ? req.getQuestionText().trim() : "");
        question.setQuestionType(req.getQuestionType() != null
                ? parseQuestionType(req.getQuestionType()) : BankQuestionType.MCQ_SINGLE);
        question.setDifficulty(req.getDifficulty() != null
                ? parseDifficulty(req.getDifficulty()) : Difficulty.EASY);
        question.setTopic(req.getTopic());
        question.setMarks(req.getMarks() != null && req.getMarks() >= 1 ? req.getMarks() : 1);
        question.setEstimatedTimeSeconds(req.getEstimatedTimeSeconds());
        question.setExplanation(req.getExplanation());
        question.setCreatedBy(createdBy);
        question.setIsDraft(true);
        question.setExamDraftId(examDraftId);
        if (req.getOptions() != null && !req.getOptions().isEmpty()) {
            setOptions(question, req.getOptions());
        }
        return BankQuestionResponse.from(questionRepository.save(question));
    }

    // ─── UPDATE DRAFT ─────────────────────────────────────────────────────────

    /**
     * Updates an existing draft question without requiring full validation (allows partial saves).
     */
    @Transactional
    public BankQuestionResponse updateDraft(Long id, BankQuestionRequest req, String createdBy, Long examDraftId) {
        BankQuestion question = findOwned(id, createdBy);
        if (!Boolean.TRUE.equals(question.getIsDraft()))
            throw new IllegalArgumentException("Question " + id + " is not a draft");
        if (req.getTitle() == null || req.getTitle().isBlank())
            throw new IllegalArgumentException("Question title is required");
        question.setTitle(req.getTitle().trim());
        question.setQuestionText(req.getQuestionText() != null ? req.getQuestionText().trim() : "");
        question.setQuestionType(req.getQuestionType() != null
                ? parseQuestionType(req.getQuestionType()) : BankQuestionType.MCQ_SINGLE);
        question.setDifficulty(req.getDifficulty() != null
                ? parseDifficulty(req.getDifficulty()) : Difficulty.EASY);
        question.setTopic(req.getTopic());
        question.setMarks(req.getMarks() != null && req.getMarks() >= 1 ? req.getMarks() : 1);
        question.setEstimatedTimeSeconds(req.getEstimatedTimeSeconds());
        question.setExplanation(req.getExplanation());
        question.setExamDraftId(examDraftId);
        question.getOptions().clear();
        if (req.getOptions() != null && !req.getOptions().isEmpty()) {
            setOptions(question, req.getOptions());
        }
        return BankQuestionResponse.from(questionRepository.save(question));
    }

    // ─── FINALIZE DRAFT ───────────────────────────────────────────────────────

    /**
     * Validates fully and promotes a draft to a finalized question.
     * After this call the question is visible in Question Bank and assignable to exams.
     * examDraftId is cleared on finalization.
     */
    @Transactional
    public BankQuestionResponse finalizeDraft(Long id, BankQuestionRequest req, String createdBy) {
        BankQuestion question = findOwned(id, createdBy);
        if (!Boolean.TRUE.equals(question.getIsDraft()))
            throw new IllegalArgumentException("Question " + id + " is not a draft");
        validate(req);
        validateOptions(req);
        mapRequestToEntity(req, question);
        question.getOptions().clear();
        setOptions(question, req.getOptions());
        question.setIsDraft(false);
        question.setExamDraftId(null); // clear exam context on finalization
        return BankQuestionResponse.from(questionRepository.save(question));
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    /** Returns only finalized (non-draft) questions. */
    public List<BankQuestionResponse> getAll(String createdBy) {
        return questionRepository.findByCreatedByAndIsDraftFalse(createdBy).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    public List<BankQuestionResponse> getByDifficulty(String createdBy, String difficulty) {
        Difficulty d = parseDifficulty(difficulty);
        return questionRepository.findByCreatedByAndDifficultyAndIsDraftFalse(createdBy, d).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    public List<BankQuestionResponse> getByTopic(String createdBy, String topic) {
        return questionRepository.findByCreatedByAndTopicAndIsDraftFalse(createdBy, topic).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    /** Search finalized questions by keyword (title or text), optionally filtered by difficulty. */
    public List<BankQuestionResponse> search(String createdBy, String keyword, String difficulty) {
        String kw = keyword == null ? "" : keyword.trim();
        if (difficulty != null && !difficulty.isBlank()) {
            Difficulty d = parseDifficulty(difficulty);
            return questionRepository.searchFinalizedByDifficulty(createdBy, d, kw).stream()
                    .map(BankQuestionResponse::from)
                    .collect(Collectors.toList());
        }
        return questionRepository.searchFinalized(createdBy, kw).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    /** Returns all draft questions for the teacher scoped to a specific exam. */
    public List<BankQuestionResponse> getDraftsByExam(String createdBy, Long examId) {
        return questionRepository.findByCreatedByAndIsDraftTrueAndExamDraftId(createdBy, examId).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    /** Returns all draft questions for the teacher across all exams. */
    public List<BankQuestionResponse> getDrafts(String createdBy) {
        return questionRepository.findByCreatedByAndIsDraftTrue(createdBy).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    public BankQuestionResponse getById(Long id, String createdBy) {
        return BankQuestionResponse.from(findOwned(id, createdBy));
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    @Transactional
    public BankQuestionResponse update(Long id, BankQuestionRequest req, String createdBy) {
        validate(req);
        BankQuestion question = findOwned(id, createdBy);
        mapRequestToEntity(req, question);
        question.getOptions().clear();
        setOptions(question, req.getOptions());
        return BankQuestionResponse.from(questionRepository.save(question));
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long id, String createdBy) {
        findOwned(id, createdBy);
        questionRepository.deleteByIdAndCreatedBy(id, createdBy);
    }

    // ─── PACKAGE-PRIVATE HELPERS (used by ExamQuestionService) ───────────────

    /**
     * Creates a BankQuestion entity (not yet persisted) from a request.
     * Used by ExamQuestionService for atomic bulk-create-and-assign.
     */
    BankQuestion buildEntity(BankQuestionRequest req, String createdBy, boolean draft) {
        if (!draft) validate(req);
        BankQuestion q = new BankQuestion();
        if (draft) {
            q.setTitle(req.getTitle() != null ? req.getTitle().trim() : "");
            q.setQuestionText(req.getQuestionText() != null ? req.getQuestionText().trim() : "");
            q.setQuestionType(req.getQuestionType() != null
                    ? parseQuestionType(req.getQuestionType()) : BankQuestionType.MCQ_SINGLE);
            q.setDifficulty(req.getDifficulty() != null
                    ? parseDifficulty(req.getDifficulty()) : Difficulty.EASY);
            q.setMarks(req.getMarks() != null && req.getMarks() >= 1 ? req.getMarks() : 1);
        } else {
            mapRequestToEntity(req, q);
        }
        q.setTopic(req.getTopic());
        q.setEstimatedTimeSeconds(req.getEstimatedTimeSeconds());
        q.setExplanation(req.getExplanation());
        q.setCreatedBy(createdBy);
        q.setIsDraft(draft);
        if (req.getOptions() != null && !req.getOptions().isEmpty()) {
            setOptions(q, req.getOptions());
        }
        return q;
    }

    void validateFull(BankQuestionRequest req) {
        validate(req);
        validateOptions(req);
    }

    private void validateOptions(BankQuestionRequest req) {
        BankQuestionType type;
        try {
            type = BankQuestionType.valueOf(req.getQuestionType().toUpperCase());
        } catch (Exception e) {
            return; // type already validated by validate()
        }

        List<QuestionOptionRequest> opts = req.getOptions();

        if (type == BankQuestionType.TRUE_FALSE) {
            if (opts == null || opts.isEmpty()) {
                List<QuestionOptionRequest> tfOpts = new ArrayList<>();
                QuestionOptionRequest o1 = new QuestionOptionRequest();
                o1.setOptionText("True");
                o1.setCorrect(true);
                o1.setDisplayOrder(0);
                QuestionOptionRequest o2 = new QuestionOptionRequest();
                o2.setOptionText("False");
                o2.setCorrect(false);
                o2.setDisplayOrder(1);
                tfOpts.add(o1);
                tfOpts.add(o2);
                req.setOptions(tfOpts);
                return;
            }
            if (opts.size() != 2)
                throw new IllegalArgumentException("Exactly 2 options are required for TRUE_FALSE");
            if (opts.stream().anyMatch(o -> o.getOptionText() == null || o.getOptionText().isBlank()))
                throw new IllegalArgumentException("All option texts must be filled");
            long correctCount = opts.stream().filter(o -> Boolean.TRUE.equals(o.getCorrect())).count();
            if (correctCount != 1)
                throw new IllegalArgumentException("Exactly one correct option is required for TRUE_FALSE");
            return;
        }

        if (opts == null || opts.size() < 2)
            throw new IllegalArgumentException("At least 2 options are required");
        if (opts.stream().anyMatch(o -> o.getOptionText() == null || o.getOptionText().isBlank()))
            throw new IllegalArgumentException("All option texts must be filled");

        long correctCount = opts.stream().filter(o -> Boolean.TRUE.equals(o.getCorrect())).count();
        if (type == BankQuestionType.MCQ_SINGLE && correctCount != 1)
            throw new IllegalArgumentException("Exactly one correct option is required for MCQ_SINGLE");
        if (type == BankQuestionType.MCQ_MULTIPLE && correctCount < 1)
            throw new IllegalArgumentException("At least one correct option is required for MCQ_MULTIPLE");
    }

    // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────

    BankQuestion findOwned(Long id, String createdBy) {
        return questionRepository.findByIdAndCreatedBy(id, createdBy)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found with id: " + id));
    }

    private void mapRequestToEntity(BankQuestionRequest req, BankQuestion question) {
        question.setTitle(req.getTitle().trim());
        question.setQuestionText(req.getQuestionText().trim());
        question.setQuestionType(parseQuestionType(req.getQuestionType()));
        question.setDifficulty(parseDifficulty(req.getDifficulty()));
        question.setTopic(req.getTopic());
        question.setMarks(req.getMarks());
        question.setEstimatedTimeSeconds(req.getEstimatedTimeSeconds());
        question.setBloomLevel(req.getBloomLevel() != null ? parseBloomLevel(req.getBloomLevel()) : null);
        question.setExplanation(req.getExplanation());
    }

    void setOptions(BankQuestion question, List<QuestionOptionRequest> optionRequests) {
        if (optionRequests == null || optionRequests.isEmpty()) return;
        List<QuestionOption> options = new ArrayList<>();
        for (int i = 0; i < optionRequests.size(); i++) {
            QuestionOptionRequest or = optionRequests.get(i);
            if (or.getOptionText() == null || or.getOptionText().isBlank())
                throw new IllegalArgumentException("Option text must not be blank at index " + i);
            QuestionOption opt = new QuestionOption();
            opt.setQuestion(question);
            opt.setOptionText(or.getOptionText().trim());
            opt.setCorrect(or.getCorrect() != null ? or.getCorrect() : false);
            opt.setDisplayOrder(or.getDisplayOrder() != null ? or.getDisplayOrder() : i);
            options.add(opt);
        }
        question.getOptions().addAll(options);
    }

    private void validate(BankQuestionRequest req) {
        if (req.getTitle() == null || req.getTitle().isBlank())
            throw new IllegalArgumentException("Question title is required");
        if (req.getTitle().trim().length() > 255)
            throw new IllegalArgumentException("Question title must not exceed 255 characters");
        if (req.getQuestionText() == null || req.getQuestionText().isBlank())
            throw new IllegalArgumentException("Question text is required");
        if (req.getQuestionType() == null || req.getQuestionType().isBlank())
            throw new IllegalArgumentException("Question type is required");
        if (req.getDifficulty() == null || req.getDifficulty().isBlank())
            throw new IllegalArgumentException("Difficulty is required");
        if (req.getMarks() == null || req.getMarks() < 1)
            throw new IllegalArgumentException("Marks must be at least 1");
    }

    BankQuestionType parseQuestionType(String value) {
        try {
            return BankQuestionType.valueOf(value.toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid question type: " + value +
                    ". Allowed: MCQ_SINGLE, MCQ_MULTIPLE, TRUE_FALSE, SHORT_ANSWER");
        }
    }

    private Difficulty parseDifficulty(String value) {
        try {
            return Difficulty.valueOf(value.toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid difficulty: " + value +
                    ". Allowed: EASY, MEDIUM, HARD");
        }
    }

    private BloomLevel parseBloomLevel(String value) {
        try {
            return BloomLevel.valueOf(value.toUpperCase());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid bloom level: " + value +
                    ". Allowed: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE");
        }
    }
}
