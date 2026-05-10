package ma.miyahi.ingestion.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity mapping to the TimescaleDB 'meter_readings' hypertable.
 *
 * Uses a composite key of (time, meter_id) since TimescaleDB hypertables
 * don't support auto-increment IDs in the traditional sense.
 */
@Entity
@Table(name = "meter_readings")
@IdClass(MeterReadingId.class)
public class MeterReading {

    @Id
    @Column(name = "time", nullable = false)
    private Instant time;

    @Id
    @Column(name = "meter_id", nullable = false)
    private String meterId;

    @Column(name = "flow_rate")
    private Double flowRate;

    @Column(name = "pressure")
    private Double pressure;

    @Column(name = "volume")
    private Double volume;

    @Column(name = "temperature")
    private Double temperature;

    @Column(name = "status")
    private String status;

    public MeterReading() {}

    public MeterReading(Instant time, String meterId, Double flowRate, Double pressure,
                        Double volume, Double temperature, String status) {
        this.time = time;
        this.meterId = meterId;
        this.flowRate = flowRate;
        this.pressure = pressure;
        this.volume = volume;
        this.temperature = temperature;
        this.status = status;
    }

    // Getters and setters
    public Instant getTime() { return time; }
    public void setTime(Instant time) { this.time = time; }

    public String getMeterId() { return meterId; }
    public void setMeterId(String meterId) { this.meterId = meterId; }

    public Double getFlowRate() { return flowRate; }
    public void setFlowRate(Double flowRate) { this.flowRate = flowRate; }

    public Double getPressure() { return pressure; }
    public void setPressure(Double pressure) { this.pressure = pressure; }

    public Double getVolume() { return volume; }
    public void setVolume(Double volume) { this.volume = volume; }

    public Double getTemperature() { return temperature; }
    public void setTemperature(Double temperature) { this.temperature = temperature; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @Override
    public String toString() {
        return String.format("MeterReading{time=%s, meterId='%s', flowRate=%.2f, pressure=%.2f, volume=%.4f, temp=%.1f, status='%s'}",
                time, meterId, flowRate, pressure, volume, temperature, status);
    }
}
