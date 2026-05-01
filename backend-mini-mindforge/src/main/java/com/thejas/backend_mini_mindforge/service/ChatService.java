package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.ChatSendRequest;
import com.thejas.backend_mini_mindforge.dto.response.ChatSendResponse;
import com.thejas.backend_mini_mindforge.entity.ChatMessage;
import com.thejas.backend_mini_mindforge.entity.Conversation;
import com.thejas.backend_mini_mindforge.entity.Question;
import com.thejas.backend_mini_mindforge.repository.QuestionRepository;
import com.thejas.backend_mini_mindforge.repository.ChatMessageRepository;
import com.thejas.backend_mini_mindforge.repository.ConversationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final int MAX_CONTEXT_MESSAGES = 20;

    private final ConversationRepository conversationRepo;
    private final ChatMessageRepository messageRepo;
    private final QuestionRepository questionRepo;
    private final AiService aiService;

    public ChatService(ConversationRepository conversationRepo,
                       ChatMessageRepository messageRepo,
                       QuestionRepository questionRepo,
                       AiService aiService) {
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
        this.questionRepo = questionRepo;
        this.aiService = aiService;
    }

    @Transactional
    public ChatSendResponse send(ChatSendRequest req, String userEmail) {
        String userText = req.getMessage() == null ? "" : req.getMessage().trim();
        boolean hasNotes = req.getNotesContext() != null && !req.getNotesContext().isBlank();
        // Allow file-only sends (no message text) as long as notes context is present
        if (userText.isBlank() && !hasNotes) throw new IllegalArgumentException("Message or file is required");

        // Display label: use message text, or filename, or fallback
        String displayLabel = !userText.isBlank() ? userText
                : (req.getFilename() != null ? "📄 " + req.getFilename() : "📄 File");

        // Get or create conversation
        Conversation conv;
        if (req.getConversationId() != null) {
            conv = conversationRepo.findByIdAndUserEmail(req.getConversationId(), userEmail)
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));
        } else {
            conv = new Conversation();
            conv.setUserEmail(userEmail);
            conv.setTitle(displayLabel.length() > 60 ? displayLabel.substring(0, 60) + "…" : displayLabel);
            conv.setCreatedAt(LocalDateTime.now());
            conv = conversationRepo.save(conv);
        }

        // Fetch existing messages for context (last MAX_CONTEXT_MESSAGES)
        List<ChatMessage> history = messageRepo.findByConversationIdOrderByTimestampAsc(conv.getId());
        List<Map<String, String>> contextHistory = history.stream()
                .skip(Math.max(0, history.size() - MAX_CONTEXT_MESSAGES))
                .map(m -> {
                    Map<String, String> map = new HashMap<>();
                    map.put("role", m.getRole());
                    map.put("content", m.getContent());
                    return map;
                })
                .collect(Collectors.toList());

        // Save user message — show filename label if no text
        ChatMessage userMsg = new ChatMessage();
        userMsg.setConversationId(conv.getId());
        userMsg.setUserEmail(userEmail);
        userMsg.setRole("user");
        userMsg.setContent(displayLabel);
        userMsg.setTimestamp(LocalDateTime.now());
        userMsg = messageRepo.save(userMsg);

        // Build AI prompt — combine message + notes context
        String aiPrompt;
        if (hasNotes) {
            String notesSnippet = req.getNotesContext().substring(0, Math.min(req.getNotesContext().length(), 3000));
            aiPrompt = !userText.isBlank()
                    ? "The user provided the following document as context:\n\n" + notesSnippet
                      + "\n\n---\n\nUsing the above as context, answer: " + userText
                    : "The user uploaded a document. Summarize the key concepts clearly with bullet points.\n\nContent:\n" + notesSnippet;
        } else {
            aiPrompt = userText;
        }

        String aiReply = aiService.generateAnswerWithHistory(aiPrompt, contextHistory);
        Question question = new Question();
        question.setQuestion(userText);
        question.setAnswer(aiReply);
        question.setEmail(userEmail);
        question = questionRepo.save(question);

        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setConversationId(conv.getId());
        assistantMsg.setUserEmail(userEmail);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(aiReply);
        assistantMsg.setQuestionId(question.getId());
        assistantMsg.setTimestamp(LocalDateTime.now());
        assistantMsg = messageRepo.save(assistantMsg);

        return new ChatSendResponse(conv, userMsg, assistantMsg);
    }

    public List<ChatMessage> getHistory(Long conversationId, String userEmail) {
        conversationRepo.findByIdAndUserEmail(conversationId, userEmail)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        return messageRepo.findByConversationIdOrderByTimestampAsc(conversationId);
    }

    public List<Conversation> getConversations(String userEmail) {
        return conversationRepo.findByUserEmailOrderByCreatedAtDesc(userEmail);
    }

    @Transactional
    public void deleteConversation(Long conversationId, String userEmail) {
        conversationRepo.findByIdAndUserEmail(conversationId, userEmail)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        messageRepo.deleteByConversationId(conversationId);
        conversationRepo.deleteByIdAndUserEmail(conversationId, userEmail);
    }
}
