package ma.miyahi.billing.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "billing_config")
public class BillingConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "region", nullable = false)
    private String region;

    @Column(name = "tier_name", nullable = false)
    private String tierName;

    @Column(name = "min_m3", nullable = false)
    private Double minM3;

    @Column(name = "max_m3")
    private Double maxM3;

    @Column(name = "price_per_m3", nullable = false)
    private Double pricePerM3;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "created_at")
    private Instant createdAt;

    public BillingConfig() {}

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getTierName() { return tierName; }
    public void setTierName(String tierName) { this.tierName = tierName; }
    public Double getMinM3() { return minM3; }
    public void setMinM3(Double minM3) { this.minM3 = minM3; }
    public Double getMaxM3() { return maxM3; }
    public void setMaxM3(Double maxM3) { this.maxM3 = maxM3; }
    public Double getPricePerM3() { return pricePerM3; }
    public void setPricePerM3(Double pricePerM3) { this.pricePerM3 = pricePerM3; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate effectiveFrom) { this.effectiveFrom = effectiveFrom; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
