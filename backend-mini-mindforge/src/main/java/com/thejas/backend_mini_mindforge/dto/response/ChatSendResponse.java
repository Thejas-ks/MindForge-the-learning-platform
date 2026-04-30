package com.thejas.backend_mini_mindforge.dto.response;

import com.thejas.backend_mini_mindforge.entity.ChatMessage;
import com.thejas.backend_mini_mindforge.entity.Conversation;

public class ChatSendResponse {
    private Long conversationId;
    private String conversationTitle;
    private ChatMessage userMessage;
    private ChatMessage assistantMessage;

    public ChatSendResponse(Conversation conv, ChatMessage userMsg, ChatMessage assistantMsg) {
        this.conversationId = conv.getId();
        this.conversationTitle = conv.getTitle();
        this.userMessage = userMsg;
        this.assistantMessage = assistantMsg;
    }

    public Long getConversationId() { return conversationId; }
    public String getConversationTitle() { return conversationTitle; }
    public ChatMessage getUserMessage() { return userMessage; }
    public ChatMessage getAssistantMessage() { return assistantMessage; }
}
