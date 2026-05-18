package ma.miyahi.alert.service;

import ma.miyahi.alert.model.Alert;
import ma.miyahi.alert.repository.AlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class AnomalyConsumer {

    private static final Logger log = LoggerFactory.getLogger(AnomalyConsumer.class);
    private static final String STREAM_KEY = "anomaly-events";
    private static final String GROUP_NAME = "alert-service-anomaly-group";
    private static final String CONSUMER_NAME = "anomaly-consumer-1";

    private final StringRedisTemplate redisTemplate;
    private final AlertRepository alertRepository;
    private boolean groupCreated = false;

    public AnomalyConsumer(StringRedisTemplate redisTemplate, AlertRepository alertRepository) {
        this.redisTemplate = redisTemplate;
        this.alertRepository = alertRepository;
    }

    @SuppressWarnings("unchecked")
    @Scheduled(fixedDelay = 2000)
    public void processAnomalies() {
        try {
            ensureConsumerGroup();

            List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream().read(
                    Consumer.from(GROUP_NAME, CONSUMER_NAME),
                    StreamReadOptions.empty().count(50).block(Duration.ofMillis(500)),
                    StreamOffset.create(STREAM_KEY, ReadOffset.lastConsumed())
            );

            if (records == null || records.isEmpty()) return;

            for (MapRecord<String, Object, Object> record : records) {
                Map<Object, Object> fields = record.getValue();
                
                String meterId = String.valueOf(fields.get("meter_id"));
                String type = String.valueOf(fields.get("anomaly_type"));
                String severity = String.valueOf(fields.get("severity"));
                String description = String.valueOf(fields.get("description"));

                Alert alert = new Alert();
                alert.setMeterId(meterId);
                alert.setType(type);
                alert.setSeverity(severity);
                alert.setMessage("[AI] " + description);
                alert.setCreatedAt(Instant.now());
                alertRepository.save(alert);

                log.info("Persisted Anomaly Alert: {} - {}", meterId, description);

                redisTemplate.opsForStream().acknowledge(STREAM_KEY, GROUP_NAME, record.getId());
            }

        } catch (Exception e) {
            log.debug("Anomaly consumer tick: {}", e.getMessage());
        }
    }

    private void ensureConsumerGroup() {
        if (groupCreated) return;
        try {
            redisTemplate.opsForStream().createGroup(STREAM_KEY, ReadOffset.latest(), GROUP_NAME);
            log.info("Created Redis anomaly consumer group: {}", GROUP_NAME);
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("BUSYGROUP")) {
                log.debug("Consumer group {} already exists", GROUP_NAME);
            }
        }
        groupCreated = true;
    }
}
