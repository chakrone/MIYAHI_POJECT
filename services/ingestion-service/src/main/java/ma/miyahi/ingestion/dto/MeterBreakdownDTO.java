package ma.miyahi.ingestion.dto;

/**
 * DTO for the meter volume breakdown endpoint.
 * Each entry represents one meter's share of total volume.
 */
public class MeterBreakdownDTO {

    private String meterId;
    private String label;
    private double volume;
    private double pct;

    public MeterBreakdownDTO() {}

    public MeterBreakdownDTO(String meterId, String label, double volume, double pct) {
        this.meterId = meterId;
        this.label = label;
        this.volume = volume;
        this.pct = pct;
    }

    public String getMeterId() { return meterId; }
    public void setMeterId(String meterId) { this.meterId = meterId; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public double getVolume() { return volume; }
    public void setVolume(double volume) { this.volume = volume; }

    public double getPct() { return pct; }
    public void setPct(double pct) { this.pct = pct; }
}
