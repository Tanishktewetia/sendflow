package com.javamailer.util;

import java.util.regex.Pattern;

/**
 * Email Validator - Utility for email validation
 */
public class EmailValidator {

    private static final String EMAIL_PATTERN = 
        "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$";
    
    private static final Pattern pattern = Pattern.compile(EMAIL_PATTERN);

    /**
     * Validate email address format
     * @param email email address to validate
     * @return true if email is valid, false otherwise
     */
    public static boolean isValidEmail(String email) {
        return email != null && pattern.matcher(email).matches();
    }
}
