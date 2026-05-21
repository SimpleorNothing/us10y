:root {
  --bg: #ffffff;
  --bg-secondary: #f5f4ef;
  --text: #1a1a1a;
  --text-secondary: #6b6b66;
  --text-tertiary: #9a9a95;
  --border: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.15);
  --bull: #1D9E75;
  --bull-bg: #E1F5EE;
  --bull-text: #0F6E56;
  --base: #888780;
  --base-bg: #F1EFE8;
  --base-text: #444441;
  --bear: #D85A30;
  --bear-bg: #FAECE7;
  --bear-text: #993C1D;
  --radius: 12px;
  --radius-sm: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --bg-secondary: #232323;
    --text: #f5f5f5;
    --text-secondary: #a8a8a3;
    --text-tertiary: #6b6b66;
    --border: rgba(255, 255, 255, 0.1);
    --border-strong: rgba(255, 255, 255, 0.18);
    --bull-bg: rgba(29, 158, 117, 0.15);
    --bull-text: #5DCAA5;
    --base-bg: rgba(136, 135, 128, 0.18);
    --base-text: #B4B2A9;
    --bear-bg: rgba(216, 90, 48, 0.15);
    --bear-text: #F0997B;
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.container {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.75rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.header-title h1 {
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.badge {
  display: inline-block;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 100px;
  font-variant-numeric: tabular-nums;
}

h2 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 1.5rem;
}

@media (max-width: 480px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.metric-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
}

.metric-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  letter-spacing: 0.03em;
}

.metric-value {
  font-size: 20px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.metric-delta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
  min-height: 14px;
}

.metric-delta.up { color: var(--bear-text); }
.metric-delta.down { color: var(--bull-text); }

.probability-summary {
  margin-bottom: 2rem;
}

.prob-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.prob-cell {
  padding: 14px 12px;
  border-radius: var(--radius-sm);
  text-align: center;
}

.prob-cell.bull { background: var(--bull-bg); }
.prob-cell.base { background: var(--base-bg); }
.prob-cell.bear { background: var(--bear-bg); }

.prob-label {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.prob-cell.bull .prob-label { color: var(--bull-text); }
.prob-cell.base .prob-label { color: var(--base-text); }
.prob-cell.bear .prob-label { color: var(--bear-text); }

.prob-range {
  font-weight: 400;
  font-size: 11px;
  opacity: 0.8;
  display: block;
  margin-top: 2px;
}

.prob-value {
  font-size: 24px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.prob-cell.bull .prob-value { color: var(--bull-text); }
.prob-cell.base .prob-value { color: var(--base-text); }
.prob-cell.bear .prob-value { color: var(--bear-text); }

.chart-section {
  margin-bottom: 2rem;
}

.chart-wrapper {
  background: var(--bg-secondary);
  border-radius: var(--radius);
  padding: 1.25rem;
  position: relative;
  height: 280px;
}

.summary-section, .drivers-section, .bear-steelman-section {
  margin-bottom: 1.75rem;
}

.summary-text, .steelman-text {
  font-size: 15px;
  color: var(--text);
  line-height: 1.65;
}

.trigger {
  margin-top: 0.75rem;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  border-left: 3px solid var(--bear);
}

.trigger strong {
  color: var(--bear-text);
  font-weight: 500;
  margin-right: 4px;
}

.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.driver-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.driver-name {
  color: var(--text);
  font-weight: 500;
}

.driver-value {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  gap: 8px;
}

.driver-tag {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.driver-tag.bull { background: var(--bull); }
.driver-tag.base { background: var(--base); }
.driver-tag.bear { background: var(--bear); }

.steelman-text {
  background: var(--bg-secondary);
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  font-style: italic;
  color: var(--text-secondary);
  font-size: 14px;
}

.footer {
  margin-top: 2.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-tertiary);
}

.footer p { margin-bottom: 4px; }

.disclaimer {
  font-weight: 500;
}

.source {
  font-size: 11px;
}
