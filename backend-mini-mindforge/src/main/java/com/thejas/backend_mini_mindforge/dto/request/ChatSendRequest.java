package com.thejas.backend_mini_mindforge.dto.request;

public class ChatSendRequest {
    private Long conversationId;
    private String message;
    private String notesContext; // optional extracted file content
    private String filename;     // optional — used as display label for file-only sends

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getNotesContext() { return notesContext; }
    public void setNotesContext(String notesContext) { this.notesContext = notesContext; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }
}
