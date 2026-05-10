package ma.miyahi.alert.controller;

import ma.miyahi.alert.model.Alert;
import ma.miyahi.alert.model.AlertRule;
import ma.miyahi.alert.repository.AlertRepository;
import ma.miyahi.alert.repository.AlertRuleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AlertController {

    private final AlertRepository alertRepository;
    private final AlertRuleRepository ruleRepository;

    public AlertController(AlertRepository alertRepository, AlertRuleRepository ruleRepository) {
        this.alertRepository = alertRepository;
        this.ruleRepository = ruleRepository;
    }

    // ──── Alert Rules CRUD ────

    @GetMapping("/alert-rules")
    public List<AlertRule> listRules() {
        return ruleRepository.findAll();
    }

    @PostMapping("/alert-rules")
    public AlertRule createRule(@RequestBody AlertRule rule) {
        rule.setCreatedAt(Instant.now());
        return ruleRepository.save(rule);
    }

    @PutMapping("/alert-rules/{id}")
    public ResponseEntity<AlertRule> updateRule(@PathVariable UUID id, @RequestBody AlertRule updates) {
        return ruleRepository.findById(id).map(rule -> {
            if (updates.getMetric() != null) rule.setMetric(updates.getMetric());
            if (updates.getOperator() != null) rule.setOperator(updates.getOperator());
            if (updates.getThreshold() != null) rule.setThreshold(updates.getThreshold());
            if (updates.getEnabled() != null) rule.setEnabled(updates.getEnabled());
            return ResponseEntity.ok(ruleRepository.save(rule));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/alert-rules/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable UUID id) {
        if (ruleRepository.existsById(id)) {
            ruleRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    // ──── Fired Alerts ────

    @GetMapping("/alerts")
    public List<Alert> listAlerts(@RequestParam(required = false) Boolean unacknowledged) {
        if (Boolean.TRUE.equals(unacknowledged)) {
            return alertRepository.findByAcknowledgedFalseOrderByCreatedAtDesc();
        }
        return alertRepository.findTop50ByOrderByCreatedAtDesc();
    }

    @GetMapping("/alerts/meter/{meterId}")
    public List<Alert> alertsByMeter(@PathVariable String meterId) {
        return alertRepository.findByMeterIdOrderByCreatedAtDesc(meterId);
    }

    @PutMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Alert> acknowledge(@PathVariable UUID id) {
        return alertRepository.findById(id).map(alert -> {
            alert.setAcknowledged(true);
            return ResponseEntity.ok(alertRepository.save(alert));
        }).orElse(ResponseEntity.notFound().build());
    }
}
