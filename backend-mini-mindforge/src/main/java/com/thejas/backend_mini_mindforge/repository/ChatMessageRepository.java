package com.thejas.backend_mini_mindforge.repository;

import com.thejas.backend_mini_mindforge.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConversationIdOrderByTimestampAsc(Long conversationId);
    void deleteByConversationId(Long conversationId);
}
