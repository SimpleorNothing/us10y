# us10y.simpleornothing.com

미국 10년 국채금리 연말 시나리오 확률 일별 추적 대시보드.

매일 KST 06:13 (미국장 마감 후, 한국장 개장 전)에 GitHub Actions가:
1. yfinance로 시장 데이터 수집 (10Y, 30Y yields + Brent, WTI)
2. Claude API + web_search로 가이드 v0.2 기반 확률 추정
3. `data.json`에 누적 → push → Railway 자동 재배포

---

## 디렉토리 구조

```
us10y/
├── public/                       # 정적 대시보드 (Railway가 루트 /로 서빙)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data.json                     # 누적 시계열 (git history로 백업)
├── scripts/
│   ├── update.py                 # 데일리 업데이트 (yfinance + Claude API)
│   └── requirements.txt
├── .github/workflows/
│   └── daily-update.yml          # cron: UTC 21:13 = KST 06:13
├── server.js                     # Railway용 Express 서버
├── package.json                  # Node 의존성
└── README.md
```

---

## 셋업 (Claude Code로 한 번에)

Claude Code 터미널에서:

```bash
# 1) 이 폴더 안에서 git 초기화
cd us10y
git init
git add .
git commit -m "feat: initial US10Y tracker setup"

# 2) GitHub에 새 repo 생성 후 연결 (gh CLI 사용 예)
gh repo create us10y --public --source=. --remote=origin
git push -u origin main

# 또는 수동: https://github.com/new 에서 repo 생성 후
# git remote add origin https://github.com/<your-user>/us10y.git
# git push -u origin main
```

---

## GitHub Secrets 설정 (필수)

repo의 **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com에서 발급한 키 |

---

## Railway 배포

1. railway.app에서 새 프로젝트 생성
2. **Deploy from GitHub repo** 선택 → `us10y` 연결
3. Railway가 `package.json` 감지하고 `npm start` 자동 실행
4. **Settings → Networking** 에서 **custom domain**으로 `us10y.simpleornothing.com` 추가
5. Railway가 표시하는 `CNAME` 대상값을 DNS에 등록:

| Type | Name | Value |
|---|---|---|
| `CNAME` | `us10y` | (Railway가 발급한 `*.up.railway.app` 대상) |

> 앱은 서브도메인 루트(`/`)에서 서빙됩니다 (`server.js`). 따라서 최종 URL은 `https://us10y.simpleornothing.com` 입니다.
> 기존 `/us10y/*` 경로는 루트로 301 리다이렉트되므로 전환 기간에도 깨지지 않습니다.

---

## 동작 확인

### 수동 트리거로 테스트
GitHub repo → **Actions** 탭 → **Daily US10Y Update** → **Run workflow**.

성공하면 `data.json`에 오늘 날짜 항목이 추가되고 자동 푸시됩니다.

### 로컬에서 스크립트 테스트
```bash
export ANTHROPIC_API_KEY=sk-ant-...
pip install -r scripts/requirements.txt
python scripts/update.py
```

---

## 스케줄 변경

`.github/workflows/daily-update.yml`의 `cron` 표현 수정:

| 원하는 KST 시각 | UTC cron |
|---|---|
| 매일 07:00 KST | `0 22 * * *` (전날 22:00 UTC) |
| 매일 08:00 KST | `0 23 * * *` |
| 매일 09:00 KST | `0 0 * * *` |
| 월~금만 07:00 KST | `0 22 * * 0-4` |

> GitHub Actions cron은 UTC 기준이며 부하 상황에 따라 최대 ~15분 지연 가능합니다.

---

## 비용 추정

| 항목 | 월간 |
|---|---|
| Claude API (Sonnet, 1일 1회, web_search 5회) | ~$0.50-1.00 |
| GitHub Actions (public repo) | 무료 |
| Railway (Hobby plan) | $0 (사용량 적음) 또는 $5 정액 |
| yfinance | 무료 |
| **총** | **~$1-6** |

---

## 시나리오 정의

| 시나리오 | 연말 10Y | 핵심 가정 |
|---|---|---|
| Bull | 3.75-4.0% | 호르무즈 완전 재개 + 유가 $70대 + Fed 인하 |
| Base | 4.3-4.6% | 점진적 정상화, Fed 동결, 인플레 끈적 |
| Bear | 5.0%+ | 호르무즈 분쟁 지속·재격화 + Fed 인상 재개 |

시나리오 정의 자체를 바꾸려면 `data.json`의 `scenarios` 객체와 `scripts/update.py`의 `SYSTEM_PROMPT`를 동시에 수정하세요.

---

## 가이드 출처

투자적정성판단 에이전트 가이드 v0.2 — 단기 4축 + 장기 5축 + 시나리오 3개 + 반대 시각 의무.

---

*본 분석은 의사결정 지원용이며, 매수/매도 권유가 아닙니다.*
