package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.StudentAnswer;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class SavedAnswerView {

    private Long selectedOptionId;
    private List<Long> selectedOptionIds;
    private String textAnswer;
    private LocalDateTime lastSavedAt;

    public static SavedAnswerView from(StudentAnswer a) {
        SavedAnswerView v = new SavedAnswerView();
        v.selectedOptionId = a.getSelectedOptionId();
        v.selectedOptionIds = parseOptionIds(a.getSelectedOptionIds());
        v.textAnswer = a.getTextAnswer();
        v.lastSavedAt = a.getLastSavedAt();
        return v;
    }

    private static List<Long> parseOptionIds(String raw) {
        if (raw == null || raw.isBlank()) return Collections.emptyList();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .collect(Collectors.toList());
    }
}
