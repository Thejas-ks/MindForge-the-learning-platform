package com.thejas.backend_mini_mindforge.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long conversationId;

    @Column(nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String role; // "user" or "assistant"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // Links to user_questions table so quiz/flashcard APIs work for this message
    private Long questionId;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();
}
