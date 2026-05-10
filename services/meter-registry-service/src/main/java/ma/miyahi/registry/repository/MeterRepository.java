package ma.miyahi.registry.repository;

import ma.miyahi.registry.model.Meter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MeterRepository extends JpaRepository<Meter, String> {
    List<Meter> findByStatus(String status);
    List<Meter> findByZoneId(java.util.UUID zoneId);
    List<Meter> findByUserId(java.util.UUID userId);
}
