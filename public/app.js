// US 10Y Treasury Yield Tracker
(async function () {
  const DATA_URL = "./data.json";

  function fmt(n, digits) {
    if (n === null || n === undefined) return "—";
    return Number(n).toFixed(digits ?? 2);
  }

  function deltaLabel(today, yesterday, suffix, type) {
    if (today === undefined || yesterday === undefined) return "";
    const diff = today - yesterday;
    if (Math.abs(diff) < 0.001) return "변동 없음";
    const sign = diff > 0 ? "+" : "";
    if (type === "yield") {
      const bps = Math.round(diff * 100);
      return `${sign}${bps}bp`;
    }
    return `${sign}${diff.toFixed(suffix === "%" ? 2 : 2)}`;
  }

  function deltaClass(today, yesterday) {
    if (today === undefined || yesterday === undefined) return "";
    const diff = today - yesterday;
    if (diff > 0.001) return "up";
    if (diff < -0.001) return "down";
    return "";
  }

  function renderMetrics(latest, prev) {
    const m = latest.markets;
    const p = prev ? prev.markets : {};

    document.getElementById("m-10y").textContent = fmt(m.ten_year, 2) + "%";
    document.getElementById("m-30y").textContent = fmt(m.thirty_year, 2) + "%";
    document.getElementById("m-brent").textContent = "$" + fmt(m.brent, 2);
    document.getElementById("m-wti").textContent = "$" + fmt(m.wti, 2);

    const d10y = document.getElementById("d-10y");
    const d30y = document.getElementById("d-30y");
    const dBrent = document.getElementById("d-brent");
    const dWti = document.getElementById("d-wti");

    d10y.textContent = deltaLabel(m.ten_year, p.ten_year, "%", "yield");
    d10y.className = "metric-delta " + deltaClass(m.ten_year, p.ten_year);
    d30y.textContent = deltaLabel(m.thirty_year, p.thirty_year, "%", "yield");
    d30y.className = "metric-delta " + deltaClass(m.thirty_year, p.thirty_year);
    dBrent.textContent = deltaLabel(m.brent, p.brent, "$");
    dBrent.className = "metric-delta " + deltaClass(m.brent, p.brent);
    dWti.textContent = deltaLabel(m.wti, p.wti, "$");
    dWti.className = "metric-delta " + deltaClass(m.wti, p.wti);
  }

  function renderProbabilities(latest) {
    document.getElementById("p-bull").textContent = latest.probabilities.bull + "%";
    document.getElementById("p-base").textContent = latest.probabilities.base + "%";
    document.getElementById("p-bear").textContent = latest.probabilities.bear + "%";
  }

  function renderSummary(latest) {
    document.getElementById("summary-text").textContent = latest.summary || "—";
    document.getElementById("trigger-text").textContent = latest.trigger_today || "—";
    document.getElementById("steelman-text").textContent = latest.bear_steelman || "—";
  }

  function renderDrivers(latest) {
    const list = document.getElementById("drivers-list");
    list.innerHTML = "";
    (latest.key_drivers || []).forEach(d => {
      const row = document.createElement("div");
      row.className = "driver-row";
      row.innerHTML = `
        <span class="driver-name">${d.name}</span>
        <span class="driver-value">
          ${d.value}
          <span class="driver-tag ${d.direction || 'base'}"></span>
        </span>`;
      list.appendChild(row);
    });
  }

  function renderTrendChart(history) {
    const ctx = document.getElementById("trendChart");
    if (!ctx) return;
    const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    const labels = history.map(h => {
      const [y, m, d] = h.date.split("-");
      return `${parseInt(m)}/${parseInt(d)}`;
    });
    const bullData = history.map(h => h.probabilities.bull);
    const baseData = history.map(h => h.probabilities.base);
    const bearData = history.map(h => h.probabilities.bear);

    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const tickColor = isDark ? "#a8a8a3" : "#6b6b66";

    new Chart(ctx, {
      type: history.length <= 3 ? "bar" : "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Bull",
            data: bullData,
            backgroundColor: "#1D9E75",
            borderColor: "#1D9E75",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3
          },
          {
            label: "Base",
            data: baseData,
            backgroundColor: "#888780",
            borderColor: "#888780",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3
          },
          {
            label: "Bear",
            data: bearData,
            backgroundColor: "#D85A30",
            borderColor: "#D85A30",
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: tickColor,
              boxWidth: 10,
              boxHeight: 10,
              font: { size: 12 },
              usePointStyle: true,
              pointStyle: "rectRounded"
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
            }
          }
        },
        scales: {
          x: {
            stacked: history.length <= 3,
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { size: 11 } }
          },
          y: {
            stacked: history.length <= 3,
            beginAtZero: true,
            max: history.length <= 3 ? 100 : 70,
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              font: { size: 11 },
              callback: v => v + "%"
            }
          }
        }
      }
    });
  }

  function renderLastUpdated(iso) {
    if (!iso) return;
    const d = new Date(iso);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const yyyy = kst.getUTCFullYear();
    const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(kst.getUTCDate()).padStart(2, "0");
    const hh = String(kst.getUTCHours()).padStart(2, "0");
    const mi = String(kst.getUTCMinutes()).padStart(2, "0");
    document.getElementById("last-updated").textContent = `${yyyy}-${mm}-${dd} ${hh}:${mi} KST`;
  }

  try {
    const res = await fetch(DATA_URL + "?t=" + Date.now());
    if (!res.ok) throw new Error("Failed to load data");
    const data = await res.json();
    const history = data.history || [];
    if (history.length === 0) throw new Error("No data");
    const latest = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : null;

    renderLastUpdated(data.last_updated);
    renderMetrics(latest, prev);
    renderProbabilities(latest);
    renderSummary(latest);
    renderDrivers(latest);
    renderTrendChart(history);
  } catch (e) {
    console.error(e);
    document.body.innerHTML += '<p style="text-align:center;padding:2rem;color:#999;">데이터 로드 실패. 잠시 후 다시 시도해주세요.</p>';
  }
})();
