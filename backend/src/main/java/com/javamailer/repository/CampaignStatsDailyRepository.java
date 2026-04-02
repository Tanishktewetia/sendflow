package com.javamailer.repository;

import com.javamailer.entity.CampaignStatsDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface CampaignStatsDailyRepository extends JpaRepository<CampaignStatsDaily, Long> {

    boolean existsByQueueId(Long queueId);

    java.util.Optional<CampaignStatsDaily> findByQueueId(Long queueId);

    Optional<CampaignStatsDaily> findByUserIdAndQueueId(Long userId, Long queueId);

    @Modifying
    long deleteByUserId(Long userId);

    @Modifying
        long deleteByRecordedAtBefore(LocalDateTime dayStart);

    @Modifying
    @Query("DELETE FROM CampaignStatsDaily s WHERE s.userId = :userId AND s.recordedAt >= :dayStart AND s.recordedAt < :nextDayStart AND s.queueId <> :bucketQueueId")
    int deleteOtherRowsForToday(@Param("userId") Long userId,
                                 @Param("dayStart") LocalDateTime dayStart,
                                 @Param("nextDayStart") LocalDateTime nextDayStart,
                                 @Param("bucketQueueId") Long bucketQueueId);

    @Query("SELECT COALESCE(SUM(s.sentCount), 0), COALESCE(SUM(s.failedCount), 0), COALESCE(SUM(s.totalCount), 0) " +
            "FROM CampaignStatsDaily s WHERE s.userId = :userId AND s.recordedAt >= :dayStart AND s.recordedAt < :nextDayStart")
        Object[] sumTodayByUser(@Param("userId") Long userId,
                    @Param("dayStart") LocalDateTime dayStart,
                    @Param("nextDayStart") LocalDateTime nextDayStart);
}
