package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.SubmitAnswerRequest;
import com.thejas.backend_mini_mindforge.dto.response.DailyWorkoutResponse;
import com.thejas.backend_mini_mindforge.dto.response.StreakResponse;
import com.thejas.backend_mini_mindforge.dto.response.SubmitAnswerResponse;
import com.thejas.backend_mini_mindforge.entity.*;
import com.thejas.backend_mini_mindforge.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WorkoutService {

    private final BrainQuestionRepository brainQuestionRepository;
    private final UserStreakRepository userStreakRepository;
    private final DailyWorkoutSessionRepository sessionRepository;
    private final UserPerformanceRepository performanceRepository;

    public WorkoutService(BrainQuestionRepository brainQuestionRepository,
                          UserStreakRepository userStreakRepository,
                          DailyWorkoutSessionRepository sessionRepository,
                          UserPerformanceRepository performanceRepository) {
        this.brainQuestionRepository = brainQuestionRepository;
        this.userStreakRepository = userStreakRepository;
        this.sessionRepository = sessionRepository;
        this.performanceRepository = performanceRepository;
    }

    // Always use UTC server date — never client date
    private LocalDate todayUTC() {
        return LocalDate.now(ZoneOffset.UTC);
    }

    // ─── GET TODAY'S WORKOUT ──────────────────────────────────────────────────

    @Transactional
    public DailyWorkoutResponse getTodayWorkout(String email) {
        LocalDate today = todayUTC();
        Difficulty difficulty = getUserDifficulty(email);

        // Check if session already exists for today
        DailyWorkoutSession session = sessionRepository
                .findByEmailAndSessionDate(email, today)
                .orElse(null);

        if (session != null && session.isCompleted()) {
            // Already completed today — return locked response
            List<BrainQuestion> questions = loadQuestionsFromSession(session);
            return new DailyWorkoutResponse(
                    questions, true, difficulty,
                    session.getTotalQuestions(), session.getTotalQuestions(),
                    "You've completed today's brain workout. Come back tomorrow!"
            );
        }

        if (session == null) {
            // New day — create fresh session
            session = createNewSession(email, today, difficulty);
        }

        List<BrainQuestion> questions = loadQuestionsFromSession(session);
        return new DailyWorkoutResponse(
                questions, false, difficulty,
                session.getTotalQuestions(), session.getCorrectAnswers(),
                null
        );
    }

    // ─── SUBMIT ANSWER ────────────────────────────────────────────────────────

    @Transactional
    public SubmitAnswerResponse submitAnswer(SubmitAnswerRequest request, String email) {
        LocalDate today = todayUTC();

        BrainQuestion question = brainQuestionRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new RuntimeException("Question not found: " + request.getQuestionId()));

        boolean isCorrect = question.getCorrectAnswer()
                .equalsIgnoreCase(request.getUserAnswer().trim());

        // Update session progress
        DailyWorkoutSession session = sessionRepository
                .findByEmailAndSessionDate(email, today)
                .orElse(null);

        boolean nowCompleted = false;
        if (session != null && !session.isCompleted()) {
            if (isCorrect) {
                session.setCorrectAnswers(session.getCorrectAnswers() + 1);
            }
            // Track answered count separately — increment on every submit
            session.setAnsweredCount(session.getAnsweredCount() + 1);
            // Complete when all questions have been answered (regardless of correctness)
            if (session.getAnsweredCount() >= session.getTotalQuestions()) {
                session.setCompleted(true);
                nowCompleted = true;
                updateDifficulty(email, session);
            }
            sessionRepository.save(session);
        }

        // Update performance stats
        updatePerformanceStats(email, isCorrect);

        // Update streak only on completion
        if (nowCompleted) updateStreak(email);

        return new SubmitAnswerResponse(
                isCorrect,
                question.getCorrectAnswer(),
                question.getExplanation(),
                question.getSteps(),
                nowCompleted
        );
    }

    // ─── PRACTICE ─────────────────────────────────────────────────────────────

    public List<BrainQuestion> getPracticeQuestions(String type, String difficulty) {
        QuestionType qType = QuestionType.valueOf(type.toUpperCase());
        Difficulty diff = Difficulty.valueOf(difficulty.toUpperCase());
        return brainQuestionRepository.findByTypeAndDifficulty(qType, diff);
    }

    // ─── STREAK ───────────────────────────────────────────────────────────────

    public StreakResponse getStreak(String email) {
        return userStreakRepository.findByEmail(email)
                .map(s -> new StreakResponse(s.getStreak(), s.getLastActiveDate()))
                .orElse(new StreakResponse(0, null));
    }

    // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

    private DailyWorkoutSession createNewSession(String email, LocalDate date, Difficulty difficulty) {
        // Seed from email + date so each user gets different questions each day
        int seed = (email + date.toString()).hashCode();

        List<BrainQuestion> questions = new ArrayList<>();
        BrainQuestion logic    = pickForSeed(brainQuestionRepository.findByTypeAndDifficulty(QuestionType.LOGIC,    difficulty), seed);
        BrainQuestion aptitude = pickForSeed(brainQuestionRepository.findByTypeAndDifficulty(QuestionType.APTITUDE, difficulty), seed + 1);
        BrainQuestion coding   = pickForSeed(brainQuestionRepository.findByTypeAndDifficulty(QuestionType.CODING,   difficulty), seed + 2);

        if (logic    != null) questions.add(logic);
        if (aptitude != null) questions.add(aptitude);
        if (coding   != null) questions.add(coding);

        // Fallback: if difficulty has no questions, use any available
        if (questions.isEmpty()) {
            BrainQuestion l = pickForSeed(brainQuestionRepository.findByType(QuestionType.LOGIC),    seed);
            BrainQuestion a = pickForSeed(brainQuestionRepository.findByType(QuestionType.APTITUDE), seed + 1);
            BrainQuestion c = pickForSeed(brainQuestionRepository.findByType(QuestionType.CODING),   seed + 2);
            if (l != null) questions.add(l);
            if (a != null) questions.add(a);
            if (c != null) questions.add(c);
        }

        String ids = questions.stream()
                .map(q -> String.valueOf(q.getId()))
                .collect(Collectors.joining(","));

        DailyWorkoutSession session = new DailyWorkoutSession();
        session.setEmail(email);
        session.setSessionDate(date);
        session.setQuestionIds(ids);
        session.setTotalQuestions(questions.size());
        session.setCorrectAnswers(0);
        session.setCompleted(false);

        return sessionRepository.save(session);
    }

    private List<BrainQuestion> loadQuestionsFromSession(DailyWorkoutSession session) {
        List<Long> ids = session.getQuestionIdList();
        if (ids.isEmpty()) return List.of();
        return ids.stream()
                .map(id -> brainQuestionRepository.findById(id).orElse(null))
                .filter(q -> q != null)
                .collect(Collectors.toList());
    }

    private Difficulty getUserDifficulty(String email) {
        return performanceRepository.findByEmail(email)
                .map(UserPerformance::getCurrentDifficulty)
                .orElse(Difficulty.EASY);
    }

    private void updateDifficulty(String email, DailyWorkoutSession session) {
        double accuracy = session.getTotalQuestions() == 0 ? 0
                : (session.getCorrectAnswers() * 100.0) / session.getTotalQuestions();

        Difficulty next;
        if (accuracy < 50) next = Difficulty.EASY;
        else if (accuracy <= 80) next = Difficulty.MEDIUM;
        else next = Difficulty.HARD;

        UserPerformance perf = performanceRepository.findByEmail(email)
                .orElseGet(() -> {
                    UserPerformance p = new UserPerformance();
                    p.setEmail(email);
                    return p;
                });
        perf.setCurrentDifficulty(next);
        performanceRepository.save(perf);
    }

    private void updatePerformanceStats(String email, boolean isCorrect) {
        UserPerformance perf = performanceRepository.findByEmail(email)
                .orElseGet(() -> {
                    UserPerformance p = new UserPerformance();
                    p.setEmail(email);
                    return p;
                });
        perf.setTotalAnswered(perf.getTotalAnswered() + 1);
        if (isCorrect) perf.setTotalCorrect(perf.getTotalCorrect() + 1);
        performanceRepository.save(perf);
    }

    private void updateStreak(String email) {
        LocalDate today = todayUTC();

        UserStreak userStreak = userStreakRepository.findByEmail(email)
                .orElseGet(() -> {
                    UserStreak s = new UserStreak();
                    s.setEmail(email);
                    s.setStreak(0);
                    return s;
                });

        LocalDate last = userStreak.getLastActiveDate();

        if (last == null) {
            userStreak.setStreak(1);
        } else if (last.equals(today)) {
            return;
        } else if (last.equals(today.minusDays(1))) {
            userStreak.setStreak(userStreak.getStreak() + 1);
        } else {
            userStreak.setStreak(1);
        }

        userStreak.setLastActiveDate(today);
        userStreakRepository.save(userStreak);
    }

    private BrainQuestion pickForSeed(List<BrainQuestion> questions, int seed) {
        if (questions == null || questions.isEmpty()) return null;
        int idx = Math.abs(seed) % questions.size();
        return questions.get(idx);
    }
}
