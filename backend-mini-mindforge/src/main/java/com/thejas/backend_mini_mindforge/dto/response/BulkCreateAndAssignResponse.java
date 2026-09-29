package com.thejas.backend_mini_mindforge.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkCreateAndAssignResponse {

    private int created;
    private long totalQuestions;
    private List<ExamQuestionResponse> examQuestions;
}
