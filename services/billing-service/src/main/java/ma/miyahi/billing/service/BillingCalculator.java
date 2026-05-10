package ma.miyahi.billing.service;

import ma.miyahi.billing.model.BillingConfig;
import ma.miyahi.billing.repository.BillingConfigRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Computes water bill based on tiered pricing configuration.
 * Moroccan tiered pricing:
 *   Tier 1 (0-6 m3):    2.54 MAD/m3
 *   Tier 2 (6-20 m3):   5.96 MAD/m3
 *   Tier 3 (20-35 m3):  8.16 MAD/m3
 *   Tier 4 (35+ m3):   10.98 MAD/m3
 */
@Service
public class BillingCalculator {

    private final BillingConfigRepository configRepository;

    public BillingCalculator(BillingConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    /**
     * Calculate total bill for a given volume consumption.
     * @param region the billing region to look up tiers
     * @param volumeM3 total volume consumed in m3
     * @return breakdown with per-tier costs and total
     */
    public Map<String, Object> calculateBill(String region, double volumeM3) {
        List<BillingConfig> tiers = configRepository.findByRegionOrderByMinM3Asc(region);

        if (tiers.isEmpty()) {
            Map<String, Object> result = new HashMap<>();
            result.put("total", volumeM3 * 5.0);
            result.put("currency", "MAD");
            result.put("volume_m3", volumeM3);
            result.put("note", "Using flat rate — no tiers configured for region: " + region);
            return result;
        }

        double totalCost = 0.0;
        double remainingVolume = volumeM3;
        List<Map<String, Object>> breakdown = new ArrayList<>();

        for (BillingConfig tier : tiers) {
            if (remainingVolume <= 0) break;

            double tierMax = tier.getMaxM3() != null ? tier.getMaxM3() : Double.MAX_VALUE;
            double tierRange = tierMax - tier.getMinM3();
            double volumeInTier = Math.min(remainingVolume, tierRange);

            double tierCost = volumeInTier * tier.getPricePerM3();
            totalCost += tierCost;
            remainingVolume -= volumeInTier;

            Map<String, Object> tierBreakdown = new HashMap<>();
            tierBreakdown.put("tier", tier.getTierName());
            tierBreakdown.put("volume_m3", volumeInTier);
            tierBreakdown.put("rate_per_m3", tier.getPricePerM3());
            tierBreakdown.put("cost", Math.round(tierCost * 100.0) / 100.0);
            breakdown.add(tierBreakdown);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", Math.round(totalCost * 100.0) / 100.0);
        result.put("currency", "MAD");
        result.put("volume_m3", volumeM3);
        result.put("breakdown", breakdown);
        return result;
    }
}
