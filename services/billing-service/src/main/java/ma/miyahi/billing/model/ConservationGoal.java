package ma.miyahi.billing.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "conservation_goals")
public class ConservationGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "target_percent", nullable = false)
    private Double targetPercent;

    @Column(name = "baseline_month", nullable = false)
    private LocalDate baselineMonth;

    @Column(name = "active")
    private Boolean active = true;

    @Column(name = "created_at")
    private Instant createdAt;

    public ConservationGoal() {}

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public Double getTargetPercent() { return targetPercent; }
    public void setTargetPercent(Double targetPercent) { this.targetPercent = targetPercent; }
    public LocalDate getBaselineMonth() { return baselineMonth; }
    public void setBaselineMonth(LocalDate baselineMonth) { this.baselineMonth = baselineMonth; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
