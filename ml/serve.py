import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal, Optional

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_DIR = Path(__file__).parent / "model"

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    state["model"] = joblib.load(MODEL_DIR / "anomaly_model.pkl")
    state["scaler"] = joblib.load(MODEL_DIR / "scaler.pkl")
    state["features"] = json.loads((MODEL_DIR / "feature_names.json").read_text())
    yield
    state.clear()


app = FastAPI(title="CliniqOps Anomaly Detector", lifespan=lifespan)


class PredictRequest(BaseModel):
    no_show_rate: float
    sms_sent_rate: float
    avg_lead_time_days: float
    week_of_year: int
    rolling_mean_4w: float


class PredictResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    severity: Optional[Literal["LOW", "MEDIUM", "HIGH"]]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not state:
        raise HTTPException(status_code=503, detail="Model not loaded")

    row = [getattr(req, f) for f in state["features"]]
    X = np.array(row, dtype=float).reshape(1, -1)
    X_scaled = state["scaler"].transform(X)

    model = state["model"]
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X_scaled)[0]
        classes = list(model.classes_)
        # Look up the anomaly class (1) by position; fall back to 0.0 if not trained on it
        anomaly_score = float(proba[classes.index(1)]) if 1 in classes else 0.0
    else:
        raw = model.decision_function(X_scaled)[0]
        anomaly_score = float(1 / (1 + np.exp(-raw)))

    is_anomaly = bool(model.predict(X_scaled)[0] == 1)

    if anomaly_score > 0.8:
        severity: Optional[Literal["LOW", "MEDIUM", "HIGH"]] = "HIGH"
    elif anomaly_score > 0.6:
        severity = "MEDIUM"
    elif anomaly_score > 0.4:
        severity = "LOW"
    else:
        severity = None

    return PredictResponse(
        is_anomaly=is_anomaly,
        anomaly_score=round(anomaly_score, 4),
        severity=severity,
    )
