package com.javamailer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Main Spring Boot Application Entry Point
 * Starts the Java Mailer backend server
 * 
 * @EnableAsync - Enable asynchronous method execution for campaign processing
 */
@SpringBootApplication
@EnableAsync
public class JavaMailerApplication {

    public static void main(String[] args) {
        SpringApplication.run(JavaMailerApplication.class, args);
    }

}
