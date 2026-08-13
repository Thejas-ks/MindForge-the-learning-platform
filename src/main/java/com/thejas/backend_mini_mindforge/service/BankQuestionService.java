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

    @Transactional
    public BankQuestionResponse create(BankQuestionRequest req, String createdBy) {
        validate(req);
        BankQuestion question = new BankQuestion();
        mapRequestToEntity(req, question);
        question.setCreatedBy(createdBy);
        setOptions(question, req.getOptions());
        return BankQuestionResponse.from(questionRepository.save(question));
    }

    public List<BankQuestionResponse> getAll(String createdBy) {
        return questionRepository.findByCreatedBy(createdBy).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    public List<BankQuestionResponse> getByDifficulty(String createdBy, String difficulty) {
        Difficulty d = parseDifficulty(difficulty);
        return questionRepository.findByCreatedByAndDifficulty(createdBy, d).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    public List<BankQuestionResponse> getByTopic(String createdBy, String topic) {
        return questionRepository.findByCreatedByAndTopic(createdBy, topic).stream()
                .map(BankQuestionResponse::from)
                .collect(Collectors.toList());
    }

    public BankQuestionResponse getById(Long id, String createdBy) {
        return BankQuestionResponse.from(findOwned(id, createdBy));
    }

    @Transactional
    public BankQuestionResponse update(Long id, BankQuestionRequest req, String createdBy) {
        validate(req);
        BankQuestion question = findOwned(id, createdBy);
        mapRequestToEntity(req, question);
        question.getOptions().clear();
        setOptions(question, req.getOptions());
        return BankQuestionResponse.from(questionRepository.save(question));
    }

    @Transactional
    public void delete(Long id, String createdBy) {
        findOwned(id, createdBy);
        questionRepository.deleteByIdAndCreatedBy(id, createdBy);
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private BankQuestion findOwned(Long id, String createdBy) {
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

    private void setOptions(BankQuestion question, List<QuestionOptionRequest> optionRequests) {
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

    private BankQuestionType parseQuestionType(String value) {
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
