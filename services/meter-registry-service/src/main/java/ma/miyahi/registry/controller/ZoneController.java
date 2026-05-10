package ma.miyahi.registry.controller;

import ma.miyahi.registry.model.Zone;
import ma.miyahi.registry.repository.ZoneRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/zones")
public class ZoneController {

    private final ZoneRepository repository;

    public ZoneController(ZoneRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Zone> listAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Zone> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Zone create(@RequestBody Zone zone) {
        zone.setCreatedAt(Instant.now());
        return repository.save(zone);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Zone> update(@PathVariable UUID id, @RequestBody Zone updates) {
        return repository.findById(id).map(zone -> {
            if (updates.getName() != null) zone.setName(updates.getName());
            if (updates.getDescription() != null) zone.setDescription(updates.getDescription());
            return ResponseEntity.ok(repository.save(zone));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
