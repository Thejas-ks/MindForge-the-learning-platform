package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.entity.BrainQuestion;
import com.thejas.backend_mini_mindforge.entity.Difficulty;
import com.thejas.backend_mini_mindforge.entity.QuestionType;
import com.thejas.backend_mini_mindforge.entity.Role;
import com.thejas.backend_mini_mindforge.repository.BrainQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements ApplicationRunner {

    private final BrainQuestionRepository repo;
    private final UserRepository userRepository;

    public DataInitializer(BrainQuestionRepository repo, UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        // Fix existing users with null role
        userRepository.findAll().forEach(user -> {
            if (user.getRole() == null) {
                user.setRole(Role.USER);
                userRepository.save(user);
            }
        });

        if (repo.count() > 0) return; // already seeded

        repo.save(make(QuestionType.LOGIC, Difficulty.EASY,
                "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?",
                "Yes", "No", "Cannot be determined", "Only some", "A",
                "Since all Bloops are Razzies, and all Razzies are Lazzies, by transitivity all Bloops must be Lazzies.",
                "Step 1: Bloops to Razzies. Step 2: Razzies to Lazzies. Step 3: Therefore Bloops to Lazzies."));

        repo.save(make(QuestionType.LOGIC, Difficulty.MEDIUM,
                "A clock shows 3:15. What is the angle between the hour and minute hands?",
                "0 degrees", "7.5 degrees", "15 degrees", "22.5 degrees", "B",
                "At 3:15, minute hand is at 90 degrees. Hour hand moves 0.5 degrees per minute, at 3:15 it is at 97.5 degrees. Difference = 7.5 degrees.",
                "Step 1: Minute hand at 15 min = 90 degrees. Step 2: Hour hand = 90 + 0.5x15 = 97.5. Step 3: 97.5 - 90 = 7.5 degrees."));

        repo.save(make(QuestionType.LOGIC, Difficulty.HARD,
                "You have 12 balls, one is heavier or lighter. Using a balance scale only 3 times, can you find the odd ball?",
                "Yes always", "No impossible", "Only if heavier", "Only if lighter", "A",
                "Yes. The 3-weighing strategy can always isolate the odd ball and determine if it is heavier or lighter.",
                "Step 1: Weigh 4 vs 4. Step 2: Narrow to 4 suspects. Step 3: Weigh 2 vs 2. Step 4: Final weigh to identify."));

        repo.save(make(QuestionType.APTITUDE, Difficulty.EASY,
                "A train travels 60 km in 1 hour. How long will it take to travel 210 km?",
                "2.5 hours", "3 hours", "3.5 hours", "4 hours", "C",
                "Speed = 60 km/h. Time = Distance / Speed = 210 / 60 = 3.5 hours.",
                "Step 1: Speed = 60 km/h. Step 2: Time = Distance / Speed. Step 3: 210 / 60 = 3.5 hours."));

        repo.save(make(QuestionType.APTITUDE, Difficulty.MEDIUM,
                "If 6 workers complete a job in 12 days, how many days will 9 workers take?",
                "6 days", "8 days", "9 days", "10 days", "B",
                "Total work = 6 x 12 = 72 worker-days. With 9 workers: 72 / 9 = 8 days.",
                "Step 1: Total work = 6 x 12 = 72. Step 2: Days = 72 / 9 = 8."));

        repo.save(make(QuestionType.APTITUDE, Difficulty.HARD,
                "A sum of money doubles in 5 years at simple interest. In how many years will it become 4 times?",
                "10 years", "15 years", "20 years", "25 years", "B",
                "If money doubles in 5 years, rate = 20% per year. For 4x, SI = 3P. Time = 300/20 = 15 years.",
                "Step 1: R = 20%. Step 2: For 4x, SI = 3P. Step 3: 3P = P x 20 x T / 100, T = 15 years."));

        repo.save(make(QuestionType.CODING, Difficulty.EASY,
                "What is the time complexity of accessing an element in an array by index?",
                "O(n)", "O(log n)", "O(1)", "O(n^2)", "C",
                "Array index access is O(1) because arrays store elements in contiguous memory.",
                "Step 1: Arrays use contiguous memory. Step 2: Address = base + index x size. Step 3: Direct calculation = O(1)."));

        repo.save(make(QuestionType.CODING, Difficulty.MEDIUM,
                "What data structure is used internally by a HashMap in Java?",
                "Linked List", "Array of Linked Lists", "Binary Tree", "Stack", "B",
                "HashMap uses an array of buckets where each bucket is a linked list (or tree in Java 8+ when size > 8).",
                "Step 1: Fixed array of buckets. Step 2: Each bucket holds entries with same hash. Step 3: Collisions handled via linked list."));

        repo.save(make(QuestionType.CODING, Difficulty.HARD,
                "What is the worst-case time complexity of QuickSort?",
                "O(n log n)", "O(n)", "O(n^2)", "O(log n)", "C",
                "QuickSort worst case is O(n^2) when pivot is always the smallest or largest element.",
                "Step 1: Best/average = O(n log n). Step 2: Worst case = unbalanced partitions. Step 3: O(n) levels x O(n) work = O(n^2)."));
    }

    private BrainQuestion make(QuestionType type, Difficulty difficulty,
                                String question, String a, String b, String c, String d,
                                String correct, String explanation, String steps) {
        BrainQuestion q = new BrainQuestion();
        q.setType(type);
        q.setDifficulty(difficulty);
        q.setQuestion(question);
        q.setOptionA(a);
        q.setOptionB(b);
        q.setOptionC(c);
        q.setOptionD(d);
        q.setCorrectAnswer(correct);
        q.setExplanation(explanation);
        q.setSteps(steps);
        return q;
    }
}
