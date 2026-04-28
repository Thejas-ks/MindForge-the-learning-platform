package com.thejas.backend_mini_mindforge.dto.request;

public class ChatSendRequest {
    private Long conversationId; // null = start new conversation
    private String message;

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
