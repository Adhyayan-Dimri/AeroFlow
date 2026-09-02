import os
import logging
import numpy as np

logger = logging.getLogger(__name__)
_MODEL = None
_PATH = os.path.join(os.path.dirname(__file__), "models", "baggage_gbr.joblib")

def _load():
    global _MODEL
    if _MODEL is None:
        try:
            import joblib
            loaded = joblib.load(_PATH)
            logger.info("Loaded joblib file, type: %s", type(loaded))
            if isinstance(loaded, dict):
                logger.info("Keys in loaded dict: %s", list(loaded.keys()))
                for key in ["model", "regressor", "estimator", "clf", "predictor"]:
                    if key in loaded:
                        _MODEL = loaded[key]
                        logger.info("Found model in key: %s", key)
                        break
                if _MODEL is None or isinstance(_MODEL, dict):
                    logger.warning("Could not extract model from dict, using fallback")
                    _MODEL = False
            elif hasattr(loaded, 'predict'):
                _MODEL = loaded
                logger.info("Model has predict method, using directly")
            else:
                logger.warning("Loaded object has no predict method, type: %s", type(loaded))
                _MODEL = False
        except Exception as e:
            logger.warning("Baggage model unavailable, using fallback: %s", e)
            _MODEL = False
    return _MODEL

def predict_durations(passengers, luggage_kg, is_international, hour, handler):
    m = _load()
    if not m:
        base = 8 + (2 if is_international else 0)
        return {"first_min": base + 3, "last_min": base + 20, "first_lo": base, "last_hi": base + 26, "source": "fallback"}
    row = {
        "passengers": passengers,
        "luggage_kg": luggage_kg,
        "is_international": 1 if is_international else 0,
        "hour": hour,
        "hour_sin": np.sin(2 * np.pi * hour / 24),
        "hour_cos": np.cos(2 * np.pi * hour / 24),
    }
    handlers = ["AI SATS", "BWFS", "Celebi"]
    for h in handlers:
        row[f"gh_{h}"] = 1 if handler == h else 0

    feature_cols = ["passengers", "luggage_kg", "is_international", "hour", "hour_sin", "hour_cos"] + [f"gh_{h}" for h in handlers]
    X = np.array([[row.get(c, 0) for c in feature_cols]])

    first = float(m.predict(X)[0])
    last = first + max(8, (passengers * 0.72) / 9.0)
    first_lo = max(2, first - 2)
    last_hi = last + 5

    return {"first_min": round(max(3, first), 1), "last_min": round(last, 1),
            "first_lo": round(first_lo, 1), "last_hi": round(last_hi, 1), "source": "gbr"}
