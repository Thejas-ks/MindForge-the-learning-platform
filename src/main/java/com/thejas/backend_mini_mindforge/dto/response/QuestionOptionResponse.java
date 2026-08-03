package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.QuestionOption;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class QuestionOptionResponse {

    private Long id;
    private String optionText;
    private Boolean correct;
    private Integer displayOrder;

    public static QuestionOptionResponse from(QuestionOption option) {
        QuestionOptionResponse res = new QuestionOptionResponse();
        res.setId(option.getId());
        res.setOptionText(option.getOptionText());
        res.setCorrect(option.getCorrect());
        res.setDisplayOrder(option.getDisplayOrder());
        return res;
    }
}
