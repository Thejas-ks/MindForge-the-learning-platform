package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.ExamQuestionRequest;
import com.thejas.backend_mini_mindforge.entity.BankQuestion;
import com.thejas.backend_mini_mindforge.entity.Exam;
import com.thejas.backend_mini_mindforge.entity.ExamQuestion;
import com.thejas.backend_mini_mindforge.entity.ExamSection;
import com.thejas.backend_mini_mindforge.entity.ExamStatus;
import com.thejas.backend_mini_mindforge.repository.BankQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.ExamQuestionRepository;
import com.thejas.backend_mini_mindforge.repository.ExamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the DRAFT-only mutation guards added to ExamQuestionService:
 *   - update()
 *   - remove()
 *   - removeAll()
 *
 * Each guard must throw IllegalStateException when the exam is PUBLISHED or ARCHIVED,
 * and must NOT throw when the exam is DRAFT.
 * Ownership is enforced by findOwnedExam(), which is exercised implicitly here.
 */
class ExamQuestionServiceLockTest {

    private static final String TEACHER = "teacher@example.com";
    private static final Long EXAM_ID = 1L;
    private static final Long EQ_ID = 10L;       // ExamQuestion ID
    private static final Long BQ_ID = 20L;        // BankQuestion ID
    private static final String LOCK_MSG = "Questions cannot be modified after the exam is published.";

    @Mock private ExamQuestionRepository examQuestionRepository;
    @Mock private ExamRepository examRepository;
    @Mock private BankQuestionRepository bankQuestionRepository;
    @Mock private BankQuestionService bankQuestionService;

    @InjectMocks private ExamQuestionService examQuestionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Exam examWithStatus(ExamStatus status) {
        Exam e = new Exam();
        e.setId(EXAM_ID);
        e.setStatus(status);
        e.setCreatedBy(TEACHER);
        return e;
    }

    private ExamQuestion examQuestion(Exam exam) {
        BankQuestion bq = new BankQuestion();
        bq.setId(BQ_ID);
        bq.setTitle("Sample Q");
        bq.setQuestionType(com.thejas.backend_mini_mindforge.entity.BankQuestionType.MCQ_SINGLE);
        bq.setDifficulty(com.thejas.backend_mini_mindforge.entity.Difficulty.EASY);
        bq.setMarks(5);

        ExamQuestion eq = new ExamQuestion();
        eq.setId(EQ_ID);
        eq.setExam(exam);
        eq.setBankQuestion(bq);
        eq.setQuestionOrder(1);
        eq.setSection(ExamSection.GENERAL);
        eq.setMandatory(false);
        return eq;
    }

    private ExamQuestionRequest patchReq() {
        ExamQuestionRequest req = new ExamQuestionRequest();
        req.setSection("SECTION_A");
        return req;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // update()
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("update: PUBLISHED exam → IllegalStateException with lock message")
    void testUpdateRejectedWhenPublished() {
        Exam published = examWithStatus(ExamStatus.PUBLISHED);
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(published));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                examQuestionService.update(EXAM_ID, EQ_ID, patchReq(), TEACHER));

        assertEquals(LOCK_MSG, ex.getMessage());
        // Confirm the repository was never touched after the guard fired
        verify(examQuestionRepository, never()).save(any());
    }

    @Test
    @DisplayName("update: ARCHIVED exam → IllegalStateException with lock message")
    void testUpdateRejectedWhenArchived() {
        Exam archived = examWithStatus(ExamStatus.ARCHIVED);
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(archived));

        assertThrows(IllegalStateException.class, () ->
                examQuestionService.update(EXAM_ID, EQ_ID, patchReq(), TEACHER));

        verify(examQuestionRepository, never()).save(any());
    }

    @Test
    @DisplayName("update: DRAFT exam → proceeds past the guard and saves")
    void testUpdateAllowedWhenDraft() {
        Exam draft = examWithStatus(ExamStatus.DRAFT);
        ExamQuestion eq = examQuestion(draft);

        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(draft));
        when(examQuestionRepository.findById(EQ_ID))
                .thenReturn(Optional.of(eq));
        when(examQuestionRepository.save(any(ExamQuestion.class)))
                .thenAnswer(i -> i.getArgument(0));

        // Should not throw
        assertDoesNotThrow(() ->
                examQuestionService.update(EXAM_ID, EQ_ID, patchReq(), TEACHER));

        verify(examQuestionRepository, times(1)).save(any());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // remove()
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("remove: PUBLISHED exam → IllegalStateException with lock message")
    void testRemoveRejectedWhenPublished() {
        Exam published = examWithStatus(ExamStatus.PUBLISHED);
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(published));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                examQuestionService.remove(EXAM_ID, BQ_ID, TEACHER));

        assertEquals(LOCK_MSG, ex.getMessage());
        verify(examQuestionRepository, never()).deleteByExamIdAndBankQuestionId(any(), any());
    }

    @Test
    @DisplayName("remove: ARCHIVED exam → IllegalStateException with lock message")
    void testRemoveRejectedWhenArchived() {
        Exam archived = examWithStatus(ExamStatus.ARCHIVED);
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(archived));

        assertThrows(IllegalStateException.class, () ->
                examQuestionService.remove(EXAM_ID, BQ_ID, TEACHER));

        verify(examQuestionRepository, never()).deleteByExamIdAndBankQuestionId(any(), any());
    }

    @Test
    @DisplayName("remove: DRAFT exam → proceeds past the guard and deletes")
    void testRemoveAllowedWhenDraft() {
        Exam draft = examWithStatus(ExamStatus.DRAFT);
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(draft));
        when(examQuestionRepository.existsByExamIdAndBankQuestionId(EXAM_ID, BQ_ID))
                .thenReturn(true);

        assertDoesNotThrow(() ->
                examQuestionService.remove(EXAM_ID, BQ_ID, TEACHER));

        verify(examQuestionRepository, times(1))
                .deleteByExamIdAndBankQuestionId(EXAM_ID, BQ_ID);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // removeAll()
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("removeAll: PUBLISHED exam → IllegalStateException with lock message")
    void testRemoveAllRejectedWhenPublished() {
        Exam published = examWithStatus(ExamStatus.PUBLISHED);
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(published));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                examQuestionService.removeAll(EXAM_ID, TEACHER));

        assertEquals(LOCK_MSG, ex.getMessage());
        verify(examQuestionRepository, never()).deleteByExamId(any());
    }

    @Test
    @DisplayName("removeAll: ARCHIVED exam → IllegalStateException with lock message")
    void testRemoveAllRejectedWhenArchived() {
        Exam archived = examWithStatus(ExamStatus.ARCHIVED);
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(archived));

        assertThrows(IllegalStateException.class, () ->
                examQuestionService.removeAll(EXAM_ID, TEACHER));

        verify(examQuestionRepository, never()).deleteByExamId(any());
    }

    @Test
    @DisplayName("removeAll: DRAFT exam → proceeds past the guard and deletes all")
    void testRemoveAllAllowedWhenDraft() {
        Exam draft = examWithStatus(ExamStatus.DRAFT);
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, TEACHER))
                .thenReturn(Optional.of(draft));

        assertDoesNotThrow(() ->
                examQuestionService.removeAll(EXAM_ID, TEACHER));

        verify(examQuestionRepository, times(1)).deleteByExamId(EXAM_ID);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Ownership — wrong teacher gets 404, not the lock message
    // ═══════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("update: wrong owner → ResourceNotFoundException (ownership enforced before status check)")
    void testUpdateOwnershipEnforced() {
        when(examRepository.findByIdAndCreatedBy(EXAM_ID, "other@example.com"))
                .thenReturn(Optional.empty());

        com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException ex =
                assertThrows(
                        com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException.class,
                        () -> examQuestionService.update(EXAM_ID, EQ_ID, patchReq(), "other@example.com"));

        assertTrue(ex.getMessage().contains(String.valueOf(EXAM_ID)));
    }
}
