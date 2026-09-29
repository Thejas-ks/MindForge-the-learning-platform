package com.thejas.backend_mini_mindforge.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ExamQuestionRequest {

    private Long bankQuestionId;
    private Integer marksOverride;   // nullable — falls back to bankQuestion.marks
    private String section;
    private Boolean mandatory;
}
