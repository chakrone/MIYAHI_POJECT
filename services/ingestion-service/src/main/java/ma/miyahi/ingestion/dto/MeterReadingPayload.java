package ma.miyahi.ingestion.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

/**
 * DTO matching the JSON payload from the IoT simulator.
 *
 * Example:
 * {
 *   "meter_id": "meter_001",
 *   "timestamp": "2026-05-10T12:27:43.163298+00:00",
 *   "flow_rate_lpm": 12.19,
 *   "pressure_bar": 3.3,
 *   "volume_m3": 1045.0049,
 *   "temperature_c": 16.5,
 *   "status": "ok"
 * }
 */
public class MeterReadingPayload {

    @JsonProperty("meter_id")
    private String meterId;

    @JsonProperty("timestamp")
    private Instant timestamp;

    @JsonProperty("flow_rate_lpm")
    private Double flowRateLpm;

    @JsonProperty("pressure_bar")
    private Double pressureBar;

    @JsonProperty("volume_m3")
    private Double volumeM3;

    @JsonProperty("temperature_c")
    private Double temperatureC;

    @JsonProperty("status")
    private String status;

    // Getters
    public String getMeterId() { return meterId; }
    public Instant getTimestamp() { return timestamp; }
    public Double getFlowRateLpm() { return flowRateLpm; }
    public Double getPressureBar() { return pressureBar; }
    public Double getVolumeM3() { return volumeM3; }
    public Double getTemperatureC() { return temperatureC; }
    public String getStatus() { return status; }

    // Setters
    public void setMeterId(String meterId) { this.meterId = meterId; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    public void setFlowRateLpm(Double flowRateLpm) { this.flowRateLpm = flowRateLpm; }
    public void setPressureBar(Double pressureBar) { this.pressureBar = pressureBar; }
    public void setVolumeM3(Double volumeM3) { this.volumeM3 = volumeM3; }
    public void setTemperatureC(Double temperatureC) { this.temperatureC = temperatureC; }
    public void setStatus(String status) { this.status = status; }

    @Override
    public String toString() {
        return String.format("Payload{meter=%s, flow=%.2f, pressure=%.2f, vol=%.4f, temp=%.1f, status=%s}",
                meterId, flowRateLpm, pressureBar, volumeM3, temperatureC, status);
    }
}
