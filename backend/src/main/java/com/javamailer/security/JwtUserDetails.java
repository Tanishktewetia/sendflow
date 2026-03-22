package com.javamailer.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * JWT User Details - Store user information extracted from JWT token
 * Attached to authentication object for easy access in controllers
 */
@Getter
@AllArgsConstructor
public class JwtUserDetails {
    private Long userId;
    private String email;
}
