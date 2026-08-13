package com.thejas.backend_mini_mindforge.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ExamSettingsRequest {

    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean allowReviewAfterSubmission;
    private Boolean allowQuestionNavigation;
    private Boolean showResultImmediately;
    private Boolean negativeMarkingEnabled;
    private Double negativeMarksPerWrongAnswer;
    private Boolean fullscreenRequired;
    private Boolean allowCalculator;
    private Boolean autoSubmitOnTimeout;
    private Boolean allowTabSwitch;
    private Integer maxTabSwitchViolations;
    private Boolean allowCopyPaste;
    private String securityLevel;
}
