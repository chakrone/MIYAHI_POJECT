package ma.miyahi.alert.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "meter_id")
    private String meterId;

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "severity", nullable = false)
    private String severity = "info";

    @Column(name = "message")
    private String message;

    @Column(name = "acknowledged")
    private Boolean acknowledged = false;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    public Alert() {}

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getMeterId() { return meterId; }
    public void setMeterId(String meterId) { this.meterId = meterId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Boolean getAcknowledged() { return acknowledged; }
    public void setAcknowledged(Boolean acknowledged) { this.acknowledged = acknowledged; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(Instant acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }
}
