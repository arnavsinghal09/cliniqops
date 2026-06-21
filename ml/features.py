"""
Weekly feature aggregation for CliniqOps ML anomaly detection.

Grain options:
  "week"  — one row per (Neighbourhood, ISO week)   → ~471 rows on this dataset
  "day"   — one row per (Neighbourhood, calendar day) → ~3 000+ rows
"""
from pathlib import Path

import pandas as pd

FEATURES = [
    "no_show_rate",
    "sms_sent_rate",
    "avg_lead_time_days",
    "week_of_year",
    "rolling_mean_4w",
]

DATA_PATH = Path(__file__).parent / "data" / "raw_appointments.csv"


def build_weekly(df: pd.DataFrame, grain: str = "week") -> pd.DataFrame:
    """
    Aggregate raw appointments into per-(Neighbourhood, period) feature rows.

    Returns a DataFrame with columns: clinic_id, period_key, + FEATURES.
    clinic_id and period_key are metadata; FEATURES are model inputs.

    Rolling mean (rolling_mean_4w) is computed within each neighbourhood so
    each clinic's trend is independent — matching per-clinic TS detection.
    """
    if grain not in ("week", "day"):
        raise ValueError(f"grain must be 'week' or 'day', got {grain!r}")

    df = df.copy()
    df["ScheduledDay"] = pd.to_datetime(df["ScheduledDay"], utc=True).dt.tz_convert(None)
    df["AppointmentDay"] = pd.to_datetime(df["AppointmentDay"], utc=True).dt.tz_convert(None)

    df["lead_time_days"] = (
        (df["AppointmentDay"] - df["ScheduledDay"])
        .dt.total_seconds()
        .div(86400)
        .clip(lower=0)
    )
    df["no_show"] = (df["No-show"] == "Yes").astype(int)
    df["week_of_year_col"] = df["AppointmentDay"].dt.isocalendar().week.astype(int)

    if grain == "week":
        df["period_key"] = df["AppointmentDay"].dt.to_period("W")
    else:
        df["period_key"] = df["AppointmentDay"].dt.to_period("D")

    agg = (
        df.groupby(["Neighbourhood", "period_key"])
        .agg(
            no_show_rate=("no_show", "mean"),
            sms_sent_rate=("SMS_received", "mean"),
            avg_lead_time_days=("lead_time_days", "mean"),
            week_of_year=("week_of_year_col", "first"),
        )
        .reset_index()
        .rename(columns={"Neighbourhood": "clinic_id"})
    )

    agg = agg.sort_values(["clinic_id", "period_key"]).reset_index(drop=True)

    # Per-clinic rolling mean — shift(1) prevents look-ahead, min_periods=1
    # means only the very first period per clinic is dropped by the dropna below.
    agg["rolling_mean_4w"] = (
        agg.groupby("clinic_id")["no_show_rate"]
        .transform(lambda s: s.shift(1).rolling(4, min_periods=1).mean())
    )

    return agg.dropna(subset=["rolling_mean_4w"]).reset_index(drop=True)


def load_weekly(data_path: Path = DATA_PATH, grain: str = "week") -> pd.DataFrame:
    """Load raw CSV and return aggregated feature DataFrame."""
    return build_weekly(pd.read_csv(data_path), grain=grain)
