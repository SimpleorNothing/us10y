"""Fetch US 10-year Treasury yield data from FRED."""
from __future__ import annotations

from datetime import date

import pandas as pd
import requests

FRED_SERIES = "DGS10"
FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv"


def fetch_yields(start: str | date | None = None, end: str | date | None = None) -> pd.DataFrame:
    params = {"id": FRED_SERIES}
    if start is not None:
        params["cosd"] = str(start)
    if end is not None:
        params["coed"] = str(end)

    response = requests.get(FRED_CSV_URL, params=params, timeout=30)
    response.raise_for_status()

    from io import StringIO

    df = pd.read_csv(StringIO(response.text))
    df.columns = ["date", "yield"]
    df["date"] = pd.to_datetime(df["date"])
    df["yield"] = pd.to_numeric(df["yield"], errors="coerce")
    return df.dropna().reset_index(drop=True)
