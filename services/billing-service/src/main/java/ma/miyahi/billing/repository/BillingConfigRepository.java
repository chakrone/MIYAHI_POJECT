package ma.miyahi.billing.repository;

import ma.miyahi.billing.model.BillingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface BillingConfigRepository extends JpaRepository<BillingConfig, UUID> {
    List<BillingConfig> findByRegionOrderByMinM3Asc(String region);
}
