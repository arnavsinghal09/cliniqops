import argparse
import json
import warnings
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report

from features import load_weekly, FEATURES

try:
    from lightgbm import LGBMClassifier
    Classifier = lambda: LGBMClassifier(random_state=42, verbose=-1)
    clf_name = "LGBMClassifier"
except ImportError:
    from sklearn.ensemble import GradientBoostingClassifier
    Classifier = lambda: GradientBoostingClassifier(random_state=42)
    clf_name = "GradientBoostingClassifier"

warnings.filterwarnings("ignore")

MODEL_DIR = Path(__file__).parent / "model"
MODEL_DIR.mkdir(exist_ok=True)

parser = argparse.ArgumentParser()
parser.add_argument("--grain", choices=["week", "day"], default="week",
                    help="Aggregation grain: 'week' = Neighbourhood × ISO week, "
                         "'day' = Neighbourhood × calendar day")
args = parser.parse_args()

# ── 1-3. Load and aggregate ───────────────────────────────────────────────────
print(f"Grain: {args.grain}")
weekly = load_weekly(grain=args.grain)
X = weekly[FEATURES].values

print(f"Aggregated rows : {len(weekly)}")
print(f"Unique clinics  : {weekly['clinic_id'].nunique()}")
print(f"\nFeature head (first 3 rows):")
print(weekly[["clinic_id", "period_key"] + FEATURES].head(3).to_string(index=False))

# ── 4. Label anomalies with IsolationForest ───────────────────────────────────
iso = IsolationForest(contamination=0.1, random_state=42)
weekly["is_anomaly"] = (iso.fit_predict(X) == -1).astype(int)

y = weekly["is_anomaly"].values
n_anomalies = int(y.sum())
counts = np.bincount(y)
print(f"\nClass balance — normal: {counts[0]}  anomaly: {counts[1]}  "
      f"({n_anomalies / len(y):.1%} anomaly rate)")

# ── 5. Fit StandardScaler ─────────────────────────────────────────────────────
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── 6. Train classifier ───────────────────────────────────────────────────────
min_class = int(np.bincount(y).min())
use_stratify = y if min_class >= 2 else None
if use_stratify is None:
    print("Note: too few anomaly samples for stratified split — using random split")

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, stratify=use_stratify, random_state=42
)

print(f"\nUsing: {clf_name}")
print(f"Train: {len(X_train)} rows  |  Test: {len(X_test)} rows")
clf = Classifier()
clf.fit(X_train, y_train)

print(f"model.classes_: {clf.classes_}")
assert len(clf.classes_) == 2, "Model must see both classes — check class balance"

y_pred = clf.predict(X_test)
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["normal", "anomaly"],
                            zero_division=0))

# ── 7. Export artifacts ───────────────────────────────────────────────────────
joblib.dump(clf, MODEL_DIR / "anomaly_model.pkl")
joblib.dump(scaler, MODEL_DIR / "scaler.pkl")
(MODEL_DIR / "feature_names.json").write_text(json.dumps(FEATURES, indent=2))

print(f"Artifacts saved to {MODEL_DIR}/")
print("  anomaly_model.pkl, scaler.pkl, feature_names.json")
