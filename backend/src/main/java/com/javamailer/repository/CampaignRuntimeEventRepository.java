package com.javamailer.repository;

import com.javamailer.entity.CampaignRuntimeEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CampaignRuntimeEventRepository extends JpaRepository<CampaignRuntimeEvent, Long> {

    List<CampaignRuntimeEvent> findByQueueIdAndSeqGreaterThanOrderBySeqAsc(Long queueId, Long seq, Pageable pageable);

    List<CampaignRuntimeEvent> findByUserIdAndQueueIdOrderBySeqAsc(Long userId, Long queueId, Pageable pageable);

    List<CampaignRuntimeEvent> findByUserIdOrderByEventTimeAsc(Long userId, Pageable pageable);

    List<CampaignRuntimeEvent> findByUserIdOrderByEventTimeDesc(Long userId, Pageable pageable);

    long deleteByUserId(Long userId);

    long deleteByUserIdAndQueueId(Long userId, Long queueId);

    @Query("SELECT COALESCE(MAX(e.seq), 0) FROM CampaignRuntimeEvent e WHERE e.queueId = :queueId")
    long findMaxSeqByQueueId(@Param("queueId") Long queueId);
}
