# us10y

Tools for fetching and analyzing US 10-year Treasury yield data.

## Setup

```bash
pip install -e .
```

## Usage

```python
from us10y.fetch import fetch_yields

df = fetch_yields(start="2020-01-01")
print(df.head())
```
