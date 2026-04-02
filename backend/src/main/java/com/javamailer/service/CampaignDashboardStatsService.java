package com.javamailer.service;

import com.javamailer.entity.CampaignQueue;
import com.javamailer.entity.CampaignStatsDaily;
import com.javamailer.entity.CampaignStatsYearly;
import com.javamailer.repository.CampaignQueueRepository;
import com.javamailer.repository.CampaignStatsDailyRepository;
import com.javamailer.repository.CampaignStatsYearlyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignDashboardStatsService {

    private static final int LEGACY_ALL_TIME_BUCKET_YEAR = 0;

    private final CampaignStatsDailyRepository dailyRepository;
    private final CampaignStatsYearlyRepository yearlyRepository;
    private final CampaignQueueRepository campaignQueueRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordCampaignOutcome(CampaignQueue queue) {
        if (queue == null || queue.getId() == null || queue.getUserId() == null) {
            return;
        }

        cleanupExpiredDailyStats();

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        int currentYear = now.getYear();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime yearStart = LocalDate.of(currentYear, 1, 1).atStartOfDay();
        LocalDateTime nextDayStart = now.toLocalDate().plusDays(1).atStartOfDay();

        int queueSent = safeInt(queue.getSentRecipients());
        int queueFailed = safeInt(queue.getFailedRecipients());
        int queueProcessed = safeInt(queue.getProcessedRecipients());
        if (queueProcessed <= 0 && (queueSent > 0 || queueFailed > 0)) {
            queueProcessed = queueSent + queueFailed;
        }

        long dailyBucketQueueId = buildDailyBucketQueueId(queue.getUserId(), today);
        CampaignStatsDaily existingDailyBucket = dailyRepository.findByUserIdAndQueueId(queue.getUserId(), dailyBucketQueueId).orElse(null);
        int dailySent = existingDailyBucket != null ? safeInt(existingDailyBucket.getSentCount()) + queueSent : queueSent;
        int dailyFailed = existingDailyBucket != null ? safeInt(existingDailyBucket.getFailedCount()) + queueFailed : queueFailed;
        int dailyTotal = existingDailyBucket != null ? safeInt(existingDailyBucket.getTotalCount()) + queueProcessed : queueProcessed;

        upsertDailyBucket(queue.getUserId(), dailyBucketQueueId, dailySent, dailyFailed, dailyTotal, now, nextDayStart);

        // Keep only one daily row for the current day/user.
        dailyRepository.deleteOtherRowsForToday(queue.getUserId(), dayStart, nextDayStart, dailyBucketQueueId);

        CampaignStatsYearly existingYearBucket = yearlyRepository.findByUserIdAndStatYear(queue.getUserId(), currentYear).orElse(null);
        long yearSent = existingYearBucket != null ? Math.max(0L, existingYearBucket.getSentCount()) + queueSent : queueSent;
        long yearFailed = existingYearBucket != null ? Math.max(0L, existingYearBucket.getFailedCount()) + queueFailed : queueFailed;
        long yearTotal = existingYearBucket != null ? Math.max(0L, existingYearBucket.getTotalCount()) + queueProcessed : queueProcessed;

        upsertYearlyBucket(queue.getUserId(), currentYear, yearSent, yearFailed, yearTotal);

        // Cleanup old legacy all-time row to avoid duplicate counting after migration.
        yearlyRepository.deleteByUserIdAndStatYear(queue.getUserId(), LEGACY_ALL_TIME_BUCKET_YEAR);

        Object[] ytdAgg = yearlyRepository.sumAllYearsByUser(queue.getUserId());
        long ytdSent = Math.max(0L, toLong(ytdAgg, 0));
        long ytdFailed = Math.max(0L, toLong(ytdAgg, 1));
        long ytdTotal = Math.max(0L, toLong(ytdAgg, 2));

        log.info("Dashboard stats updated (non-stacking) - userId: {}, daily(sent={},failed={},total={}), ytd(sent={},failed={},total={})",
            queue.getUserId(), dailySent, dailyFailed, dailyTotal, ytdSent, ytdFailed, ytdTotal);
    }

    public Map<String, Object> getDashboardStats(Long userId) {
        backfillStatsFromCampaignQueueIfNeeded(userId);
        cleanupExpiredDailyStats();

        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime nextDayStart = dayStart.plusDays(1);

        long dailyBucketQueueId = buildDailyBucketQueueId(userId, dayStart.toLocalDate());
        CampaignStatsDaily todayBucket = dailyRepository.findByUserIdAndQueueId(userId, dailyBucketQueueId).orElse(null);

        long dailySent = todayBucket != null ? safeInt(todayBucket.getSentCount()) : 0;
        long dailyFailed = todayBucket != null ? safeInt(todayBucket.getFailedCount()) : 0;
        long dailyTotal = todayBucket != null ? safeInt(todayBucket.getTotalCount()) : 0;

        // Fallback when today's bucket is missing.
        if (todayBucket == null) {
            Object[] queueDaily = campaignQueueRepository.sumCompletedOutcomesSince(userId, dayStart);
            dailySent = toLong(queueDaily, 0);
            dailyFailed = toLong(queueDaily, 1);
            dailyTotal = toLong(queueDaily, 2);
            if (dailyTotal > 0) {
                upsertDailyBucket(userId, dailyBucketQueueId, (int) dailySent, (int) dailyFailed, (int) dailyTotal, LocalDateTime.now(), nextDayStart);
            }
        } else if (dailyTotal <= 0) {
            // If cleared earlier today, only include outcomes completed after clear marker.
            LocalDateTime marker = todayBucket.getRecordedAt() != null ? todayBucket.getRecordedAt() : dayStart;
            Object[] queueDailyAfterMarker = campaignQueueRepository.sumCompletedOutcomesSince(userId, marker);
            long afterSent = toLong(queueDailyAfterMarker, 0);
            long afterFailed = toLong(queueDailyAfterMarker, 1);
            long afterTotal = toLong(queueDailyAfterMarker, 2);
            if (afterTotal > 0) {
                dailySent = afterSent;
                dailyFailed = afterFailed;
                dailyTotal = afterTotal;
                upsertDailyBucket(userId, dailyBucketQueueId, (int) dailySent, (int) dailyFailed, (int) dailyTotal, LocalDateTime.now(), nextDayStart);
            }
        }

        CampaignStatsYearly currentYearBucket = yearlyRepository.findByUserIdAndStatYear(userId, currentYear).orElse(null);
        Object[] ytdAgg = yearlyRepository.sumAllYearsByUser(userId);
        long ytdSent = Math.max(0L, toLong(ytdAgg, 0));
        long ytdFailed = Math.max(0L, toLong(ytdAgg, 1));
        long ytdTotal = Math.max(0L, toLong(ytdAgg, 2));

        // Fallback when yearly bucket is missing.
        if (currentYearBucket == null) {
            Object[] queueAll = campaignQueueRepository.sumAllCompletedOutcomes(userId);
            ytdSent = toLong(queueAll, 0);
            ytdFailed = toLong(queueAll, 1);
            ytdTotal = toLong(queueAll, 2);

            if (ytdTotal <= 0) {
                Object[] queueAllAnyStatus = campaignQueueRepository.sumAllCompletedOutcomesAnyStatus(userId);
                ytdSent = toLong(queueAllAnyStatus, 0);
                ytdFailed = toLong(queueAllAnyStatus, 1);
                ytdTotal = toLong(queueAllAnyStatus, 2);
            }
            if (ytdTotal > 0) {
                upsertYearlyBucket(userId, currentYear, ytdSent, ytdFailed, ytdTotal);
            }
        } else if (ytdTotal <= 0) {
            // If cleared, only rebuild from outcomes completed after clear marker.
            LocalDateTime marker = currentYearBucket.getUpdatedAt() != null
                    ? currentYearBucket.getUpdatedAt()
                    : LocalDate.of(currentYear, 1, 1).atStartOfDay();
            Object[] queueAllAfterMarker = campaignQueueRepository.sumAllCompletedOutcomesAnyStatusSince(userId, marker);
            long afterSent = toLong(queueAllAfterMarker, 0);
            long afterFailed = toLong(queueAllAfterMarker, 1);
            long afterTotal = toLong(queueAllAfterMarker, 2);
            if (afterTotal > 0) {
                upsertYearlyBucket(userId, currentYear, afterSent, afterFailed, afterTotal);
                Object[] rebuilt = yearlyRepository.sumAllYearsByUser(userId);
                ytdSent = Math.max(0L, toLong(rebuilt, 0));
                ytdFailed = Math.max(0L, toLong(rebuilt, 1));
                ytdTotal = Math.max(0L, toLong(rebuilt, 2));
            }
        }

        // Safety invariant: lifetime (YTD) can never be lower than today's persisted totals.
        // This heals transient yearly bucket misses observed right after completion.
        if (ytdTotal < dailyTotal || ytdSent < dailySent || ytdFailed < dailyFailed) {
            ytdSent = Math.max(ytdSent, dailySent);
            ytdFailed = Math.max(ytdFailed, dailyFailed);
            ytdTotal = Math.max(ytdTotal, dailyTotal);
            upsertYearlyBucket(userId, currentYear, ytdSent, ytdFailed, ytdTotal);
        }

        CampaignQueue runningQueue = campaignQueueRepository
                .findFirstByUserIdAndStatusInOrderByStartedAtDesc(
                        userId,
                        Arrays.asList("PROCESSING", "PAUSED", "RUNNING", "IN_PROGRESS", "REPROCESSING")
                )
                .orElse(null);

        Map<String, Object> response = new HashMap<>();

        Map<String, Object> daily = new HashMap<>();
        daily.put("sent", dailySent);
        daily.put("failed", dailyFailed);
        daily.put("total", dailyTotal);
        daily.put("successRate", rate(dailySent, dailyTotal));
        response.put("daily", daily);

        Map<String, Object> ytd = new HashMap<>();
        ytd.put("sent", ytdSent);
        ytd.put("failed", ytdFailed);
        ytd.put("total", ytdTotal);
        ytd.put("successRate", rate(ytdSent, ytdTotal));
        response.put("ytd", ytd);

        if (runningQueue != null) {
            Map<String, Object> running = new HashMap<>();
            running.put("queueId", runningQueue.getId());
            running.put("csvUploadId", runningQueue.getCsvUploadId());
            running.put("status", runningQueue.getStatus());
            running.put("processed", safeInt(runningQueue.getProcessedRecipients()));
            running.put("sent", safeInt(runningQueue.getSentRecipients()));
            running.put("failed", safeInt(runningQueue.getFailedRecipients()));
            running.put("total", safeInt(runningQueue.getTotalRecipients()));
            response.put("running", running);
        } else {
            response.put("running", null);
        }

        return response;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void backfillStatsFromCampaignQueueIfNeeded(Long userId) {
        try {
            LocalDateTime dayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
            int currentYear = LocalDate.now().getYear();
            long dailyBucketQueueId = buildDailyBucketQueueId(userId, dayStart.toLocalDate());

            CampaignStatsDaily dailyBucket = dailyRepository.findByUserIdAndQueueId(userId, dailyBucketQueueId).orElse(null);
            CampaignStatsYearly ytdBucket = yearlyRepository.findByUserIdAndStatYear(userId, currentYear).orElse(null);

            // If both buckets exist, treat stats as initialized (including intentionally cleared zero buckets).
            if (dailyBucket != null && ytdBucket != null) {
                return;
            }

            var outcomes = campaignQueueRepository.findByUserIdAndStatusInAndCompletedAtIsNotNull(
                    userId,
                    Arrays.asList("COMPLETED", "FAILED")
            );

            if (outcomes == null || outcomes.isEmpty()) {
                return;
            }

            int restored = 0;
            for (CampaignQueue queue : outcomes) {
                if (queue == null || queue.getId() == null) {
                    continue;
                }
                int total = safeInt(queue.getProcessedRecipients());
                if (total <= 0) {
                    continue;
                }
                recordCampaignOutcome(queue);
                restored++;
            }

            if (restored > 0) {
                log.warn("Backfilled dashboard stats from campaign_queue - userId: {}, campaigns: {}", userId, restored);
            }
        } catch (Exception ex) {
            log.warn("Failed backfilling dashboard stats for user {}: {}", userId, ex.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Map<String, Object> clearDashboardStatsForUser(Long userId) {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime nextDayStart = today.plusDays(1).atStartOfDay();

        long deletedDaily = dailyRepository.deleteByUserId(userId);
        long deletedYtd = yearlyRepository.deleteByUserId(userId);

        // Write explicit zero buckets so clear action remains stable and does not auto-backfill old outcomes.
        long dailyBucketQueueId = buildDailyBucketQueueId(userId, today);
        upsertDailyBucket(userId, dailyBucketQueueId, 0, 0, 0, now, nextDayStart);
        upsertYearlyBucket(userId, currentYear, 0L, 0L, 0L);

        Map<String, Object> result = new HashMap<>();
        result.put("deletedDailyRows", deletedDaily);
        result.put("deletedYtdRows", deletedYtd);
        result.put("deletedTotalRows", deletedDaily + deletedYtd);
        return result;
    }

    private void cleanupExpiredDailyStats() {
        try {
            LocalDateTime dayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
            dailyRepository.deleteByRecordedAtBefore(dayStart);
        } catch (Exception ex) {
            log.warn("Failed cleaning expired daily stats: {}", ex.getMessage());
        }
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private int rate(long success, long total) {
        if (total <= 0) {
            return 0;
        }
        return (int) Math.round((success * 100.0) / total);
    }

    private long toLong(Object[] arr, int idx) {
        if (arr == null || arr.length <= idx || arr[idx] == null) {
            return 0L;
        }
        Object value = arr[idx];
        if (value instanceof Number num) {
            return num.longValue();
        }
        return 0L;
    }

    private long buildDailyBucketQueueId(Long userId, LocalDate day) {
        long yyyymmdd = day.getYear() * 10000L + (day.getMonthValue() * 100L) + day.getDayOfMonth();
        return (userId * 100_000_000L) + yyyymmdd;
    }

    private void upsertDailyBucket(Long userId,
                                   long queueId,
                                   int sent,
                                   int failed,
                                   int total,
                                   LocalDateTime recordedAt,
                                   LocalDateTime expiresAt) {
        CampaignStatsDaily bucket = dailyRepository.findByQueueId(queueId)
                .orElseGet(() -> CampaignStatsDaily.builder()
                        .userId(userId)
                        .queueId(queueId)
                        .build());

        bucket.setUserId(userId);
        bucket.setSentCount(sent);
        bucket.setFailedCount(failed);
        bucket.setTotalCount(total);
        bucket.setRecordedAt(recordedAt);
        bucket.setExpiresAt(expiresAt);

        try {
            dailyRepository.saveAndFlush(bucket);
        } catch (DataIntegrityViolationException race) {
            // Concurrent insert won the race; load existing row and update it.
            CampaignStatsDaily existing = dailyRepository.findByQueueId(queueId)
                    .orElseThrow(() -> race);
            existing.setUserId(userId);
            existing.setSentCount(sent);
            existing.setFailedCount(failed);
            existing.setTotalCount(total);
            existing.setRecordedAt(recordedAt);
            existing.setExpiresAt(expiresAt);
            dailyRepository.saveAndFlush(existing);
        }
    }

    private void upsertYearlyBucket(Long userId,
                                    int statYear,
                                    long sent,
                                    long failed,
                                    long total) {
        CampaignStatsYearly bucket = yearlyRepository.findByUserIdAndStatYear(userId, statYear)
                .orElseGet(() -> CampaignStatsYearly.builder()
                        .userId(userId)
                        .statYear(statYear)
                        .build());

        bucket.setSentCount(sent);
        bucket.setFailedCount(failed);
        bucket.setTotalCount(total);

        try {
            yearlyRepository.saveAndFlush(bucket);
        } catch (DataIntegrityViolationException race) {
            CampaignStatsYearly existing = yearlyRepository.findByUserIdAndStatYear(userId, statYear)
                    .orElseThrow(() -> race);
            existing.setSentCount(sent);
            existing.setFailedCount(failed);
            existing.setTotalCount(total);
            yearlyRepository.saveAndFlush(existing);
        }
    }
}
