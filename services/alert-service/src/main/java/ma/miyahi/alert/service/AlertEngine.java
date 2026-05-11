package ma.miyahi.alert.service;

import ma.miyahi.alert.model.Alert;
import ma.miyahi.alert.model.AlertRule;
import ma.miyahi.alert.repository.AlertRepository;
import ma.miyahi.alert.repository.AlertRuleRepository;
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

/**
 * Consumes meter readings from the Redis Stream and evaluates alert rules.
 * Uses a simple consumer group pattern for reliable processing.
 */
@Service
public class AlertEngine {

    private static final Logger log = LoggerFactory.getLogger(AlertEngine.class);
    private static final String STREAM_KEY = "meter-readings-stream";
    private static final String GROUP_NAME = "alert-service-group";
    private static final String CONSUMER_NAME = "alert-consumer-1";

    private final StringRedisTemplate redisTemplate;
    private final AlertRuleRepository ruleRepository;
    private final AlertRepository alertRepository;
    private boolean groupCreated = false;

    public AlertEngine(StringRedisTemplate redisTemplate,
                       AlertRuleRepository ruleRepository,
                       AlertRepository alertRepository) {
        this.redisTemplate = redisTemplate;
        this.ruleRepository = ruleRepository;
        this.alertRepository = alertRepository;
    }

    /**
     * Polls the Redis Stream every 2 seconds for new meter readings,
     * evaluates active alert rules, and persists triggered alerts.
     */
    @SuppressWarnings("unchecked")
    @Scheduled(fixedDelay = 2000)
    public void processReadings() {
        try {
            ensureConsumerGroup();

            List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream().read(
                    Consumer.from(GROUP_NAME, CONSUMER_NAME),
                    StreamReadOptions.empty().count(100).block(Duration.ofMillis(500)),
                    StreamOffset.create(STREAM_KEY, ReadOffset.lastConsumed())
            );

            if (records == null || records.isEmpty()) return;

            List<AlertRule> activeRules = ruleRepository.findByEnabledTrue();
            if (activeRules.isEmpty()) {
                // ACK all records even if no rules exist
                records.forEach(r -> redisTemplate.opsForStream().acknowledge(STREAM_KEY, GROUP_NAME, r.getId()));
                return;
            }

            for (MapRecord<String, Object, Object> record : records) {
                Map<Object, Object> fields = record.getValue();
                String meterId = String.valueOf(fields.get("meter_id"));

                for (AlertRule rule : activeRules) {
                    if (rule.getMeterId() != null && !rule.getMeterId().equals(meterId)) {
                        continue; // Rule is for a different meter
                    }

                    Double value = extractMetricValue(fields, rule.getMetric());
                    if (value != null && evaluateCondition(value, rule.getOperator(), rule.getThreshold())) {
                        fireAlert(rule, meterId, value);
                    }
                }

                // Acknowledge the record
                redisTemplate.opsForStream().acknowledge(STREAM_KEY, GROUP_NAME, record.getId());
            }

        } catch (Exception e) {
            log.debug("Alert engine tick: {}", e.getMessage());
        }
    }

    private void ensureConsumerGroup() {
        if (groupCreated) return;
        try {
            redisTemplate.opsForStream().createGroup(STREAM_KEY, ReadOffset.latest(), GROUP_NAME);
            log.info("Created Redis consumer group: {}", GROUP_NAME);
        } catch (Exception e) {
            // Group may already exist, which is fine
            if (e.getMessage() != null && e.getMessage().contains("BUSYGROUP")) {
                log.debug("Consumer group {} already exists", GROUP_NAME);
            }
        }
        groupCreated = true;
    }

    private Double extractMetricValue(Map<Object, Object> fields, String metric) {
        String key = switch (metric) {
            case "flow_rate" -> "flow_rate";
            case "pressure" -> "pressure";
            case "temperature" -> "temperature";
            case "volume" -> "volume";
            default -> null;
        };
        if (key == null || !fields.containsKey(key)) return null;
        try {
            return Double.parseDouble(String.valueOf(fields.get(key)));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean evaluateCondition(Double value, String operator, Double threshold) {
        return switch (operator) {
            case ">" -> value > threshold;
            case "<" -> value < threshold;
            case ">=" -> value >= threshold;
            case "<=" -> value <= threshold;
            case "==" -> Math.abs(value - threshold) < 0.001;
            default -> false;
        };
    }

    private void fireAlert(AlertRule rule, String meterId, Double actualValue) {
        Alert alert = new Alert();
        alert.setMeterId(meterId);
        alert.setType(rule.getMetric());
        alert.setSeverity("warning");
        alert.setMessage(String.format("%s %s %.2f on meter %s (actual: %.2f)",
                rule.getMetric(), rule.getOperator(), rule.getThreshold(), meterId, actualValue));
        alert.setCreatedAt(Instant.now());
        alertRepository.save(alert);

        log.info("ALERT [warning]: {} on {} — value={}, threshold={}",
                rule.getMetric(), meterId, actualValue, rule.getThreshold());
    }
}
