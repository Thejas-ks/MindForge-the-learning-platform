package com.thejas.backend_mini_mindforge.dto.response;

public class SubmitAnswerResponse {

    private boolean correct;
    private String correctAnswer;
    private String explanation;
    private String steps;
    private boolean workoutCompleted;

    public SubmitAnswerResponse(boolean correct, String correctAnswer,
                                String explanation, String steps, boolean workoutCompleted) {
        this.correct = correct;
        this.correctAnswer = correctAnswer;
        this.explanation = explanation;
        this.steps = steps;
        this.workoutCompleted = workoutCompleted;
    }

    public boolean isCorrect() { return correct; }
    public String getCorrectAnswer() { return correctAnswer; }
    public String getExplanation() { return explanation; }
    public String getSteps() { return steps; }
    public boolean isWorkoutCompleted() { return workoutCompleted; }
}
