package com.javamailer.repository;

import com.javamailer.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Spring Data JPA repository for User entity
 * Provides CRUD operations and custom queries for user data access
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * Find user by email (unique constraint)
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Check if user exists by email
     */
    boolean existsByEmail(String email);
    
    /**
     * Find user by email for login
     */
    Optional<User> findByEmailAndIsActiveTrue(String email);
    
    /**
     * Find users by verification status
     */
    java.util.List<User> findByIsEmailVerifiedFalse();
}
