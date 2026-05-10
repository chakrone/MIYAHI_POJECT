package ma.miyahi.alert.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alert_rules")
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "meter_id")
    private String meterId;

    @Column(name = "metric", nullable = false)
    private String metric;  // flow_rate, pressure, temperature, volume

    @Column(name = "operator", nullable = false)
    private String operator; // >, <, >=, <=, ==

    @Column(name = "threshold", nullable = false)
    private Double threshold;

    @Column(name = "enabled")
    private Boolean enabled = true;

    @Column(name = "created_at")
    private Instant createdAt;

    public AlertRule() {}

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getMeterId() { return meterId; }
    public void setMeterId(String meterId) { this.meterId = meterId; }
    public String getMetric() { return metric; }
    public void setMetric(String metric) { this.metric = metric; }
    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }
    public Double getThreshold() { return threshold; }
    public void setThreshold(Double threshold) { this.threshold = threshold; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
