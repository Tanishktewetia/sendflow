package com.javamailer.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Recipient Model - Represents email recipient from CSV
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipient {
    private String name;
    private String email;
    private String company;
    private String customField1;
    private String customField2;
}
