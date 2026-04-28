package com.thejas.backend_mini_mindforge.service;

import com.thejas.backend_mini_mindforge.dto.request.ChatSendRequest;
import com.thejas.backend_mini_mindforge.dto.response.ChatSendResponse;
import com.thejas.backend_mini_mindforge.entity.ChatMessage;
import com.thejas.backend_mini_mindforge.entity.Conversation;
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
    private final AiService aiService;

    public ChatService(ConversationRepository conversationRepo,
                       ChatMessageRepository messageRepo,
                       AiService aiService) {
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
        this.aiService = aiService;
    }

    @Transactional
    public ChatSendResponse send(ChatSendRequest req, String userEmail) {
        String userText = req.getMessage() == null ? "" : req.getMessage().trim();
        if (userText.isBlank()) throw new IllegalArgumentException("Message cannot be empty");

        // Get or create conversation
        Conversation conv;
        if (req.getConversationId() != null) {
            conv = conversationRepo.findByIdAndUserEmail(req.getConversationId(), userEmail)
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));
        } else {
            conv = new Conversation();
            conv.setUserEmail(userEmail);
            conv.setTitle(userText.length() > 60 ? userText.substring(0, 60) + "…" : userText);
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

        // Save user message
        ChatMessage userMsg = new ChatMessage();
        userMsg.setConversationId(conv.getId());
        userMsg.setUserEmail(userEmail);
        userMsg.setRole("user");
        userMsg.setContent(userText);
        userMsg.setTimestamp(LocalDateTime.now());
        userMsg = messageRepo.save(userMsg);

        // Call AI with full context
        String aiReply = aiService.generateAnswerWithHistory(userText, contextHistory);

        // Save assistant message
        ChatMessage assistantMsg = new ChatMessage();
        assistantMsg.setConversationId(conv.getId());
        assistantMsg.setUserEmail(userEmail);
        assistantMsg.setRole("assistant");
        assistantMsg.setContent(aiReply);
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
