package ma.miyahi.ingestion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.miyahi.ingestion.dto.MeterReadingPayload;
import ma.miyahi.ingestion.model.MeterReading;
import ma.miyahi.ingestion.repository.MeterReadingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Core ingestion handler: receives MQTT messages, persists to TimescaleDB,
 * and publishes events to Redis Streams for downstream consumers.
 */
@Service
public class IngestionHandler {

    private static final Logger log = LoggerFactory.getLogger(IngestionHandler.class);
    private static final String REDIS_STREAM = "meter-readings-stream";
    private static final String DEAD_LETTER_STREAM = "dead-letter-stream";

    private final ObjectMapper objectMapper;
    private final MeterReadingRepository repository;
    private final StringRedisTemplate redisTemplate;

    private long messagesProcessed = 0;
    private long messagesDropped = 0;

    public IngestionHandler(ObjectMapper objectMapper,
                            MeterReadingRepository repository,
                            StringRedisTemplate redisTemplate) {
        this.objectMapper = objectMapper;
        this.repository = repository;
        this.redisTemplate = redisTemplate;
    }

    /**
     * Handles incoming MQTT messages from the mqttInputChannel.
     * This is the main ingestion pipeline:
     *   1. Parse JSON payload
     *   2. Validate fields
     *   3. Persist to TimescaleDB
     *   4. Publish to Redis Stream
     *
     * Malformed or unparseable messages are routed to a dead-letter stream
     * for later inspection (Phase 6 error handling).
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMessage(Message<?> message) {
        String payload = message.getPayload().toString();
        String topic = (String) message.getHeaders().get("mqtt_receivedTopic");

        try {
            // 1. Parse JSON
            MeterReadingPayload dto = objectMapper.readValue(payload, MeterReadingPayload.class);

            // 2. Basic validation
            if (dto.getMeterId() == null || dto.getTimestamp() == null) {
                log.warn("Dropping malformed message (missing meter_id or timestamp): {}", payload);
                publishToDeadLetter(topic, payload, "missing meter_id or timestamp");
                messagesDropped++;
                return;
            }

            // 3. Map to entity and persist (with retry)
            MeterReading reading = new MeterReading(
                    dto.getTimestamp(),
                    dto.getMeterId(),
                    dto.getFlowRateLpm(),
                    dto.getPressureBar(),
                    dto.getVolumeM3(),
                    dto.getTemperatureC(),
                    dto.getStatus()
            );
            persistWithRetry(reading, 3);

            // 4. Publish to Redis Stream for downstream consumers
            publishToRedis(dto);

            messagesProcessed++;
            if (messagesProcessed % 50 == 0) {
                log.info("Processed {} messages (dropped: {}), latest: {} from {}",
                        messagesProcessed, messagesDropped, dto.getFlowRateLpm(), dto.getMeterId());
            }

        } catch (Exception e) {
            log.error("Failed to process MQTT message from topic {}: {}", topic, e.getMessage());
            publishToDeadLetter(topic, payload, e.getMessage());
            messagesDropped++;
        }
    }

    /**
     * Publishes a reading to Redis Streams for real-time consumers.
     */
    private void publishToRedis(MeterReadingPayload dto) {
        try {
            Map<String, String> fields = new HashMap<>();
            fields.put("meter_id", dto.getMeterId());
            fields.put("timestamp", dto.getTimestamp().toString());
            fields.put("flow_rate", String.valueOf(dto.getFlowRateLpm()));
            fields.put("pressure", String.valueOf(dto.getPressureBar()));
            fields.put("volume", String.valueOf(dto.getVolumeM3()));
            fields.put("temperature", String.valueOf(dto.getTemperatureC()));
            fields.put("status", dto.getStatus());

            RecordId recordId = redisTemplate.opsForStream()
                    .add(REDIS_STREAM, fields);

            log.debug("Published to Redis Stream {}: {}", REDIS_STREAM, recordId);
        } catch (Exception e) {
            log.warn("Failed to publish to Redis Stream: {}", e.getMessage());
            // Don't fail the entire pipeline if Redis is temporarily unavailable
        }
    }

    /**
     * Persists a meter reading to TimescaleDB with retry logic.
     * Retries up to maxRetries times with exponential backoff.
     */
    private void persistWithRetry(MeterReading reading, int maxRetries) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                repository.save(reading);
                return;
            } catch (Exception e) {
                if (attempt == maxRetries) {
                    log.error("Failed to persist reading after {} attempts: {}", maxRetries, e.getMessage());
                    throw e;
                }
                log.warn("Persist attempt {}/{} failed, retrying in {}ms: {}",
                        attempt, maxRetries, attempt * 500L, e.getMessage());
                try {
                    Thread.sleep(attempt * 500L);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Retry interrupted", ie);
                }
            }
        }
    }

    /**
     * Routes malformed or failed messages to a Redis dead-letter stream
     * for later inspection and potential reprocessing.
     */
    private void publishToDeadLetter(String topic, String payload, String reason) {
        try {
            Map<String, String> fields = new HashMap<>();
            fields.put("original_topic", topic != null ? topic : "unknown");
            fields.put("payload", payload);
            fields.put("error_reason", reason != null ? reason : "unknown");
            fields.put("timestamp", java.time.Instant.now().toString());

            redisTemplate.opsForStream().add(DEAD_LETTER_STREAM, fields);
            log.debug("Published to dead-letter stream: topic={}, reason={}", topic, reason);
        } catch (Exception e) {
            log.warn("Failed to publish to dead-letter stream: {}", e.getMessage());
        }
    }

    public long getMessagesProcessed() { return messagesProcessed; }
    public long getMessagesDropped() { return messagesDropped; }
}
