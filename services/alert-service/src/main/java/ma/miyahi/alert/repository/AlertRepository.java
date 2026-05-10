package ma.miyahi.alert.repository;

import ma.miyahi.alert.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {
    List<Alert> findByMeterIdOrderByCreatedAtDesc(String meterId);
    List<Alert> findByAcknowledgedFalseOrderByCreatedAtDesc();
    List<Alert> findTop50ByOrderByCreatedAtDesc();
}
