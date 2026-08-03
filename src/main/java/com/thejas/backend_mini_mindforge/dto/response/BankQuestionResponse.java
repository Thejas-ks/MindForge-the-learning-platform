package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.BankQuestion;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class BankQuestionResponse {

    private Long id;
    private String title;
    private String questionText;
    private String questionType;
    private String difficulty;
    private String topic;
    private Integer marks;
    private Integer estimatedTimeSeconds;
    private String bloomLevel;
    private String explanation;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<QuestionOptionResponse> options;

    public static BankQuestionResponse from(BankQuestion q) {
        BankQuestionResponse res = new BankQuestionResponse();
        res.setId(q.getId());
        res.setTitle(q.getTitle());
        res.setQuestionText(q.getQuestionText());
        res.setQuestionType(q.getQuestionType().name());
        res.setDifficulty(q.getDifficulty().name());
        res.setTopic(q.getTopic());
        res.setMarks(q.getMarks());
        res.setEstimatedTimeSeconds(q.getEstimatedTimeSeconds());
        res.setBloomLevel(q.getBloomLevel() != null ? q.getBloomLevel().name() : null);
        res.setExplanation(q.getExplanation());
        res.setCreatedBy(q.getCreatedBy());
        res.setCreatedAt(q.getCreatedAt());
        res.setUpdatedAt(q.getUpdatedAt());
        res.setOptions(q.getOptions().stream()
                .map(QuestionOptionResponse::from)
                .collect(Collectors.toList()));
        return res;
    }
}
