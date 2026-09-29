package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.BankQuestionRequest;
import com.thejas.backend_mini_mindforge.dto.request.QuestionOptionRequest;
import com.thejas.backend_mini_mindforge.dto.response.BankQuestionResponse;
import com.thejas.backend_mini_mindforge.entity.*;
import com.thejas.backend_mini_mindforge.repository.BankQuestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BankQuestionServiceTest {

    @Mock
    private BankQuestionRepository questionRepository;

    @InjectMocks
    private BankQuestionService questionService;

    private static final String TEACHER_EMAIL = "teacher@mindforge.com";

    @Test
    @DisplayName("createDraft: safely persists incomplete question data (only title required)")
    void testCreateDraftIncompleteData() {
        BankQuestionRequest req = new BankQuestionRequest();
        req.setTitle("Draft Q1 Title");
        // No question text, no options, no marks

        when(questionRepository.save(any(BankQuestion.class))).thenAnswer(invocation -> {
            BankQuestion bq = invocation.getArgument(0);
            bq.setId(101L);
            return bq;
        });

        BankQuestionResponse res = questionService.createDraft(req, TEACHER_EMAIL, 10L);

        assertNotNull(res);
        assertEquals(101L, res.getId());
        assertEquals("Draft Q1 Title", res.getTitle());
        assertTrue(res.getIsDraft());
        assertEquals(10L, res.getExamDraftId());
        verify(questionRepository, times(1)).save(any(BankQuestion.class));
    }

    @Test
    @DisplayName("finalizeDraft: fails when question text is missing")
    void testFinalizeDraftMissingText() {
        BankQuestion draft = new BankQuestion();
        draft.setId(1L);
        draft.setTitle("Draft Title");
        draft.setIsDraft(true);
        draft.setCreatedBy(TEACHER_EMAIL);

        when(questionRepository.findByIdAndCreatedBy(1L, TEACHER_EMAIL)).thenReturn(Optional.of(draft));

        BankQuestionRequest req = new BankQuestionRequest();
        req.setTitle("Valid Title");
        req.setQuestionText(""); // Empty text
        req.setQuestionType("MCQ_SINGLE");
        req.setDifficulty("EASY");
        req.setMarks(2);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> questionService.finalizeDraft(1L, req, TEACHER_EMAIL));
        assertTrue(ex.getMessage().contains("Question text is required"));
    }

    @Test
    @DisplayName("finalizeDraft: fails for MCQ_SINGLE when not exactly one correct option")
    void testFinalizeDraftMcqSingleInvalidCorrect() {
        BankQuestion draft = new BankQuestion();
        draft.setId(1L);
        draft.setIsDraft(true);
        draft.setCreatedBy(TEACHER_EMAIL);

        when(questionRepository.findByIdAndCreatedBy(1L, TEACHER_EMAIL)).thenReturn(Optional.of(draft));

        BankQuestionRequest req = new BankQuestionRequest();
        req.setTitle("Valid Title");
        req.setQuestionText("What is Java?");
        req.setQuestionType("MCQ_SINGLE");
        req.setDifficulty("EASY");
        req.setMarks(1);

        List<QuestionOptionRequest> options = new ArrayList<>();
        QuestionOptionRequest o1 = new QuestionOptionRequest();
        o1.setOptionText("Option A");
        o1.setCorrect(true);
        QuestionOptionRequest o2 = new QuestionOptionRequest();
        o2.setOptionText("Option B");
        o2.setCorrect(true); // TWO correct options for single choice!
        options.add(o1);
        options.add(o2);
        req.setOptions(options);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> questionService.finalizeDraft(1L, req, TEACHER_EMAIL));
        assertTrue(ex.getMessage().contains("Exactly one correct option is required for MCQ_SINGLE"));
    }

    @Test
    @DisplayName("finalizeDraft: fails for MCQ_MULTIPLE when zero correct options")
    void testFinalizeDraftMcqMultipleNoCorrect() {
        BankQuestion draft = new BankQuestion();
        draft.setId(1L);
        draft.setIsDraft(true);
        draft.setCreatedBy(TEACHER_EMAIL);

        when(questionRepository.findByIdAndCreatedBy(1L, TEACHER_EMAIL)).thenReturn(Optional.of(draft));

        BankQuestionRequest req = new BankQuestionRequest();
        req.setTitle("Valid Title");
        req.setQuestionText("Select all that apply");
        req.setQuestionType("MCQ_MULTIPLE");
        req.setDifficulty("MEDIUM");
        req.setMarks(2);

        List<QuestionOptionRequest> options = new ArrayList<>();
        QuestionOptionRequest o1 = new QuestionOptionRequest();
        o1.setOptionText("Option A");
        o1.setCorrect(false);
        QuestionOptionRequest o2 = new QuestionOptionRequest();
        o2.setOptionText("Option B");
        o2.setCorrect(false);
        options.add(o1);
        options.add(o2);
        req.setOptions(options);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> questionService.finalizeDraft(1L, req, TEACHER_EMAIL));
        assertTrue(ex.getMessage().contains("At least one correct option is required for MCQ_MULTIPLE"));
    }

    @Test
    @DisplayName("finalizeDraft: validates TRUE_FALSE requires exactly 1 correct option")
    void testFinalizeDraftTrueFalseInvalid() {
        BankQuestion draft = new BankQuestion();
        draft.setId(1L);
        draft.setIsDraft(true);
        draft.setCreatedBy(TEACHER_EMAIL);

        when(questionRepository.findByIdAndCreatedBy(1L, TEACHER_EMAIL)).thenReturn(Optional.of(draft));

        BankQuestionRequest req = new BankQuestionRequest();
        req.setTitle("TF Title");
        req.setQuestionText("Is Java object oriented?");
        req.setQuestionType("TRUE_FALSE");
        req.setDifficulty("EASY");
        req.setMarks(1);

        List<QuestionOptionRequest> options = new ArrayList<>();
        QuestionOptionRequest o1 = new QuestionOptionRequest();
        o1.setOptionText("True");
        o1.setCorrect(true);
        QuestionOptionRequest o2 = new QuestionOptionRequest();
        o2.setOptionText("False");
        o2.setCorrect(true); // Both true!
        options.add(o1);
        options.add(o2);
        req.setOptions(options);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> questionService.finalizeDraft(1L, req, TEACHER_EMAIL));
        assertTrue(ex.getMessage().contains("Exactly one correct option is required for TRUE_FALSE"));
    }

    @Test
    @DisplayName("finalizeDraft: successfully promotes valid draft, sets isDraft=false, clears examDraftId")
    void testFinalizeDraftSuccess() {
        BankQuestion draft = new BankQuestion();
        draft.setId(1L);
        draft.setIsDraft(true);
        draft.setExamDraftId(42L);
        draft.setCreatedBy(TEACHER_EMAIL);

        when(questionRepository.findByIdAndCreatedBy(1L, TEACHER_EMAIL)).thenReturn(Optional.of(draft));
        when(questionRepository.save(any(BankQuestion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BankQuestionRequest req = new BankQuestionRequest();
        req.setTitle("Finalized Title");
        req.setQuestionText("What is the capital of France?");
        req.setQuestionType("MCQ_SINGLE");
        req.setDifficulty("EASY");
        req.setMarks(1);

        List<QuestionOptionRequest> options = new ArrayList<>();
        QuestionOptionRequest o1 = new QuestionOptionRequest();
        o1.setOptionText("Paris");
        o1.setCorrect(true);
        QuestionOptionRequest o2 = new QuestionOptionRequest();
        o2.setOptionText("London");
        o2.setCorrect(false);
        options.add(o1);
        options.add(o2);
        req.setOptions(options);

        BankQuestionResponse res = questionService.finalizeDraft(1L, req, TEACHER_EMAIL);

        assertNotNull(res);
        assertFalse(res.getIsDraft());
        assertNull(res.getExamDraftId());
        assertEquals("Finalized Title", res.getTitle());
    }

    @Test
    @DisplayName("updateDraft: updates existing draft in-place without requiring complete validation")
    void testUpdateDraftSuccess() {
        BankQuestion draft = new BankQuestion();
        draft.setId(5L);
        draft.setTitle("Old Draft");
        draft.setIsDraft(true);
        draft.setCreatedBy(TEACHER_EMAIL);

        when(questionRepository.findByIdAndCreatedBy(5L, TEACHER_EMAIL)).thenReturn(Optional.of(draft));
        when(questionRepository.save(any(BankQuestion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BankQuestionRequest req = new BankQuestionRequest();
        req.setTitle("Updated Draft Title");
        // No question text or options — still valid for draft update

        BankQuestionResponse res = questionService.updateDraft(5L, req, TEACHER_EMAIL, 10L);

        assertEquals(5L, res.getId());
        assertEquals("Updated Draft Title", res.getTitle());
        assertTrue(res.getIsDraft());
        assertEquals(10L, res.getExamDraftId());
    }

    @Test
    @DisplayName("getAll: excludes drafts and only returns finalized questions")
    void testGetAllExcludesDrafts() {
        BankQuestion finalized1 = new BankQuestion();
        finalized1.setId(1L);
        finalized1.setIsDraft(false);
        finalized1.setQuestionType(BankQuestionType.MCQ_SINGLE);
        finalized1.setDifficulty(Difficulty.EASY);

        when(questionRepository.findByCreatedByAndIsDraftFalse(TEACHER_EMAIL))
                .thenReturn(List.of(finalized1));

        List<BankQuestionResponse> list = questionService.getAll(TEACHER_EMAIL);

        assertEquals(1, list.size());
        assertEquals(1L, list.get(0).getId());
        assertFalse(list.get(0).getIsDraft());
        verify(questionRepository).findByCreatedByAndIsDraftFalse(TEACHER_EMAIL);
    }

    @Test
    @DisplayName("getDraftsByExam: returns only drafts scoped to the requested exam")
    void testGetDraftsByExam() {
        BankQuestion draftExamA = new BankQuestion();
        draftExamA.setId(10L);
        draftExamA.setIsDraft(true);
        draftExamA.setExamDraftId(100L);
        draftExamA.setQuestionType(BankQuestionType.MCQ_SINGLE);
        draftExamA.setDifficulty(Difficulty.EASY);

        when(questionRepository.findByCreatedByAndIsDraftTrueAndExamDraftId(TEACHER_EMAIL, 100L))
                .thenReturn(List.of(draftExamA));

        List<BankQuestionResponse> list = questionService.getDraftsByExam(TEACHER_EMAIL, 100L);

        assertEquals(1, list.size());
        assertEquals(10L, list.get(0).getId());
        assertEquals(100L, list.get(0).getExamDraftId());
        verify(questionRepository).findByCreatedByAndIsDraftTrueAndExamDraftId(TEACHER_EMAIL, 100L);
    }
}
