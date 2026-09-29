package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.ExamSettings;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ExamSettingsResponse {

    private Long id;
    private Long examId;
    private boolean shuffleQuestions;
    private boolean shuffleOptions;
    private boolean allowReviewAfterSubmission;
    private boolean allowQuestionNavigation;
    private boolean showResultImmediately;
    private boolean negativeMarkingEnabled;
    private double negativeMarksPerWrongAnswer;
    private boolean fullscreenRequired;
    private boolean allowCalculator;
    private boolean autoSubmitOnTimeout;
    private boolean allowTabSwitch;
    private int maxTabSwitchViolations;
    private boolean allowCopyPaste;
    private String securityLevel;

    public static ExamSettingsResponse from(ExamSettings s) {
        ExamSettingsResponse r = new ExamSettingsResponse();
        r.id = s.getId();
        r.examId = s.getExam().getId();
        r.shuffleQuestions = s.isShuffleQuestions();
        r.shuffleOptions = s.isShuffleOptions();
        r.allowReviewAfterSubmission = s.isAllowReviewAfterSubmission();
        r.allowQuestionNavigation = s.isAllowQuestionNavigation();
        r.showResultImmediately = s.isShowResultImmediately();
        r.negativeMarkingEnabled = s.isNegativeMarkingEnabled();
        r.negativeMarksPerWrongAnswer = s.getNegativeMarksPerWrongAnswer();
        r.fullscreenRequired = s.isFullscreenRequired();
        r.allowCalculator = s.isAllowCalculator();
        r.autoSubmitOnTimeout = s.isAutoSubmitOnTimeout();
        r.allowTabSwitch = s.isAllowTabSwitch();
        r.maxTabSwitchViolations = s.getMaxTabSwitchViolations();
        r.allowCopyPaste = s.isAllowCopyPaste();
        r.securityLevel = s.getSecurityLevel().name();
        return r;
    }
}
