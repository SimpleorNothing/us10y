from us10y.fetch import FRED_SERIES


def test_series_id():
    assert FRED_SERIES == "DGS10"
