package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.ExamQuestion;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ExamQuestionResponse {

    private Long id;
    private Long examId;
    private Long bankQuestionId;
    private String bankQuestionTitle;
    private String questionType;
    private String difficulty;
    private String topic;
    private Integer questionOrder;
    private Integer marksOverride;
    private Integer effectiveMarks;   // marksOverride if set, otherwise bankQuestion.marks
    private String section;
    private Boolean mandatory;

    public static ExamQuestionResponse from(ExamQuestion eq) {
        ExamQuestionResponse res = new ExamQuestionResponse();
        res.setId(eq.getId());
        res.setExamId(eq.getExam().getId());
        res.setBankQuestionId(eq.getBankQuestion().getId());
        res.setBankQuestionTitle(eq.getBankQuestion().getTitle());
        res.setQuestionType(eq.getBankQuestion().getQuestionType().name());
        res.setDifficulty(eq.getBankQuestion().getDifficulty().name());
        res.setTopic(eq.getBankQuestion().getTopic());
        res.setQuestionOrder(eq.getQuestionOrder());
        res.setMarksOverride(eq.getMarksOverride());
        res.setEffectiveMarks(eq.getMarksOverride() != null
                ? eq.getMarksOverride()
                : eq.getBankQuestion().getMarks());
        res.setSection(eq.getSection().name());
        res.setMandatory(eq.getMandatory());
        return res;
    }
}
