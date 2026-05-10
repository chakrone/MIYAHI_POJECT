package ma.miyahi.registry.repository;

import ma.miyahi.registry.model.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.List;

@Repository
public interface ZoneRepository extends JpaRepository<Zone, UUID> {
    List<Zone> findByUserId(UUID userId);
}
