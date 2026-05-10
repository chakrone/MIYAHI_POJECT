package ma.miyahi.registry.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "meters")
public class Meter {

    @Id
    @Column(name = "id")
    private String id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "zone_id")
    private UUID zoneId;

    @Column(name = "label")
    private String label;

    @Column(name = "location")
    private String location;

    @Column(name = "status")
    private String status = "active";

    @Column(name = "last_seen")
    private Instant lastSeen;

    @Column(name = "created_at")
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "zone_id", insertable = false, updatable = false)
    private Zone zone;

    public Meter() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getZoneId() { return zoneId; }
    public void setZoneId(UUID zoneId) { this.zoneId = zoneId; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Zone getZone() { return zone; }
}
