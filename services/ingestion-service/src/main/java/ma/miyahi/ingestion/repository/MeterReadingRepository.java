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

    /**
     * Compute consumed volume per meter since a given time.
     * Volume is a cumulative counter, so consumption = MAX(volume) - MIN(volume).
     * Uses native SQL because JPQL aggregates can fail on TimescaleDB hypertables.
     * Returns rows of [meterId, consumedVolume].
     */
    @Query(value = "SELECT m.meter_id, (MAX(m.volume) - MIN(m.volume)) AS consumed " +
                   "FROM meter_readings m WHERE m.time >= :since " +
                   "GROUP BY m.meter_id ORDER BY consumed DESC",
           nativeQuery = true)
    List<Object[]> findVolumeBreakdownSince(@Param("since") Instant since);

    /**
     * Compute volume consumed by a single meter in a time window.
     * Returns a single Double: MAX(volume) - MIN(volume), or null if no data.
     */
    @Query(value = "SELECT (MAX(m.volume) - MIN(m.volume)) " +
                   "FROM meter_readings m " +
                   "WHERE m.meter_id = :meterId AND m.time >= :since",
           nativeQuery = true)
    Double findVolumeConsumed(@Param("meterId") String meterId, @Param("since") Instant since);

    /**
     * Daily volume breakdown for a meter over a period.
     * Returns rows of [date_string, consumed_volume] bucketed by local calendar day.
     */
    @Query(value = "SELECT TO_CHAR(m.time AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, " +
                   "(MAX(m.volume) - MIN(m.volume)) AS consumed " +
                   "FROM meter_readings m " +
                   "WHERE m.meter_id = :meterId AND m.time >= :since " +
                   "GROUP BY day ORDER BY day",
           nativeQuery = true)
    List<Object[]> findDailyVolumes(@Param("meterId") String meterId, @Param("since") Instant since);
}
