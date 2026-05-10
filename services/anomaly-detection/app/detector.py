"""
Detection engines: Rolling Z-score and Isolation Forest.
"""
import numpy as np
from collections import defaultdict, deque
from sklearn.ensemble import IsolationForest
from app.config import (
    ZSCORE_WINDOW, ZSCORE_THRESHOLD,
    ISOLATION_CONTAMINATION, ISOLATION_RETRAIN
)


class RollingZScore:
    """Fast online Z-score anomaly detection per meter + metric."""

    def __init__(self, window: int = ZSCORE_WINDOW, threshold: float = ZSCORE_THRESHOLD):
        self.window = window
        self.threshold = threshold
        # {meter_id: {metric: deque([...])}}
        self._buffers: dict[str, dict[str, deque]] = defaultdict(
            lambda: defaultdict(lambda: deque(maxlen=window))
        )

    def check(self, meter_id: str, metric: str, value: float) -> tuple[bool, float]:
        """Returns (is_anomaly, z_score)."""
        buf = self._buffers[meter_id][metric]
        buf.append(value)

        if len(buf) < 5:
            return False, 0.0

        arr = np.array(buf)
        mean = arr.mean()
        std = arr.std()
        if std < 1e-9:
            return False, 0.0

        z = abs((value - mean) / std)
        return z > self.threshold, round(z, 3)


class IsolationForestDetector:
    """
    Batch-retrained Isolation Forest per meter.
    Uses flow_rate + pressure + temperature as features.
    """

    def __init__(self, contamination: float = ISOLATION_CONTAMINATION,
                 retrain_every: int = ISOLATION_RETRAIN):
        self.contamination = contamination
        self.retrain_every = retrain_every
        self._models: dict[str, IsolationForest] = {}
        self._buffers: dict[str, list] = defaultdict(list)
        self._counts: dict[str, int] = defaultdict(int)

    def feed(self, meter_id: str, flow: float, pressure: float, temp: float) -> tuple[bool, float]:
        """Feed a reading and return (is_anomaly, anomaly_score)."""
        features = [flow, pressure, temp]
        self._buffers[meter_id].append(features)
        self._counts[meter_id] += 1

        # Only retrain periodically and when we have enough data
        if (self._counts[meter_id] % self.retrain_every == 0
                and len(self._buffers[meter_id]) >= 50):
            self._train(meter_id)

        model = self._models.get(meter_id)
        if model is None:
            return False, 0.0

        X = np.array([features])
        pred = model.predict(X)
        score = model.decision_function(X)[0]
        return pred[0] == -1, round(float(score), 4)

    def _train(self, meter_id: str):
        X = np.array(self._buffers[meter_id])
        model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100
        )
        model.fit(X)
        self._models[meter_id] = model
        # Keep only last N readings to limit memory
        if len(self._buffers[meter_id]) > self.retrain_every * 3:
            self._buffers[meter_id] = self._buffers[meter_id][-self.retrain_every * 2:]
