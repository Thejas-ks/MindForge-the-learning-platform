package com.thejas.backend_mini_mindforge.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkAddSummaryResponse {

    private int added;
    private int duplicates;
    private long totalQuestions;
}
