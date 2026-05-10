package ma.miyahi.registry.controller;

import ma.miyahi.registry.model.Meter;
import ma.miyahi.registry.repository.MeterRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/meters")
public class MeterController {

    private final MeterRepository repository;

    public MeterController(MeterRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Meter> listAll(@RequestParam(required = false) String status) {
        if (status != null) return repository.findByStatus(status);
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Meter> getById(@PathVariable String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Meter create(@RequestBody Meter meter) {
        meter.setCreatedAt(Instant.now());
        return repository.save(meter);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Meter> update(@PathVariable String id, @RequestBody Meter updates) {
        return repository.findById(id).map(meter -> {
            if (updates.getLabel() != null) meter.setLabel(updates.getLabel());
            if (updates.getLocation() != null) meter.setLocation(updates.getLocation());
            if (updates.getStatus() != null) meter.setStatus(updates.getStatus());
            if (updates.getZoneId() != null) meter.setZoneId(updates.getZoneId());
            return ResponseEntity.ok(repository.save(meter));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable String id) {
        return repository.findById(id).map(meter -> {
            meter.setStatus("inactive");
            repository.save(meter);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
