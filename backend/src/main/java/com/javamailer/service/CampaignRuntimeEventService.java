package com.javamailer.service;

import com.javamailer.entity.CampaignQueue;
import com.javamailer.entity.CampaignRuntimeEvent;
import com.javamailer.repository.CampaignQueueRepository;
import com.javamailer.repository.CampaignRuntimeEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Stores lightweight per-campaign runtime events so frontend can show live execution logs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignRuntimeEventService {

    private static final int MAX_EVENTS_PER_QUEUE = 2000;

    public record RuntimeEvent(
            long seq,
            LocalDateTime timestamp,
            String level,
            String message,
            Integer row,
            String recipientEmail,
            Long queueId,
            Long campaignId
    ) {}

        private record QueueMeta(Long userId, Long campaignId) {}

        private final CampaignRuntimeEventRepository campaignRuntimeEventRepository;
        private final CampaignQueueRepository campaignQueueRepository;

    private final Map<Long, List<RuntimeEvent>> eventsByQueue = new ConcurrentHashMap<>();
    private final Map<Long, AtomicLong> seqByQueue = new ConcurrentHashMap<>();
        private final Map<Long, QueueMeta> queueMetaCache = new ConcurrentHashMap<>();

    public void append(Long queueId, String level, String message) {
        append(queueId, level, message, null, null);
    }

    public void append(Long queueId, String level, String message, Integer row, String recipientEmail) {
        if (queueId == null) {
            return;
        }

        List<RuntimeEvent> queueEvents = eventsByQueue.computeIfAbsent(queueId, id -> new ArrayList<>());
        QueueMeta queueMeta = resolveQueueMeta(queueId);
        AtomicLong seqCounter = seqByQueue.computeIfAbsent(
                queueId,
                id -> new AtomicLong(campaignRuntimeEventRepository.findMaxSeqByQueueId(queueId))
        );

        RuntimeEvent event = new RuntimeEvent(
                seqCounter.incrementAndGet(),
                LocalDateTime.now(),
                level,
                message,
                row,
                recipientEmail,
                queueId,
                queueMeta.campaignId()
        );

        try {
            campaignRuntimeEventRepository.save(CampaignRuntimeEvent.builder()
                    .userId(queueMeta.userId())
                    .campaignId(queueMeta.campaignId())
                    .queueId(queueId)
                    .seq(event.seq())
                    .eventTime(event.timestamp())
                    .level(level)
                    .message(message)
                    .row(row)
                    .recipientEmail(recipientEmail)
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to persist runtime event for queue {}: {}", queueId, ex.getMessage());
        }

        synchronized (queueEvents) {
            queueEvents.add(event);
            if (queueEvents.size() > MAX_EVENTS_PER_QUEUE) {
                int trimCount = queueEvents.size() - MAX_EVENTS_PER_QUEUE;
                queueEvents.subList(0, trimCount).clear();
            }
        }
    }

    public List<RuntimeEvent> getEvents(Long queueId, long afterSeq, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 500));

        try {
            List<CampaignRuntimeEvent> persistedEvents = campaignRuntimeEventRepository
                    .findByQueueIdAndSeqGreaterThanOrderBySeqAsc(queueId, afterSeq, PageRequest.of(0, safeLimit));

            if (!persistedEvents.isEmpty()) {
                return persistedEvents.stream().map(this::toRuntimeEvent).toList();
            }
        } catch (Exception ex) {
            log.warn("Failed loading persisted runtime events for queue {}: {}", queueId, ex.getMessage());
        }

        List<RuntimeEvent> queueEvents = eventsByQueue.get(queueId);
        if (queueEvents == null || queueEvents.isEmpty()) {
            return List.of();
        }

        synchronized (queueEvents) {
            return queueEvents.stream()
                    .filter(e -> e.seq() > afterSeq)
                    .sorted(Comparator.comparingLong(RuntimeEvent::seq))
                    .limit(safeLimit)
                    .toList();
        }
    }

    public List<RuntimeEvent> getRecentEventsForUser(Long userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 500));
        return campaignRuntimeEventRepository.findByUserIdOrderByEventTimeDesc(userId, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toRuntimeEvent)
                .sorted(Comparator.comparing(RuntimeEvent::timestamp))
                .toList();
    }

    public List<RuntimeEvent> getEventsForExport(Long userId, Long queueId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 10000));
        if (queueId != null) {
            return campaignRuntimeEventRepository
                    .findByUserIdAndQueueIdOrderBySeqAsc(userId, queueId, PageRequest.of(0, safeLimit))
                    .stream()
                    .map(this::toRuntimeEvent)
                    .toList();
        }

        return campaignRuntimeEventRepository
                .findByUserIdOrderByEventTimeAsc(userId, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toRuntimeEvent)
                .toList();
    }

    @Transactional
    public long clearEventsForUser(Long userId, Long queueId) {
        if (queueId != null) {
            return campaignRuntimeEventRepository.deleteByUserIdAndQueueId(userId, queueId);
        }
        return campaignRuntimeEventRepository.deleteByUserId(userId);
    }

    private QueueMeta resolveQueueMeta(Long queueId) {
        QueueMeta cached = queueMetaCache.get(queueId);
        if (cached != null) {
            return cached;
        }

        CampaignQueue queue = campaignQueueRepository.findById(queueId)
                .orElseThrow(() -> new IllegalArgumentException("Queue not found: " + queueId));
        QueueMeta meta = new QueueMeta(queue.getUserId(), queue.getCampaignId());
        queueMetaCache.put(queueId, meta);
        return meta;
    }

    private RuntimeEvent toRuntimeEvent(CampaignRuntimeEvent event) {
        return new RuntimeEvent(
                event.getSeq(),
                event.getEventTime(),
                event.getLevel(),
                event.getMessage(),
                event.getRow(),
                event.getRecipientEmail(),
                event.getQueueId(),
                event.getCampaignId()
        );
    }
}
