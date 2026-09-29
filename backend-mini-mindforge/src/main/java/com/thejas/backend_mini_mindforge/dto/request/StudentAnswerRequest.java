package com.thejas.backend_mini_mindforge.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class StudentAnswerRequest {

    // MCQ_SINGLE, TRUE_FALSE
    private Long selectedOptionId;

    // MCQ_MULTIPLE
    private List<Long> selectedOptionIds;

    // SHORT_ANSWER, LONG_ANSWER, FILL_BLANK
    private String textAnswer;
}
