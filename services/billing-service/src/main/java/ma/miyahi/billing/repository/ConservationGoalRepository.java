package ma.miyahi.billing.repository;

import ma.miyahi.billing.model.ConservationGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ConservationGoalRepository extends JpaRepository<ConservationGoal, UUID> {
    List<ConservationGoal> findByUserId(UUID userId);
    List<ConservationGoal> findByActiveTrue();
}
