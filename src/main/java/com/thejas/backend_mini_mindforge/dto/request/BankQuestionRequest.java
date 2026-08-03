package com.thejas.backend_mini_mindforge.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class BankQuestionRequest {

    private String title;
    private String questionText;
    private String questionType;
    private String difficulty;
    private String topic;
    private Integer marks;
    private Integer estimatedTimeSeconds;
    private String bloomLevel;
    private String explanation;
    private List<QuestionOptionRequest> options;
}
