package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.ExamRequest;
import com.thejas.backend_mini_mindforge.entity.Exam;
import com.thejas.backend_mini_mindforge.entity.ExamStatus;
import com.thejas.backend_mini_mindforge.entity.ExamQuestion;
import com.thejas.backend_mini_mindforge.entity.BankQuestion;
import com.thejas.backend_mini_mindforge.exception.ResourceNotFoundException;
import com.thejas.backend_mini_mindforge.repository.ExamRepository;
import com.thejas.backend_mini_mindforge.repository.ExamSettingsRepository;
import com.thejas.backend_mini_mindforge.repository.ExamQuestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ExamServiceLockTest {

    @Mock
    private ExamRepository examRepository;
    @Mock
    private ExamSettingsRepository examSettingsRepository;
    @Mock
    private ExamQuestionRepository examQuestionRepository;

    @InjectMocks
    private ExamService examService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private ExamRequest createValidReq() {
        ExamRequest req = new ExamRequest();
        req.setTitle("Test Exam");
        req.setDurationMinutes(60);
        req.setTotalMarks(100);
        req.setPassMarks(40);
        return req;
    }

    @Test
    void testDraftExamCanBeUpdated() {
        Exam draft = new Exam();
        draft.setId(1L);
        draft.setStatus(ExamStatus.DRAFT);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(draft));
        when(examRepository.save(any(Exam.class))).thenAnswer(i -> i.getArgument(0));

        Exam updated = examService.update(1L, createValidReq(), "teacher");
        assertEquals("Test Exam", updated.getTitle());
    }

    @Test
    void testPublishedExamCannotBeUpdated() {
        Exam published = new Exam();
        published.setId(1L);
        published.setStatus(ExamStatus.PUBLISHED);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(published));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            examService.update(1L, createValidReq(), "teacher");
        });
        assertEquals("Cannot update metadata of a non-draft exam.", ex.getMessage());
    }

    @Test
    void testArchivedExamCannotBeUpdated() {
        Exam archived = new Exam();
        archived.setId(1L);
        archived.setStatus(ExamStatus.ARCHIVED);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(archived));

        assertThrows(IllegalStateException.class, () -> {
            examService.update(1L, createValidReq(), "teacher");
        });
    }

    @Test
    void testPublishingFailsWhenNoQuestions() {
        Exam draft = new Exam();
        draft.setId(1L);
        draft.setStatus(ExamStatus.DRAFT);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(draft));
        when(examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(1L)).thenReturn(new ArrayList<>());

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            examService.publish(1L, "teacher");
        });
        assertEquals("Cannot publish an exam with no questions.", ex.getMessage());
    }

    @Test
    void testPublishingFailsWhenMarksMismatch() {
        Exam draft = new Exam();
        draft.setId(1L);
        draft.setTotalMarks(100);
        draft.setStatus(ExamStatus.DRAFT);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(draft));

        BankQuestion bq = new BankQuestion();
        bq.setMarks(50);
        ExamQuestion eq = new ExamQuestion();
        eq.setBankQuestion(bq);
        
        when(examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(1L)).thenReturn(List.of(eq));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            examService.publish(1L, "teacher");
        });
        assertEquals("Exam total marks must equal the sum of assigned question marks.", ex.getMessage());
    }

    @Test
    void testPublishingSucceedsWhenValid() {
        Exam draft = new Exam();
        draft.setId(1L);
        draft.setTotalMarks(50);
        draft.setStatus(ExamStatus.DRAFT);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(draft));
        when(examRepository.save(any(Exam.class))).thenAnswer(i -> i.getArgument(0));

        BankQuestion bq = new BankQuestion();
        bq.setMarks(50);
        ExamQuestion eq = new ExamQuestion();
        eq.setBankQuestion(bq);
        
        when(examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(1L)).thenReturn(List.of(eq));

        Exam published = examService.publish(1L, "teacher");
        assertEquals(ExamStatus.PUBLISHED, published.getStatus());
    }

    @Test
    void testCannotPublishPublishedExam() {
        Exam published = new Exam();
        published.setId(1L);
        published.setStatus(ExamStatus.PUBLISHED);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(published));

        assertThrows(IllegalStateException.class, () -> examService.publish(1L, "teacher"));
    }

    @Test
    void testArchivePublishedExam() {
        Exam published = new Exam();
        published.setId(1L);
        published.setStatus(ExamStatus.PUBLISHED);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(published));
        when(examRepository.save(any(Exam.class))).thenAnswer(i -> i.getArgument(0));

        Exam archived = examService.archive(1L, "teacher");
        assertEquals(ExamStatus.ARCHIVED, archived.getStatus());
    }

    @Test
    void testCannotArchiveDraftExam() {
        Exam draft = new Exam();
        draft.setId(1L);
        draft.setStatus(ExamStatus.DRAFT);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(draft));

        assertThrows(IllegalStateException.class, () -> examService.archive(1L, "teacher"));
    }

    // ─── Missing scenarios added to satisfy full spec coverage ───────────────

    @Test
    @DisplayName("publish: ARCHIVED exam cannot be published")
    void testCannotPublishArchivedExam() {
        Exam archived = new Exam();
        archived.setId(1L);
        archived.setStatus(ExamStatus.ARCHIVED);
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(archived));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> examService.publish(1L, "teacher"));
        // Message must mention the current status so the client gets a clear reason
        assertTrue(ex.getMessage().contains("ARCHIVED"),
                "Expected error message to mention ARCHIVED but was: " + ex.getMessage());
    }

    @Test
    @DisplayName("publish: teacher cannot publish another teacher's exam (ownership enforced)")
    void testPublishOwnershipEnforced() {
        // Simulates a different teacher (or no owner match) — repository returns empty
        when(examRepository.findByIdAndCreatedBy(1L, "other-teacher@example.com"))
                .thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> examService.publish(1L, "other-teacher@example.com"));
        assertTrue(ex.getMessage().contains("1"),
                "Expected error message to reference the exam id but was: " + ex.getMessage());
        // Verify publish never progressed to the question-loading stage
        verify(examQuestionRepository, never()).findByExamIdOrderByQuestionOrderAsc(any());
    }

    @Test
    @DisplayName("getPreview: teacher cannot preview another teacher's exam (ownership enforced)")
    void testPreviewOwnershipEnforced() {
        when(examRepository.findByIdAndCreatedBy(1L, "other-teacher@example.com"))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> examService.getPreview(1L, "other-teacher@example.com"));
        verify(examQuestionRepository, never()).findByExamIdOrderByQuestionOrderAsc(any());
    }

    @Test
    @DisplayName("getPreview: returns preview with computed marks summary")
    void testPreviewComputesSummaryCorrectly() {
        Exam draft = new Exam();
        draft.setId(1L);
        draft.setStatus(ExamStatus.DRAFT);
        draft.setTotalMarks(20);
        draft.setPassMarks(8);
        draft.setDurationMinutes(60);
        draft.setTitle("Preview Test");
        when(examRepository.findByIdAndCreatedBy(1L, "teacher")).thenReturn(Optional.of(draft));

        // Two questions: one with default marks (5), one with marksOverride (10)
        BankQuestion bq1 = new BankQuestion();
        bq1.setId(10L);
        bq1.setTitle("Q1");
        bq1.setQuestionText("Q1 text");
        bq1.setMarks(5);
        bq1.setIsDraft(false);
        bq1.setQuestionType(com.thejas.backend_mini_mindforge.entity.BankQuestionType.MCQ_SINGLE);
        bq1.setDifficulty(com.thejas.backend_mini_mindforge.entity.Difficulty.EASY);

        BankQuestion bq2 = new BankQuestion();
        bq2.setId(11L);
        bq2.setTitle("Q2");
        bq2.setQuestionText("Q2 text");
        bq2.setMarks(8);   // default marks — will be overridden
        bq2.setIsDraft(false);
        bq2.setQuestionType(com.thejas.backend_mini_mindforge.entity.BankQuestionType.TRUE_FALSE);
        bq2.setDifficulty(com.thejas.backend_mini_mindforge.entity.Difficulty.MEDIUM);

        ExamQuestion eq1 = new ExamQuestion();
        eq1.setId(100L);
        eq1.setBankQuestion(bq1);
        eq1.setQuestionOrder(1);
        eq1.setSection(com.thejas.backend_mini_mindforge.entity.ExamSection.GENERAL);
        eq1.setMandatory(false);
        eq1.setMarksOverride(null);      // use bankQuestion.marks = 5

        ExamQuestion eq2 = new ExamQuestion();
        eq2.setId(101L);
        eq2.setBankQuestion(bq2);
        eq2.setQuestionOrder(2);
        eq2.setSection(com.thejas.backend_mini_mindforge.entity.ExamSection.GENERAL);
        eq2.setMandatory(true);
        eq2.setMarksOverride(15);        // override: 15 instead of 8

        when(examQuestionRepository.findByExamIdOrderByQuestionOrderAsc(1L))
                .thenReturn(List.of(eq1, eq2));

        com.thejas.backend_mini_mindforge.dto.response.ExamPreviewResponse preview =
                examService.getPreview(1L, "teacher");

        assertEquals(2,     preview.getAssignedQuestionCount());
        assertEquals(20,    preview.getAssignedMarksSum());  // 5 + 15 = 20
        assertTrue(preview.isMarksMatch());                  // 20 == 20
        assertTrue(preview.isHasQuestions());
        assertEquals("Preview Test", preview.getTitle());
        assertEquals(2, preview.getQuestions().size());
    }
}

