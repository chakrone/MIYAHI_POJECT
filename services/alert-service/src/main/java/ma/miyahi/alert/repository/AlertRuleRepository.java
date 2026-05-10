package ma.miyahi.alert.repository;

import ma.miyahi.alert.model.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRuleRepository extends JpaRepository<AlertRule, UUID> {
    List<AlertRule> findByEnabledTrue();
    List<AlertRule> findByMeterId(String meterId);
    List<AlertRule> findByMeterIdAndEnabledTrue(String meterId);
}
