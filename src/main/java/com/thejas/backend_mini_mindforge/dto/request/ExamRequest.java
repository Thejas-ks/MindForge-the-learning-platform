package com.thejas.backend_mini_mindforge.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ExamRequest {

    private String title;
    private String description;
    private Integer durationMinutes;
    private Integer totalMarks;
    private Integer passMarks;
    private String status;
}
