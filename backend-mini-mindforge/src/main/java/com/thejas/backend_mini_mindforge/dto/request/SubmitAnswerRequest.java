package com.thejas.backend_mini_mindforge.dto.request;

public class SubmitAnswerRequest {

    private Long questionId;
    private String userAnswer;

    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public String getUserAnswer() { return userAnswer; }
    public void setUserAnswer(String userAnswer) { this.userAnswer = userAnswer; }
}
