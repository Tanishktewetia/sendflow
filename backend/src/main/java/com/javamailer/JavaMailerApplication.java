package com.javamailer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main Spring Boot Application Entry Point
 * Starts the Java Mailer backend server
 */
@SpringBootApplication
public class JavaMailerApplication {

    public static void main(String[] args) {
        SpringApplication.run(JavaMailerApplication.class, args);
    }

}
