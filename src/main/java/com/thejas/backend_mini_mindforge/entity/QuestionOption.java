package com.thejas.backend_mini_mindforge.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "question_options")
@Data
@NoArgsConstructor
public class QuestionOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @JsonIgnore
    private BankQuestion question;

    @Column(nullable = false, length = 1000)
    private String optionText;

    @Column(nullable = false)
    private Boolean correct = false;

    @Column(nullable = false)
    private Integer displayOrder = 0;
}
