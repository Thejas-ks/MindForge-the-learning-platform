package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.BankQuestion;
import com.thejas.backend_mini_mindforge.entity.ExamQuestion;
import com.thejas.backend_mini_mindforge.entity.QuestionOption;
import com.thejas.backend_mini_mindforge.entity.StudentAnswer;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class TeacherAnswerReviewResponse {

    // Question context
    private Long bankQuestionId;
    private Integer questionOrder;
    private String questionType;
    private String questionText;
    private Integer effectiveMarks;
    private List<OptionView> options;   // includes correct flag — teacher only

    // Student answer
    private Long selectedOptionId;
    private List<Long> selectedOptionIds;
    private String textAnswer;
    private boolean answered;

    // Evaluation result
    private Double marksAwarded;
    private Boolean isCorrect;

    @Data
    @NoArgsConstructor
    public static class OptionView {
        private Long id;
        private String optionText;
        private Integer displayOrder;
        private Boolean correct;

        public static OptionView from(QuestionOption o) {
            OptionView v = new OptionView();
            v.id = o.getId();
            v.optionText = o.getOptionText();
            v.displayOrder = o.getDisplayOrder();
            v.correct = o.getCorrect();
            return v;
        }
    }

    /**
     * Build from an ExamQuestion (for question context) and an optional StudentAnswer.
     * Pass null for answer when the student did not answer this question.
     */
    public static TeacherAnswerReviewResponse from(ExamQuestion eq, StudentAnswer answer) {
        BankQuestion bq = eq.getBankQuestion();

        TeacherAnswerReviewResponse r = new TeacherAnswerReviewResponse();
        r.bankQuestionId = bq.getId();
        r.questionOrder = eq.getQuestionOrder();
        r.questionType = bq.getQuestionType().name();
        r.questionText = bq.getQuestionText();
        r.effectiveMarks = eq.getMarksOverride() != null ? eq.getMarksOverride() : bq.getMarks();
        r.options = bq.getOptions().stream()
                .map(OptionView::from)
                .collect(Collectors.toList());

        if (answer != null) {
            r.answered = true;
            r.selectedOptionId = answer.getSelectedOptionId();
            r.selectedOptionIds = parseOptionIds(answer.getSelectedOptionIds());
            r.textAnswer = answer.getTextAnswer();
            r.marksAwarded = answer.getMarksAwarded();
            r.isCorrect = answer.getIsCorrect();
        } else {
            r.answered = false;
            r.selectedOptionIds = Collections.emptyList();
        }

        return r;
    }

    private static List<Long> parseOptionIds(String raw) {
        if (raw == null || raw.isBlank()) return Collections.emptyList();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }
}
