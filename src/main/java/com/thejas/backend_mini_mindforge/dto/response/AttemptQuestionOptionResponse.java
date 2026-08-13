package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.QuestionOption;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AttemptQuestionOptionResponse {

    private Long id;
    private String optionText;
    private Integer displayOrder;

    public static AttemptQuestionOptionResponse from(QuestionOption o) {
        AttemptQuestionOptionResponse r = new AttemptQuestionOptionResponse();
        r.id = o.getId();
        r.optionText = o.getOptionText();
        r.displayOrder = o.getDisplayOrder();
        return r;
    }
}
