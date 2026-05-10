package ma.miyahi.billing.controller;

import ma.miyahi.billing.model.BillingConfig;
import ma.miyahi.billing.model.ConservationGoal;
import ma.miyahi.billing.repository.BillingConfigRepository;
import ma.miyahi.billing.repository.ConservationGoalRepository;
import ma.miyahi.billing.service.BillingCalculator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class BillingController {

    private final BillingConfigRepository configRepository;
    private final ConservationGoalRepository goalRepository;
    private final BillingCalculator calculator;

    public BillingController(BillingConfigRepository configRepository,
                             ConservationGoalRepository goalRepository,
                             BillingCalculator calculator) {
        this.configRepository = configRepository;
        this.goalRepository = goalRepository;
        this.calculator = calculator;
    }

    // ──── Billing Config (Tiers) ────

    @GetMapping("/billing/config")
    public List<BillingConfig> listConfigs() {
        return configRepository.findAll();
    }

    @PostMapping("/billing/config")
    public BillingConfig createConfig(@RequestBody BillingConfig config) {
        return configRepository.save(config);
    }

    // ──── Billing Calculation ────

    @GetMapping("/billing/calculate")
    public Map<String, Object> calculateBill(
            @RequestParam(defaultValue = "casablanca") String region,
            @RequestParam double volumeM3) {
        return calculator.calculateBill(region, volumeM3);
    }

    // ──── Conservation Goals ────

    @GetMapping("/goals")
    public List<ConservationGoal> listGoals(@RequestParam(required = false) UUID userId) {
        if (userId != null) return goalRepository.findByUserId(userId);
        return goalRepository.findAll();
    }

    @PostMapping("/goals")
    public ConservationGoal createGoal(@RequestBody ConservationGoal goal) {
        goal.setCreatedAt(Instant.now());
        return goalRepository.save(goal);
    }

    @DeleteMapping("/goals/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable UUID id) {
        if (goalRepository.existsById(id)) {
            goalRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
