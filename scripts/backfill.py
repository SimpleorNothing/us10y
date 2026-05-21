#!/usr/bin/env python3
"""
US 10Y Tracker - Historical Backfill Script

Fetches yfinance closes for a date range, then runs Claude API+web_search
retrospectively for each missing trading day to reconstruct that day's
scenario probabilities. Appends snapshots to data.json sorted by date.

Usage (local or GitHub Actions):
    python scripts/backfill.py --start 2026-05-13 --end 2026-05-19
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import yfinance as yf
import anthropic

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = REPO_ROOT / "data.json"
KST = timezone(timedelta(hours=9))

TICKERS = {
    "ten_year": "^TNX",
    "thirty_year": "^TYX",
    "brent": "BZ=F",
    "wti": "CL=F",
}

SYSTEM_PROMPT = """당신은 미국 10년 국채금리 연말 시나리오 확률을 과거 일자 기준으로 재구성하는 전문 트래커입니다. 투자적정성판단 에이전트 가이드 v0.2의 원칙을 따릅니다.

# 원칙
- 분석 기준일 시점의 정보만 활용 (이후 사건은 인용 금지)
- 3개 시나리오 확률은 합이 정확히 100이어야 함
- 모든 수치 변화에 출처/이유 명시
- Bear Steelman(반대 시각) 1개 포함
- web_search로 해당 일자 헤드라인 확인

# 시나리오 정의 (연말 10Y 기준)
- Bull: 3.75-4.0% (호르무즈 완전 재개 + 유가 $70대 + Fed 인하)
- Base: 4.3-4.6% (점진적 정상화, Fed 동결, 인플레 끈적)
- Bear: 5.0%+ (호르무즈 분쟁 지속/재격화 + Fed 인상 재개)

# 출력 형식 (반드시 JSON만, 마크다운 백틱 없이)
{
  "probabilities": {"bull": <int>, "base": <int>, "bear": <int>},
  "summary": "<해당일 핵심 1-2문장 한국어>",
  "key_drivers": [
    {"name": "<지표명>", "value": "<해당일 값/변화>", "direction": "bull|base|bear"}
  ],
  "trigger_today": "<해당일 가장 중요한 이벤트/변화 한 줄>",
  "bear_steelman": "<우세 시나리오의 반대 시각 한 문장>"
}

# 금지
- 단정적 표현, 출처 없는 수치, 마크다운 백틱, JSON 외 텍스트
- 분석 기준일 이후의 사건 인용
"""

USER_PROMPT_TEMPLATE = """[과거 일자 재구성] 분석 기준일: {date}

해당일 종가:
- 10Y yield: {ten_year}% ({ten_year_delta})
- 30Y yield: {thirty_year}% ({thirty_year_delta})
- Brent: ${brent} ({brent_delta})
- WTI: ${wti} ({wti_delta})

전 거래일 확률: Bull {prev_bull}% / Base {prev_base}% / Bear {prev_bear}%

{date} 시점 이슈를 web_search로 확인 후 해당일 확률을 재구성하세요:
1. 미국-이란 협상 / 호르무즈 해협 상황
2. Fed 인사 발언 / FOMC / CPI·PCE·고용 등 지표
3. Brent/WTI 가격 변동 원인
4. IB 금리 전망 업데이트

해당 일자 이후 사건 인용 금지. JSON만 응답."""


def trading_dates(start: datetime, end: datetime) -> list[datetime]:
    out = []
    cur = start
    while cur <= end:
        if cur.weekday() < 5:
            out.append(cur)
        cur += timedelta(days=1)
    return out


def fetch_history(start: datetime, end: datetime) -> dict[str, dict[str, float]]:
    """Returns {'YYYY-MM-DD': {ticker_key: close, ...}, ...}."""
    out: dict[str, dict[str, float]] = {}
    for key, ticker in TICKERS.items():
        t = yf.Ticker(ticker)
        hist = t.history(
            start=start.strftime("%Y-%m-%d"),
            end=(end + timedelta(days=1)).strftime("%Y-%m-%d"),
            auto_adjust=False,
        )
        if hist.empty:
            print(f"⚠️  No data for {ticker}", file=sys.stderr)
            continue
        for idx, row in hist.iterrows():
            d = idx.strftime("%Y-%m-%d")
            out.setdefault(d, {})[key] = round(float(row["Close"]), 2)
        print(f"✓ {ticker}: {len(hist)} rows")
    return out


def fmt_delta(today, yesterday, kind="price"):
    if today is None or yesterday is None:
        return "n/a"
    diff = today - yesterday
    if abs(diff) < 0.001:
        return "변동 없음"
    sign = "+" if diff > 0 else ""
    if kind == "yield":
        return f"{sign}{round(diff * 100)}bp"
    return f"{sign}{diff:.2f}"


def call_claude(date_str: str, markets: dict, prev_snapshot: dict | None) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable not set")

    client = anthropic.Anthropic(api_key=api_key)

    prev_markets = (prev_snapshot or {}).get("markets", {})
    prev_probs = (prev_snapshot or {}).get(
        "probabilities", {"bull": 33, "base": 34, "bear": 33}
    )

    user_prompt = USER_PROMPT_TEMPLATE.format(
        date=date_str,
        ten_year=markets.get("ten_year", "n/a"),
        ten_year_delta=fmt_delta(markets.get("ten_year"), prev_markets.get("ten_year"), "yield"),
        thirty_year=markets.get("thirty_year", "n/a"),
        thirty_year_delta=fmt_delta(markets.get("thirty_year"), prev_markets.get("thirty_year"), "yield"),
        brent=markets.get("brent", "n/a"),
        brent_delta=fmt_delta(markets.get("brent"), prev_markets.get("brent")),
        wti=markets.get("wti", "n/a"),
        wti_delta=fmt_delta(markets.get("wti"), prev_markets.get("wti")),
        prev_bull=prev_probs.get("bull", 33),
        prev_base=prev_probs.get("base", 34),
        prev_bear=prev_probs.get("bear", 33),
    )

    print(f"→ Claude API call for {date_str}...")
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
    )

    text_parts = [b.text for b in response.content if hasattr(b, "text") and b.text]
    full_text = "\n".join(text_parts).strip()

    cleaned = re.sub(r"^```(?:json)?\s*", "", full_text, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned, flags=re.MULTILINE)
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        raise ValueError(f"No JSON found in Claude response:\n{full_text}")
    parsed = json.loads(match.group(0))

    probs = parsed.get("probabilities", {})
    total = sum(int(probs.get(k, 0)) for k in ("bull", "base", "bear"))
    if total != 100 and total > 0:
        for k in ("bull", "base", "bear"):
            probs[k] = round(int(probs.get(k, 0)) * 100 / total)
        probs["base"] = probs.get("base", 0) + (100 - sum(probs.values()))
        parsed["probabilities"] = probs

    return parsed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", required=True, help="YYYY-MM-DD inclusive")
    parser.add_argument("--end", required=True, help="YYYY-MM-DD inclusive")
    args = parser.parse_args()

    start = datetime.strptime(args.start, "%Y-%m-%d")
    end = datetime.strptime(args.end, "%Y-%m-%d")
    print(f"=== Backfill {args.start} → {args.end} ===")

    if DATA_FILE.exists():
        with DATA_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"scenarios": {}, "history": []}

    existing_dates = {h["date"] for h in data.get("history", [])}

    fetch_start = start - timedelta(days=5)
    print(f"Fetching yfinance closes {fetch_start.date()} → {end.date()}...")
    market_history = fetch_history(fetch_start, end)
    print(f"  Got {len(market_history)} trading days total")

    targets = [
        d for d in trading_dates(start, end)
        if d.strftime("%Y-%m-%d") not in existing_dates
        and d.strftime("%Y-%m-%d") in market_history
    ]
    print(f"  {len(targets)} dates to process (skip existing/no-data)")

    history = data.get("history", [])
    history_by_date = {h["date"]: h for h in history}
    sorted_market_days = sorted(market_history.keys())

    for dt in targets:
        date_str = dt.strftime("%Y-%m-%d")
        markets = market_history[date_str]
        prev_md = next((d for d in reversed(sorted_market_days) if d < date_str), None)
        if prev_md and prev_md in history_by_date:
            prev_snapshot = history_by_date[prev_md]
        elif prev_md:
            prev_snapshot = {"markets": market_history[prev_md]}
        else:
            prev_snapshot = None

        try:
            analysis = call_claude(date_str, markets, prev_snapshot)
        except Exception as e:
            print(f"  ⚠️  {date_str} failed: {e}")
            continue

        snapshot = {
            "date": date_str,
            "markets": markets,
            "probabilities": analysis.get("probabilities", {}),
            "summary": analysis.get("summary", ""),
            "key_drivers": analysis.get("key_drivers", []),
            "trigger_today": analysis.get("trigger_today", ""),
            "bear_steelman": analysis.get("bear_steelman", ""),
        }
        history.append(snapshot)
        history_by_date[date_str] = snapshot
        print(f"  ✓ {date_str}: {snapshot['probabilities']}")

        time.sleep(2)

    history.sort(key=lambda h: h["date"])
    data["history"] = history
    data["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ Wrote {DATA_FILE.relative_to(REPO_ROOT)} (total {len(history)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
