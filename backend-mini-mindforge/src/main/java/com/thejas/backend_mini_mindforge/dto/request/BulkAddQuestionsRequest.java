package com.thejas.backend_mini_mindforge.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class BulkAddQuestionsRequest {

    private List<Long> questionIds;
    private String section;
    private Boolean mandatory;
}
