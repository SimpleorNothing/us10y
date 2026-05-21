#!/usr/bin/env python3
"""
US 10Y Treasury Yield Tracker - Daily Update Script
Runs daily at KST 07:00 (UTC 22:00 previous day) via GitHub Actions.

Workflow:
  1. Fetch market data (10Y, 30Y yields + Brent/WTI crude) via yfinance
  2. Call Claude API with v0.2 guide-based system prompt + web_search
  3. Parse JSON response and append today's snapshot to data.json
"""

import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import yfinance as yf
import anthropic

# ----- Configuration ----------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = REPO_ROOT / "data.json"
KST = timezone(timedelta(hours=9))

TICKERS = {
    "ten_year": "^TNX",            # CBOE 10Y Treasury Yield Index
    "thirty_year": "^TYX",         # CBOE 30Y Treasury Yield Index
    "brent": "BZ=F",               # Brent Crude Futures
    "wti": "CL=F",                 # WTI Crude Futures
    "fed_funds_implied": "ZQ=F",   # CME 30-Day Fed Funds Futures (front month)
                                    # Stored as implied rate (100 - price) for direct use.
                                    # This is the same primitive CME FedWatch builds from.
}

SYSTEM_PROMPT = """당신은 미국 10년 국채금리 연말 시나리오 확률을 매일 추정하는 전문 트래커입니다. 투자적정성판단 에이전트 가이드 v0.2의 원칙을 따릅니다.

# 원칙
- 단기(~4주) 트레이딩 동인과 장기(연말까지) 펀더멘털을 모두 고려
- 3개 시나리오 확률은 합이 정확히 100이어야 함
- 모든 수치 변화에 출처/이유 명시
- 강세/약세 한쪽으로 기울지 않고 반대 시각(Bear Steelman) 1개 포함
- 시장 데이터에만 의존하지 말고 web_search로 이란/Fed/유가 최신 헤드라인 확인
- 'Fed Funds 30D 함의금리'는 CME 30-Day Fed Funds 선물(ZQ=F)에서 100-선물가로 도출한 시장의 단기 정책금리 예상치(=CME FedWatch의 기초 인풋). 현재 Fed 목표금리 대비 시장 가격이 인하/인상을 얼마나 반영하는지 확인하고 Bull/Bear 시나리오 정합성 점검에 활용

# 시나리오 정의 (연말 10Y 기준)
- Bull: 3.75-4.0% (호르무즈 완전 재개 + 유가 $70대 + Fed 인하)
- Base: 4.3-4.6% (점진적 정상화, Fed 동결, 인플레 끈적)
- Bear: 5.0%+ (호르무즈 분쟁 지속/재격화 + Fed 인상 재개)

# 출력 형식 (반드시 JSON만, 마크다운 백틱 없이)
{
  "probabilities": {"bull": <int>, "base": <int>, "bear": <int>},
  "summary": "<오늘 핵심 1-2문장 한국어>",
  "key_drivers": [
    {"name": "<지표명>", "value": "<현재값/변화>", "direction": "bull|base|bear"}
  ],
  "trigger_today": "<오늘 가장 중요한 이벤트/변화 한 줄>",
  "bear_steelman": "<현재 우세 시나리오의 반대 시각 한 문장>"
}

# 금지
- 단정적 표현 ("반드시", "확실히")
- 출처 없는 수치
- 마크다운 백틱 (```json ... ```)
- JSON 외 텍스트
"""

USER_PROMPT_TEMPLATE = """오늘 시장 데이터:
- 10Y yield: {ten_year}% ({ten_year_delta})
- 30Y yield: {thirty_year}% ({thirty_year_delta})
- Brent: ${brent} ({brent_delta})
- WTI: ${wti} ({wti_delta})
- Fed Funds 30D 함의금리: {fed_funds_implied}% ({fed_funds_implied_delta})  [= CME FedWatch 기초]

어제 확률: Bull {prev_bull}% / Base {prev_base}% / Bear {prev_bear}%

지난 24시간 동안의 다음 이슈를 web_search로 확인하고 오늘의 확률을 재추정해주세요:
1. 미국-이란 협상 및 호르무즈 해협 상황
2. Fed 인사 발언 / FOMC 의사록 / 경제지표 (CPI, PCE, 고용)
3. Brent/WTI 가격 변동의 원인
4. 다른 IB의 금리 전망 업데이트
5. CME FedWatch 다음 FOMC 인하/동결/인상 확률 (위 함의금리 변화의 정성적 해석)

JSON으로만 응답하세요."""

# ----- Helpers ----------------------------------------------------------------

def fetch_market_data() -> dict:
    """Fetch latest close prices for all tracked tickers."""
    result = {}
    for key, ticker in TICKERS.items():
        try:
            t = yf.Ticker(ticker)
            hist = t.history(period="5d", auto_adjust=False)
            if hist.empty:
                print(f"⚠️  No data for {ticker}", file=sys.stderr)
                result[key] = None
                continue
            latest_close = float(hist["Close"].iloc[-1])
            if key == "fed_funds_implied":
                result[key] = round(100 - latest_close, 3)
                print(f"✓ {ticker}: {latest_close:.2f} → implied {result[key]:.3f}%")
            else:
                result[key] = round(latest_close, 2)
                print(f"✓ {ticker}: {latest_close:.2f}")
        except Exception as e:
            print(f"⚠️  Failed to fetch {ticker}: {e}", file=sys.stderr)
            result[key] = None
    return result


def fmt_delta(today, yesterday, kind="price"):
    if today is None or yesterday is None:
        return "n/a"
    diff = today - yesterday
    if abs(diff) < 0.001:
        return "변동 없음"
    sign = "+" if diff > 0 else ""
    if kind == "yield":
        bps = round(diff * 100)
        return f"{sign}{bps}bp"
    return f"{sign}{diff:.2f}"


def call_claude(markets: dict, prev_snapshot: dict | None) -> dict:
    """Call Claude API with web_search to get today's probability estimate."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable not set")

    client = anthropic.Anthropic(api_key=api_key)

    prev_markets = (prev_snapshot or {}).get("markets", {})
    prev_probs = (prev_snapshot or {}).get("probabilities", {"bull": 33, "base": 34, "bear": 33})

    user_prompt = USER_PROMPT_TEMPLATE.format(
        ten_year=markets.get("ten_year", "n/a"),
        ten_year_delta=fmt_delta(markets.get("ten_year"), prev_markets.get("ten_year"), "yield"),
        thirty_year=markets.get("thirty_year", "n/a"),
        thirty_year_delta=fmt_delta(markets.get("thirty_year"), prev_markets.get("thirty_year"), "yield"),
        brent=markets.get("brent", "n/a"),
        brent_delta=fmt_delta(markets.get("brent"), prev_markets.get("brent")),
        wti=markets.get("wti", "n/a"),
        wti_delta=fmt_delta(markets.get("wti"), prev_markets.get("wti")),
        fed_funds_implied=markets.get("fed_funds_implied", "n/a"),
        fed_funds_implied_delta=fmt_delta(markets.get("fed_funds_implied"), prev_markets.get("fed_funds_implied"), "yield"),
        prev_bull=prev_probs.get("bull", 33),
        prev_base=prev_probs.get("base", 34),
        prev_bear=prev_probs.get("bear", 33),
    )

    print("→ Calling Claude API with web_search...")

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
    )

    # Concatenate all text blocks
    text_parts = []
    for block in response.content:
        if hasattr(block, "text") and block.text:
            text_parts.append(block.text)
    full_text = "\n".join(text_parts).strip()

    # Strip code fences if Claude added them despite instructions
    cleaned = re.sub(r"^```(?:json)?\s*", "", full_text, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned, flags=re.MULTILINE)

    # Find JSON object (greedy on outermost braces)
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        raise ValueError(f"No JSON found in Claude response:\n{full_text}")

    parsed = json.loads(match.group(0))

    # Validation
    probs = parsed.get("probabilities", {})
    total = sum(int(probs.get(k, 0)) for k in ("bull", "base", "bear"))
    if total != 100:
        print(f"⚠️  Probabilities sum to {total}, normalizing...")
        if total > 0:
            for k in ("bull", "base", "bear"):
                probs[k] = round(int(probs.get(k, 0)) * 100 / total)
            # Fix rounding so sum == 100
            diff = 100 - sum(probs.values())
            probs["base"] = probs.get("base", 0) + diff
        parsed["probabilities"] = probs

    return parsed


def update_data_file(markets: dict, analysis: dict) -> None:
    """Append today's snapshot to data.json."""
    today = datetime.now(KST).strftime("%Y-%m-%d")
    now_utc_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if DATA_FILE.exists():
        with DATA_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"scenarios": {}, "history": []}

    history = data.get("history", [])
    # Replace if same date already exists (idempotent re-run)
    history = [h for h in history if h.get("date") != today]

    snapshot = {
        "date": today,
        "markets": markets,
        "probabilities": analysis.get("probabilities", {}),
        "summary": analysis.get("summary", ""),
        "key_drivers": analysis.get("key_drivers", []),
        "trigger_today": analysis.get("trigger_today", ""),
        "bear_steelman": analysis.get("bear_steelman", ""),
    }
    history.append(snapshot)

    data["history"] = history
    data["last_updated"] = now_utc_iso

    with DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ Updated {DATA_FILE.relative_to(REPO_ROOT)} for {today}")
    print(f"  Probabilities: {snapshot['probabilities']}")
    print(f"  Summary: {snapshot['summary']}")


def main() -> int:
    print(f"=== US 10Y Tracker Update — {datetime.now(KST).strftime('%Y-%m-%d %H:%M KST')} ===")

    markets = fetch_market_data()

    # Load previous snapshot for context
    prev_snapshot = None
    if DATA_FILE.exists():
        with DATA_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
            history = data.get("history", [])
            if history:
                prev_snapshot = history[-1]

    analysis = call_claude(markets, prev_snapshot)
    update_data_file(markets, analysis)
    print("=== Done ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
