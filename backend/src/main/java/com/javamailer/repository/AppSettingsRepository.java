package com.javamailer.repository;

import com.javamailer.entity.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Spring Data JPA repository for AppSettings entity
 * Provides CRUD operations and custom queries for application configuration
 */
@Repository
public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {
    
    /**
     * Find setting by key (unique)
     */
    Optional<AppSettings> findBySettingKey(String settingKey);
    
    /**
     * Check if setting exists
     */
    boolean existsBySettingKey(String settingKey);
}
