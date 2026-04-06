package com.thejas.backend_mini_mindforge.dto.response;

public class SubmitAnswerResponse {

    private boolean correct;
    private String correctAnswer;
    private String explanation;
    private String steps;

    public SubmitAnswerResponse(boolean correct, String correctAnswer, String explanation, String steps) {
        this.correct = correct;
        this.correctAnswer = correctAnswer;
        this.explanation = explanation;
        this.steps = steps;
    }

    public boolean isCorrect() { return correct; }
    public String getCorrectAnswer() { return correctAnswer; }
    public String getExplanation() { return explanation; }
    public String getSteps() { return steps; }
}
