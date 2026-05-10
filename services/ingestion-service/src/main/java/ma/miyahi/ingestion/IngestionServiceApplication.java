package ma.miyahi.ingestion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * MIYAHI Ingestion Service
 *
 * Subscribes to MQTT topics (meters/+/data), parses JSON readings,
 * persists them to TimescaleDB, and publishes events to Redis Streams
 * for downstream consumers (anomaly detection, alert service).
 */
@SpringBootApplication
public class IngestionServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(IngestionServiceApplication.class, args);
    }
}
