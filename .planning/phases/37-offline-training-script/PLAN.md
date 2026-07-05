# Phase 37 Plan: Offline ML Training Script

**Goal:** Create `backend/scripts/train_model.py` — an offline script that reads `sensor_readings` from PostgreSQL, engineers per-asset features (mean/std/max per metric over last 7 days), trains a Scikit-learn Random Forest classifier, and saves the trained model + feature metadata to `backend/model/model.pkl` via joblib.

**Requirements:** AI-02

---

## Plan 37-01: train_model.py script

### Task 37-01-A: Create `backend/model/` directory + `.gitkeep`

The `model/` directory holds the trained pkl artifact. It should be in `.gitignore` for large files but the dir must exist.

### Task 37-01-B: Add scikit-learn + joblib to requirements.txt

```
scikit-learn==1.5.2
joblib==1.4.2
```

joblib is bundled with scikit-learn but pin it explicitly for deterministic installs.

### Task 37-01-C: Write `backend/scripts/train_model.py`

**Feature engineering strategy (per asset_id, last 7 days):**

For each metric in [temperature, humidity, power, current, vibration, running_hours]:
- `{metric}_mean` — mean value
- `{metric}_std` — standard deviation (0 if single reading)
- `{metric}_max` — maximum value

= 18 features total (6 metrics × 3 stats). Missing metrics filled with 0.

**Label strategy (synthetic for demo — no real failure labels in DB):**
Risk label derived deterministically from sensor values:
- "High" if temperature_max > 70 OR running_hours_max > 2800 OR current_max > 10
- "Medium" if temperature_mean > 55 OR running_hours_mean > 1500 OR power_mean > 600
- "Low" otherwise

**Model:** `RandomForestClassifier(n_estimators=100, random_state=42, class_weight="balanced")`

**Output artifact** (`model/model.pkl` via joblib.dump):
```python
{
    "model": trained_classifier,
    "feature_names": ["temperature_mean", "temperature_std", ..., "running_hours_max"],  # 18 items
    "label_classes": ["High", "Low", "Medium"],  # sorted by sklearn
    "trained_at": "2026-07-05T...",
    "training_rows": N,
    "training_assets": M,
}
```

**Script behavior:**
1. Read DATABASE_URL from env (same pattern as sensor_simulator.py)
2. Query sensor_readings for last 7 days grouped by asset_id + metric
3. If < 2 distinct assets found: print warning but still save model (trained on synthetic fallback row)
4. Engineer feature matrix X + labels y
5. Train RandomForestClassifier
6. Save dict artifact to model/model.pkl
7. Print summary: assets, rows, accuracy (cross-val score if ≥ 5 samples)

**Usage:**
```bash
cd backend
python scripts/train_model.py
```

### Verification

```bash
cd backend && python scripts/train_model.py
# Expected: "Model saved to model/model.pkl — N assets, M readings"
python3 -c "import joblib; m = joblib.load('model/model.pkl'); print(m['feature_names']); print('classes:', m['label_classes'])"
```

---

## UAT Criteria

- [ ] `backend/model/` directory exists
- [ ] `scikit-learn` and `joblib` in `requirements.txt`
- [ ] `python scripts/train_model.py` completes without error (even with empty DB)
- [ ] `model/model.pkl` is created and loadable with `joblib.load()`
- [ ] Loaded artifact has keys: `model`, `feature_names`, `label_classes`, `trained_at`, `training_rows`, `training_assets`
- [ ] `feature_names` has exactly 18 entries
- [ ] `model.predict([[...]])` works with 18-feature input

---

## Commit

```
feat(37): add offline Random Forest training script and model directory
```
