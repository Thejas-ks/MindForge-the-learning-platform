package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.ExamQuestion;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class AttemptQuestionResponse {

    private Long bankQuestionId;
    private Integer questionOrder;
    private String section;
    private Integer marks;
    private String title;
    private String questionText;
    private String questionType;
    private Integer estimatedTimeSeconds;
    private List<AttemptQuestionOptionResponse> options;
    private SavedAnswerView savedAnswer;

    public static AttemptQuestionResponse from(ExamQuestion eq, SavedAnswerView savedAnswer) {
        AttemptQuestionResponse r = new AttemptQuestionResponse();
        r.bankQuestionId = eq.getBankQuestion().getId();
        r.questionOrder = eq.getQuestionOrder();
        r.section = eq.getSection() != null ? eq.getSection().name() : null;
        r.marks = eq.getMarksOverride() != null ? eq.getMarksOverride() : eq.getBankQuestion().getMarks();
        r.title = eq.getBankQuestion().getTitle();
        r.questionText = eq.getBankQuestion().getQuestionText();
        r.questionType = eq.getBankQuestion().getQuestionType().name();
        r.estimatedTimeSeconds = eq.getBankQuestion().getEstimatedTimeSeconds();
        r.options = eq.getBankQuestion().getOptions().stream()
                .map(AttemptQuestionOptionResponse::from)
                .collect(Collectors.toList());
        r.savedAnswer = savedAnswer;
        return r;
    }
}
