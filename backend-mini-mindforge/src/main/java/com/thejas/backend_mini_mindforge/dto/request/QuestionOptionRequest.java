package com.thejas.backend_mini_mindforge.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class QuestionOptionRequest {

    private String optionText;
    private Boolean correct;
    private Integer displayOrder;
}
