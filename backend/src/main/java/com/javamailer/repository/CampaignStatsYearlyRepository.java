package com.javamailer.repository;

import com.javamailer.entity.CampaignStatsYearly;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CampaignStatsYearlyRepository extends JpaRepository<CampaignStatsYearly, Long> {

    Optional<CampaignStatsYearly> findByUserIdAndStatYear(Long userId, Integer statYear);

    long deleteByUserId(Long userId);

    long deleteByUserIdAndStatYear(Long userId, Integer statYear);

    @Query("SELECT COALESCE(SUM(y.sentCount), 0), COALESCE(SUM(y.failedCount), 0), COALESCE(SUM(y.totalCount), 0) " +
            "FROM CampaignStatsYearly y WHERE y.userId = :userId")
    Object[] sumAllYearsByUser(@Param("userId") Long userId);
}
