package com.thejas.backend_mini_mindforge.controller;

import com.thejas.backend_mini_mindforge.dto.request.ChatSendRequest;
import com.thejas.backend_mini_mindforge.dto.response.ChatSendResponse;
import com.thejas.backend_mini_mindforge.entity.ChatMessage;
import com.thejas.backend_mini_mindforge.entity.Conversation;
import com.thejas.backend_mini_mindforge.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    // Send a message — creates new conversation if conversationId is null
    @PostMapping("/send")
    public ResponseEntity<ChatSendResponse> send(@RequestBody ChatSendRequest req, Authentication auth) {
        return ResponseEntity.ok(chatService.send(req, auth.getName()));
    }

    // Get all messages in a conversation
    @GetMapping("/history/{conversationId}")
    public ResponseEntity<List<ChatMessage>> history(@PathVariable Long conversationId, Authentication auth) {
        return ResponseEntity.ok(chatService.getHistory(conversationId, auth.getName()));
    }

    // Get all conversations for the logged-in user
    @GetMapping("/conversations")
    public ResponseEntity<List<Conversation>> conversations(Authentication auth) {
        return ResponseEntity.ok(chatService.getConversations(auth.getName()));
    }

    // Delete a conversation and all its messages
    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long conversationId, Authentication auth) {
        chatService.deleteConversation(conversationId, auth.getName());
        return ResponseEntity.ok().build();
    }
}
