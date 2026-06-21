"""
CliniqOps ML Anomaly Detection — Evaluation Harness

Three benchmarks:
  1. Synthetic anomaly injection  (primary, ground-truth labels)
  2. Baseline comparison          (ML vs. statistical replica of lib/anomaly-detection.ts)
  3. Latency                      (requires FastAPI sidecar on :8000)

Plus: 5-fold CV on IF-labeled data (consistency check only — labels are circular).
"""
import argparse
import json
import statistics
import time
import warnings
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score

from features import FEATURES, load_weekly

warnings.filterwarnings("ignore")

ML_DIR   = Path(__file__).parent
MODEL_DIR = ML_DIR / "model"
RNG = np.random.default_rng(42)

parser = argparse.ArgumentParser()
parser.add_argument("--grain", choices=["week", "day"], default="week")
args = parser.parse_args()

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _divider(title: str) -> None:
    print(f"\n{'═' * 62}")
    print(f"  {title}")
    print('═' * 62)


def _print_table(headers: list, rows: list) -> None:
    col_w = [max(len(str(h)), max((len(str(r[i])) for r in rows), default=0))
             for i, h in enumerate(headers)]
    fmt = "  ".join(f"{{:<{w}}}" for w in col_w)
    print(fmt.format(*headers))
    print("  ".join("-" * w for w in col_w))
    for row in rows:
        print(fmt.format(*row))


# ─────────────────────────────────────────────────────────────────────────────
# Load model artifacts
# ─────────────────────────────────────────────────────────────────────────────

model = joblib.load(MODEL_DIR / "anomaly_model.pkl")
scaler = joblib.load(MODEL_DIR / "scaler.pkl")
feature_names = json.loads((MODEL_DIR / "feature_names.json").read_text())
classes = list(model.classes_)

print(f"Grain            : {args.grain}")
print(f"model.classes_   : {model.classes_}")

# ─────────────────────────────────────────────────────────────────────────────
# Load real aggregated data
# ─────────────────────────────────────────────────────────────────────────────

weekly = load_weekly(grain=args.grain)
X_real = weekly[FEATURES].values

real_mean = X_real.mean(axis=0)
real_std  = X_real.std(axis=0) + 1e-9

print(f"Real rows        : {len(weekly)} "
      f"({weekly['clinic_id'].nunique()} neighbourhoods)")

# ─────────────────────────────────────────────────────────────────────────────
# BENCHMARK 1 — Synthetic Anomaly Injection
# ─────────────────────────────────────────────────────────────────────────────

_divider("BENCHMARK 1 — Synthetic Anomaly Injection (ground-truth labels)")

N_EACH = 300  # 300 normal + 300 anomalous = 600 test samples

feat_idx = {f: i for i, f in enumerate(FEATURES)}

# Normal pool: resample from real distribution + small noise
idx_n = RNG.integers(0, len(X_real), size=N_EACH)
X_normal = X_real[idx_n] + RNG.normal(0, 0.05 * real_std, size=(N_EACH, len(FEATURES)))

# Anomalous pool: inject known perturbations on top of real weeks
idx_a = RNG.integers(0, len(X_real), size=N_EACH)
X_anom = X_real[idx_a].copy()

spike = RNG.uniform(3.0, 5.0, size=N_EACH)
X_anom[:, feat_idx["no_show_rate"]] += spike * real_std[feat_idx["no_show_rate"]]
X_anom[:, feat_idx["no_show_rate"]] = np.clip(
    X_anom[:, feat_idx["no_show_rate"]], 0.0, 1.0)

X_anom[:, feat_idx["avg_lead_time_days"]] += 3.0 * real_std[feat_idx["avg_lead_time_days"]]
X_anom[:, feat_idx["rolling_mean_4w"]] += 3.0 * real_std[feat_idx["rolling_mean_4w"]]
X_anom[:, feat_idx["rolling_mean_4w"]] = np.clip(
    X_anom[:, feat_idx["rolling_mean_4w"]], 0.0, 1.0)

X_test = np.vstack([X_normal, X_anom])
y_test = np.array([0] * N_EACH + [1] * N_EACH)
X_test_scaled = scaler.transform(X_test)

# Predict
y_pred = model.predict(X_test_scaled)
y_pred_01 = np.array([1 if p == 1 else 0 for p in y_pred])

# Anomaly scores from predict_proba (class 1 column)
anomaly_col = classes.index(1)
y_score_ml = model.predict_proba(X_test_scaled)[:, anomaly_col]

# IF proxy score for AUC comparison
iso_proxy = IsolationForest(contamination=0.1, random_state=42)
iso_proxy.fit(X_real)
y_score_if = -iso_proxy.decision_function(X_test_scaled)

ml_prec = precision_score(y_test, y_pred_01, zero_division=0)
ml_rec  = recall_score(y_test, y_pred_01, zero_division=0)
ml_f1   = f1_score(y_test, y_pred_01, zero_division=0)
ml_auc  = roc_auc_score(y_test, y_score_ml)

cm = confusion_matrix(y_test, y_pred_01)

print(f"\nTest set: {len(y_test)} samples  ({N_EACH} normal / {N_EACH} anomalous)")
print(f"\n  Precision : {ml_prec:.3f}")
print(f"  Recall    : {ml_rec:.3f}")
print(f"  F1        : {ml_f1:.3f}")
print(f"  ROC-AUC   : {ml_auc:.3f}")
print(f"\nConfusion matrix (rows=actual, cols=predicted):")
print(f"               pred-normal  pred-anomaly")
print(f"  actual-normal   {cm[0,0]:>5}        {cm[0,1]:>5}")
print(f"  actual-anomaly  {cm[1,0]:>5}        {cm[1,1]:>5}")

print("\nPrecision-Recall table at varying score thresholds:")
pr_rows = []
for thr in [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
    y_thr = (y_score_ml >= thr).astype(int)
    p = precision_score(y_test, y_thr, zero_division=0)
    r = recall_score(y_test, y_thr, zero_division=0)
    f = f1_score(y_test, y_thr, zero_division=0)
    pr_rows.append([f"{thr:.1f}", f"{p:.3f}", f"{r:.3f}", f"{f:.3f}", int(y_thr.sum())])
_print_table(["threshold", "precision", "recall", "f1", "flagged"], pr_rows)

b1_results = dict(
    n_normal=N_EACH, n_anomaly=N_EACH,
    precision=round(float(ml_prec), 4),
    recall=round(float(ml_rec), 4),
    f1=round(float(ml_f1), 4),
    roc_auc=round(float(ml_auc), 4),
    confusion_matrix=cm.tolist(),
)

# ─────────────────────────────────────────────────────────────────────────────
# BENCHMARK 2 — Baseline Comparison
# Statistical replica of lib/anomaly-detection.ts severityFor()
# ─────────────────────────────────────────────────────────────────────────────

_divider("BENCHMARK 2 — ML vs. Statistical Baseline (same synthetic test set)")

print("Statistical method: global median(no_show_rate) → |deviationPercent|")
print("Thresholds match lib/anomaly-detection.ts: >25% HIGH, >15% MEDIUM, >10% LOW")
print("(global median used because synthetic test rows carry no neighbourhood label)")

# Per-neighbourhood medians from real data, keyed by clinic_id
per_clinic_median = (
    weekly.groupby("clinic_id")["no_show_rate"].median().to_dict()
)
global_median = float(np.median(weekly["no_show_rate"].values))

def statistical_flag(no_show: float, baseline: float) -> int:
    if baseline == 0:
        return 0
    dev = abs((no_show - baseline) / baseline) * 100
    return 1 if dev > 10 else 0

# Use global median for synthetic rows (no clinic context)
y_stat = np.array([
    statistical_flag(row[feat_idx["no_show_rate"]], global_median)
    for row in X_test
])

stat_prec = precision_score(y_test, y_stat, zero_division=0)
stat_rec  = recall_score(y_test, y_stat, zero_division=0)
stat_f1   = f1_score(y_test, y_stat, zero_division=0)
try:
    stat_auc = roc_auc_score(y_test, X_test[:, feat_idx["no_show_rate"]])
except Exception:
    stat_auc = float("nan")

ml_fpr   = float(y_pred_01[y_test == 0].sum() / (y_test == 0).sum())
stat_fpr = float(y_stat[y_test == 0].sum() / (y_test == 0).sum())

agreement = int((y_pred_01 == y_stat).sum())
ml_only   = int(((y_pred_01 == 1) & (y_stat == 0)).sum())
stat_only = int(((y_pred_01 == 0) & (y_stat == 1)).sum())
both      = int(((y_pred_01 == 1) & (y_stat == 1)).sum())

print(f"\n  Agreement rate   : {agreement}/{len(y_test)} ({agreement/len(y_test):.1%})")
print(f"  Both flagged     : {both}")
print(f"  ML only flagged  : {ml_only}   (ML found, stats missed)")
print(f"  Stat only flagged: {stat_only}   (stats found, ML missed)")

_print_table(
    ["method", "precision", "recall", "f1", "roc-auc", "fpr"],
    [
        ["ML classifier",
         f"{ml_prec:.3f}", f"{ml_rec:.3f}", f"{ml_f1:.3f}",
         f"{ml_auc:.3f}", f"{ml_fpr:.3f}"],
        ["Statistical",
         f"{stat_prec:.3f}", f"{stat_rec:.3f}", f"{stat_f1:.3f}",
         f"{stat_auc:.3f}" if not np.isnan(stat_auc) else "n/a",
         f"{stat_fpr:.3f}"],
    ],
)

# Verdict
def _verdict(ml_val: float, stat_val: float, metric: str, higher_better: bool = True) -> str:
    diff = ml_val - stat_val
    tol  = 0.01
    if abs(diff) <= tol:
        return f"{metric}: TIE  (ML={ml_val:.3f}, Stat={stat_val:.3f})"
    if (diff > 0) == higher_better:
        return f"{metric}: ML WINS  (ML={ml_val:.3f} > Stat={stat_val:.3f})"
    return f"{metric}: STAT WINS  (ML={ml_val:.3f} < Stat={stat_val:.3f})"

print(f"\nVerdict:")
verdicts = [
    _verdict(ml_prec, stat_prec, "Precision"),
    _verdict(ml_rec,  stat_rec,  "Recall"),
    _verdict(ml_f1,   stat_f1,   "F1"),
    _verdict(ml_fpr,  stat_fpr,  "FPR", higher_better=False),
]
for v in verdicts:
    print(f"  {v}")

b2_results = dict(
    agreement_rate=round(agreement / len(y_test), 4),
    both_flagged=both,
    ml_only_flagged=ml_only,
    stat_only_flagged=stat_only,
    ml=dict(precision=round(float(ml_prec), 4), recall=round(float(ml_rec), 4),
            f1=round(float(ml_f1), 4), roc_auc=round(float(ml_auc), 4),
            false_positive_rate=round(ml_fpr, 4)),
    statistical=dict(precision=round(float(stat_prec), 4),
                     recall=round(float(stat_rec), 4),
                     f1=round(float(stat_f1), 4),
                     roc_auc=round(float(stat_auc), 4) if not np.isnan(stat_auc) else None,
                     false_positive_rate=round(stat_fpr, 4)),
    verdicts=verdicts,
)

# ─────────────────────────────────────────────────────────────────────────────
# BENCHMARK 3 — Latency
# ─────────────────────────────────────────────────────────────────────────────

_divider("BENCHMARK 3 — Latency (FastAPI on :8000)")

import urllib.request

SERVICE_URL = "http://localhost:8000"
N_REQUESTS  = 1000
b3_results  = {}

def _service_alive() -> bool:
    try:
        with urllib.request.urlopen(f"{SERVICE_URL}/health", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False

if not _service_alive():
    print(f"\n  ⚠  Service not reachable at {SERVICE_URL} — skipping latency benchmark.")
    print("     Start with: cd ml && uvicorn serve:app --port 8000")
    b3_results = {"skipped": True}
else:
    payloads = []
    for _ in range(N_REQUESTS):
        i = RNG.integers(0, len(X_normal))
        row = X_normal[i]
        payloads.append({
            "no_show_rate":       float(np.clip(row[feat_idx["no_show_rate"]], 0, 1)),
            "sms_sent_rate":      float(np.clip(row[feat_idx["sms_sent_rate"]], 0, 1)),
            "avg_lead_time_days": float(max(0, row[feat_idx["avg_lead_time_days"]])),
            "week_of_year":       int(np.clip(round(row[feat_idx["week_of_year"]]), 1, 52)),
            "rolling_mean_4w":    float(np.clip(row[feat_idx["rolling_mean_4w"]], 0, 1)),
        })

    latencies_ms = []
    t_start = time.perf_counter()
    for p in payloads:
        body = json.dumps(p).encode()
        req  = urllib.request.Request(
            f"{SERVICE_URL}/predict", data=body,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, timeout=5) as r:
            r.read()
        latencies_ms.append((time.perf_counter() - t0) * 1000)

    total_s = time.perf_counter() - t_start
    rps = N_REQUESTS / total_s
    p50 = statistics.median(latencies_ms)
    p95 = float(np.percentile(latencies_ms, 95))
    p99 = float(np.percentile(latencies_ms, 99))

    print(f"\n  Requests   : {N_REQUESTS}")
    print(f"  Total time : {total_s:.2f}s  ({rps:.1f} req/s)")
    print(f"  p50 latency: {p50:.2f} ms")
    print(f"  p95 latency: {p95:.2f} ms")
    print(f"  p99 latency: {p99:.2f} ms")

    b3_results = dict(n_requests=N_REQUESTS, total_s=round(total_s, 3),
                      rps=round(rps, 1), p50_ms=round(p50, 2),
                      p95_ms=round(p95, 2), p99_ms=round(p99, 2), skipped=False)

# ─────────────────────────────────────────────────────────────────────────────
# 5-FOLD CROSS-VALIDATION (sanity check on IF-labeled data)
# ─────────────────────────────────────────────────────────────────────────────

_divider("5-FOLD CROSS-VALIDATION (IF-label consistency — not true detection)")

print("⚠  Labels are from IsolationForest itself; CV measures label-fit, not")
print("   true anomaly detection skill. Treat as a stability / overfitting check.\n")

X_real_scaled = scaler.transform(X_real)
iso_cv = IsolationForest(contamination=0.1, random_state=42)
y_if   = (iso_cv.fit_predict(X_real_scaled) == -1).astype(int)

n_folds   = 5
min_class = int(np.bincount(y_if).min())

if min_class < n_folds:
    print(f"  Fewer than {n_folds} anomaly samples — reducing to {min_class} folds.")
    n_folds = max(2, min_class)

cv     = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
cv_f1  = cross_val_score(model, X_real_scaled, y_if, cv=cv, scoring="f1_macro")
cv_auc = cross_val_score(model, X_real_scaled, y_if, cv=cv, scoring="roc_auc")

print(f"  Folds       : {n_folds}")
print(f"  F1-macro / fold : {[round(s, 3) for s in cv_f1]}")
print(f"  Mean ± std      : {cv_f1.mean():.3f} ± {cv_f1.std():.3f}")
print(f"  ROC-AUC / fold  : {[round(s, 3) for s in cv_auc]}")
print(f"  Mean ± std      : {cv_auc.mean():.3f} ± {cv_auc.std():.3f}")

cv_results = dict(
    note="Circular — labels from IsolationForest; measures label-fit only",
    n_folds=n_folds,
    f1_per_fold=[round(float(s), 4) for s in cv_f1],
    f1_mean=round(float(cv_f1.mean()), 4),
    f1_std=round(float(cv_f1.std()), 4),
    auc_per_fold=[round(float(s), 4) for s in cv_auc],
    auc_mean=round(float(cv_auc.mean()), 4),
    auc_std=round(float(cv_auc.std()), 4),
)

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY TABLE
# ─────────────────────────────────────────────────────────────────────────────

_divider("SUMMARY")

_print_table(
    ["benchmark", "metric", "ML", "Statistical"],
    [
        ["1. Synthetic injection", "precision",
         f"{ml_prec:.3f}", "—"],
        ["1. Synthetic injection", "recall",
         f"{ml_rec:.3f}", "—"],
        ["1. Synthetic injection", "f1",
         f"{ml_f1:.3f}", "—"],
        ["1. Synthetic injection", "roc-auc",
         f"{ml_auc:.3f}", "—"],
        ["2. Baseline comparison", "precision",
         f"{ml_prec:.3f}", f"{stat_prec:.3f}"],
        ["2. Baseline comparison", "recall",
         f"{ml_rec:.3f}", f"{stat_rec:.3f}"],
        ["2. Baseline comparison", "f1",
         f"{ml_f1:.3f}", f"{stat_f1:.3f}"],
        ["2. Baseline comparison", "fpr",
         f"{ml_fpr:.3f}", f"{stat_fpr:.3f}"],
        ["3. Latency p50 (ms)", "",
         str(b3_results.get("p50_ms", "skipped")), "—"],
        ["3. Latency p95 (ms)", "",
         str(b3_results.get("p95_ms", "skipped")), "—"],
        ["3. Latency req/s", "",
         str(b3_results.get("rps", "skipped")), "—"],
        ["CV (IF-label fit)", "f1-macro mean",
         f"{cv_f1.mean():.3f}", "—"],
    ],
)

print(f"\nOverall verdict:")
for v in verdicts:
    print(f"  {v}")

# ─────────────────────────────────────────────────────────────────────────────
# Write benchmark_results.json
# ─────────────────────────────────────────────────────────────────────────────

results = {
    "grain": args.grain,
    "benchmark_1_synthetic_injection": b1_results,
    "benchmark_2_baseline_comparison": b2_results,
    "benchmark_3_latency": b3_results,
    "cross_validation": cv_results,
}

out = ML_DIR / "benchmark_results.json"
out.write_text(json.dumps(results, indent=2))
print(f"\nFull results written to {out}")
