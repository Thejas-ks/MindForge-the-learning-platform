package com.thejas.backend_mini_mindforge.dto.request;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    private String email;

    private String password;

    private String name;
}