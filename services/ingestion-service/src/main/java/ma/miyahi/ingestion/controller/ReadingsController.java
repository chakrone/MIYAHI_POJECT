package ma.miyahi.ingestion.controller;

import ma.miyahi.ingestion.model.MeterReading;
import ma.miyahi.ingestion.repository.MeterReadingRepository;
import ma.miyahi.ingestion.service.IngestionHandler;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST API for querying ingested meter readings.
 * These endpoints are consumed by the React dashboard via the API Gateway.
 */
@RestController
@RequestMapping("/api/readings")
public class ReadingsController {

    private final MeterReadingRepository repository;
    private final IngestionHandler ingestionHandler;

    public ReadingsController(MeterReadingRepository repository, IngestionHandler ingestionHandler) {
        this.repository = repository;
        this.ingestionHandler = ingestionHandler;
    }

    /**
     * GET /api/readings/meters — List all meter IDs that have reported data.
     */
    @GetMapping("/meters")
    public ResponseEntity<List<String>> listMeters() {
        return ResponseEntity.ok(repository.findDistinctMeterIds());
    }

    /**
     * GET /api/readings/{meterId}/latest — Most recent reading for a meter.
     */
    @GetMapping("/{meterId}/latest")
    public ResponseEntity<MeterReading> getLatest(@PathVariable String meterId) {
        return repository.findTopByMeterIdOrderByTimeDesc(meterId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/readings/{meterId}?range=1h — Readings within a time range.
     * Supported ranges: 5m, 15m, 30m, 1h, 6h, 24h, 7d, 30d
     */
    @GetMapping("/{meterId}")
    public ResponseEntity<List<MeterReading>> getReadings(
            @PathVariable String meterId,
            @RequestParam(defaultValue = "1h") String range) {

        Duration duration = parseDuration(range);
        Instant since = Instant.now().minus(duration);

        List<MeterReading> readings = repository.findRecentReadings(meterId, since);
        return ResponseEntity.ok(readings);
    }

    /**
     * GET /api/readings/stats — Ingestion pipeline health stats.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("messages_processed", ingestionHandler.getMessagesProcessed());
        stats.put("messages_dropped", ingestionHandler.getMessagesDropped());
        stats.put("active_meters", repository.findDistinctMeterIds().size());
        return ResponseEntity.ok(stats);
    }

    /** Friendly labels for known meter IDs — mirrors simulator config. */
    private static final Map<String, String> METER_LABELS = Map.of(
            "meter_001", "Main Meter",
            "meter_002", "Kitchen Meter",
            "meter_003", "Garden Meter",
            "meter_004", "Bathroom Meter",
            "meter_005", "Pool Meter"
    );

    /**
     * GET /api/readings/breakdown?range=24h — Volume breakdown across all meters.
     * Returns each meter's volume and percentage of the total.
     */
    @GetMapping("/breakdown")
    public ResponseEntity<List<Map<String, Object>>> getBreakdown(
            @RequestParam(defaultValue = "24h") String range) {

        Duration duration = parseDuration(range);
        Instant since = Instant.now().minus(duration);

        List<Object[]> rows = repository.findVolumeBreakdownSince(since);

        // Compute total volume
        double totalVolume = 0;
        for (Object[] row : rows) {
            totalVolume += ((Number) row[1]).doubleValue();
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            String meterId = (String) row[0];
            double volume = ((Number) row[1]).doubleValue();
            double pct = totalVolume > 0 ? Math.round(volume / totalVolume * 1000.0) / 10.0 : 0;

            Map<String, Object> entry = new HashMap<>();
            entry.put("meterId", meterId);
            entry.put("label", METER_LABELS.getOrDefault(meterId, meterId));
            entry.put("volume", Math.round(volume * 1000.0) / 1000.0);
            entry.put("pct", pct);
            result.add(entry);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/readings/{meterId}/volume?range=24h — Volume consumed by a meter in a time window.
     * Returns a lightweight JSON object instead of downloading all raw readings.
     */
    @GetMapping("/{meterId}/volume")
    public ResponseEntity<Map<String, Object>> getVolumeConsumed(
            @PathVariable String meterId,
            @RequestParam(defaultValue = "24h") String range) {

        Duration duration = parseDuration(range);
        Instant since = Instant.now().minus(duration);

        Double consumed = repository.findVolumeConsumed(meterId, since);

        Map<String, Object> result = new HashMap<>();
        result.put("meterId", meterId);
        result.put("range", range);
        result.put("volumeM3", consumed != null ? Math.round(consumed * 10000.0) / 10000.0 : 0.0);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/readings/{meterId}/daily?range=7d — Daily volume consumption.
     * Returns an array of {date, volumeM3} objects, one per day.
     */
    @GetMapping("/{meterId}/daily")
    public ResponseEntity<List<Map<String, Object>>> getDailyVolumes(
            @PathVariable String meterId,
            @RequestParam(defaultValue = "7d") String range) {

        Duration duration = parseDuration(range);
        Instant since = Instant.now().minus(duration);

        List<Object[]> rows = repository.findDailyVolumes(meterId, since);

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", (String) row[0]);
            entry.put("volumeM3", Math.round(((Number) row[1]).doubleValue() * 10000.0) / 10000.0);
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Parse human-readable duration strings like "5m", "1h", "7d".
     */
    private Duration parseDuration(String range) {
        if (range == null || range.isEmpty()) return Duration.ofHours(1);

        String value = range.substring(0, range.length() - 1);
        char unit = range.charAt(range.length() - 1);

        try {
            long amount = Long.parseLong(value);
            return switch (unit) {
                case 'm' -> Duration.ofMinutes(amount);
                case 'h' -> Duration.ofHours(amount);
                case 'd' -> Duration.ofDays(amount);
                default -> Duration.ofHours(1);
            };
        } catch (NumberFormatException e) {
            return Duration.ofHours(1);
        }
    }
}
