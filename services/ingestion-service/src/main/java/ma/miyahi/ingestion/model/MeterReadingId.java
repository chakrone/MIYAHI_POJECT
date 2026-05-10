package ma.miyahi.ingestion.model;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * Composite primary key for MeterReading (time + meter_id).
 */
public class MeterReadingId implements Serializable {

    private Instant time;
    private String meterId;

    public MeterReadingId() {}

    public MeterReadingId(Instant time, String meterId) {
        this.time = time;
        this.meterId = meterId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        MeterReadingId that = (MeterReadingId) o;
        return Objects.equals(time, that.time) && Objects.equals(meterId, that.meterId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(time, meterId);
    }
}
