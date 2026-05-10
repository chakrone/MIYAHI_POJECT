package ma.miyahi.ingestion.repository;

import ma.miyahi.ingestion.model.MeterReading;
import ma.miyahi.ingestion.model.MeterReadingId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Repository for meter_readings hypertable in TimescaleDB.
 */
@Repository
public interface MeterReadingRepository extends JpaRepository<MeterReading, MeterReadingId> {

    /**
     * Find the most recent reading for a given meter.
     */
    Optional<MeterReading> findTopByMeterIdOrderByTimeDesc(String meterId);

    /**
     * Find all readings for a meter within a time range.
     */
    List<MeterReading> findByMeterIdAndTimeBetweenOrderByTimeDesc(
            String meterId, Instant start, Instant end);

    /**
     * Get all distinct meter IDs that have reported data.
     */
    @Query("SELECT DISTINCT m.meterId FROM MeterReading m")
    List<String> findDistinctMeterIds();

    /**
     * Get readings for a meter within the last N minutes.
     */
    @Query("SELECT m FROM MeterReading m WHERE m.meterId = :meterId AND m.time >= :since ORDER BY m.time DESC")
    List<MeterReading> findRecentReadings(@Param("meterId") String meterId, @Param("since") Instant since);
}
