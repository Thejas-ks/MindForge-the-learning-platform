package com.thejas.backend_mini_mindforge.dto.response;

import java.time.LocalDate;

public class StreakResponse {

    private int streak;
    private LocalDate lastActiveDate;

    public StreakResponse(int streak, LocalDate lastActiveDate) {
        this.streak = streak;
        this.lastActiveDate = lastActiveDate;
    }

    public int getStreak() { return streak; }
    public LocalDate getLastActiveDate() { return lastActiveDate; }
}
