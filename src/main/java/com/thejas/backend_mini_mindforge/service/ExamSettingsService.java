package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.ExamSettingsRequest;
import com.thejas.backend_mini_mindforge.dto.response.ExamSettingsResponse;
import com.thejas.backend_mini_mindforge.entity.ExamSettings;
import com.thejas.backend_mini_mindforge.entity.SecurityLevel;
import com.thejas.backend_mini_mindforge.repository.ExamSettingsRepository;
import com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExamSettingsService {

    private final ExamSettingsRepository settingsRepository;

    public ExamSettingsService(ExamSettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
    }

    public ExamSettingsResponse get(Long examId, String createdBy) {
        return ExamSettingsResponse.from(findOwned(examId, createdBy));
    }

    @Transactional
    public ExamSettingsResponse update(Long examId, ExamSettingsRequest req, String createdBy) {
        ExamSettings s = findOwned(examId, createdBy);

        if (req.getShuffleQuestions() != null)           s.setShuffleQuestions(req.getShuffleQuestions());
        if (req.getShuffleOptions() != null)             s.setShuffleOptions(req.getShuffleOptions());
        if (req.getAllowReviewAfterSubmission() != null)  s.setAllowReviewAfterSubmission(req.getAllowReviewAfterSubmission());
        if (req.getAllowQuestionNavigation() != null)     s.setAllowQuestionNavigation(req.getAllowQuestionNavigation());
        if (req.getShowResultImmediately() != null)       s.setShowResultImmediately(req.getShowResultImmediately());
        if (req.getNegativeMarkingEnabled() != null)      s.setNegativeMarkingEnabled(req.getNegativeMarkingEnabled());
        if (req.getNegativeMarksPerWrongAnswer() != null) {
            if (req.getNegativeMarksPerWrongAnswer() < 0)
                throw new IllegalArgumentException("negativeMarksPerWrongAnswer must be >= 0");
            s.setNegativeMarksPerWrongAnswer(req.getNegativeMarksPerWrongAnswer());
        }
        if (req.getFullscreenRequired() != null)          s.setFullscreenRequired(req.getFullscreenRequired());
        if (req.getAllowCalculator() != null)              s.setAllowCalculator(req.getAllowCalculator());
        if (req.getAutoSubmitOnTimeout() != null)         s.setAutoSubmitOnTimeout(req.getAutoSubmitOnTimeout());
        if (req.getAllowTabSwitch() != null)               s.setAllowTabSwitch(req.getAllowTabSwitch());
        if (req.getMaxTabSwitchViolations() != null) {
            if (req.getMaxTabSwitchViolations() < 0)
                throw new IllegalArgumentException("maxTabSwitchViolations must be >= 0");
            s.setMaxTabSwitchViolations(req.getMaxTabSwitchViolations());
        }
        if (req.getAllowCopyPaste() != null)               s.setAllowCopyPaste(req.getAllowCopyPaste());
        if (req.getSecurityLevel() != null)               s.setSecurityLevel(parseSecurityLevel(req.getSecurityLevel()));

        return ExamSettingsResponse.from(settingsRepository.save(s));
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private ExamSettings findOwned(Long examId, String createdBy) {
        return settingsRepository.findByExamIdAndExamCreatedBy(examId, createdBy)
                .orElseThrow(() -> new ResourceNotFoundException("Exam settings not found for exam id: " + examId));
    }

    private SecurityLevel parseSecurityLevel(String value) {
        try {
            return SecurityLevel.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid security level: " + value + ". Allowed: LOW, MEDIUM, HIGH, STRICT");
        }
    }
}
