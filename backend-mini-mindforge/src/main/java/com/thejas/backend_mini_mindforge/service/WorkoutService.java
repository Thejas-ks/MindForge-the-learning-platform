package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.SubmitAnswerRequest;
import com.thejas.backend_mini_mindforge.dto.response.SubmitAnswerResponse;
import com.thejas.backend_mini_mindforge.dto.response.StreakResponse;
import com.thejas.backend_mini_mindforge.entity.*;
import com.thejas.backend_mini_mindforge.repository.BrainQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.UserStreakRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class WorkoutService {

    private final BrainQuestionRepository brainQuestionRepository;
    private final UserStreakRepository userStreakRepository;

    public WorkoutService(BrainQuestionRepository brainQuestionRepository,
                          UserStreakRepository userStreakRepository) {
        this.brainQuestionRepository = brainQuestionRepository;
        this.userStreakRepository = userStreakRepository;
    }

    // Returns 1 question per type (LOGIC, APTITUDE, CODING) — same for all users on same day
    public List<BrainQuestion> getTodayQuestions() {
        int dayOfYear = LocalDate.now().getDayOfYear();

        List<BrainQuestion> result = new ArrayList<>();

        BrainQuestion logic = pickForDay(brainQuestionRepository.findByType(QuestionType.LOGIC), dayOfYear);
        BrainQuestion aptitude = pickForDay(brainQuestionRepository.findByType(QuestionType.APTITUDE), dayOfYear);
        BrainQuestion coding = pickForDay(brainQuestionRepository.findByType(QuestionType.CODING), dayOfYear);

        if (logic != null) result.add(logic);
        if (aptitude != null) result.add(aptitude);
        if (coding != null) result.add(coding);

        return result;
    }

    // Returns questions filtered by type and difficulty
    public List<BrainQuestion> getPracticeQuestions(String type, String difficulty) {
        QuestionType qType = QuestionType.valueOf(type.toUpperCase());
        Difficulty diff = Difficulty.valueOf(difficulty.toUpperCase());
        return brainQuestionRepository.findByTypeAndDifficulty(qType, diff);
    }

    // Submit answer, update streak, return result
    @Transactional
    public SubmitAnswerResponse submitAnswer(SubmitAnswerRequest request, String email) {
        BrainQuestion question = brainQuestionRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new RuntimeException("Question not found: " + request.getQuestionId()));

        boolean isCorrect = question.getCorrectAnswer()
                .equalsIgnoreCase(request.getUserAnswer().trim());

        updateStreak(email);

        return new SubmitAnswerResponse(
                isCorrect,
                question.getCorrectAnswer(),
                question.getExplanation(),
                question.getSteps()
        );
    }

    // Get current streak for user
    public StreakResponse getStreak(String email) {
        return userStreakRepository.findByEmail(email)
                .map(s -> new StreakResponse(s.getStreak(), s.getLastActiveDate()))
                .orElse(new StreakResponse(0, null));
    }

    // Increment streak if first activity today, reset if missed a day
    private void updateStreak(String email) {
        LocalDate today = LocalDate.now();

        UserStreak userStreak = userStreakRepository.findByEmail(email)
                .orElseGet(() -> {
                    UserStreak s = new UserStreak();
                    s.setEmail(email);
                    s.setStreak(0);
                    return s;
                });

        LocalDate last = userStreak.getLastActiveDate();

        if (last == null) {
            // First time ever
            userStreak.setStreak(1);
        } else if (last.equals(today)) {
            // Already active today — no change
            return;
        } else if (last.equals(today.minusDays(1))) {
            // Consecutive day — increment
            userStreak.setStreak(userStreak.getStreak() + 1);
        } else {
            // Missed one or more days — reset
            userStreak.setStreak(1);
        }

        userStreak.setLastActiveDate(today);
        userStreakRepository.save(userStreak);
    }

    // Pick a question deterministically based on day of year
    private BrainQuestion pickForDay(List<BrainQuestion> questions, int dayOfYear) {
        if (questions == null || questions.isEmpty()) return null;
        return questions.get(dayOfYear % questions.size());
    }
}
