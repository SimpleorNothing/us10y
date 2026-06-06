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
    document.getElementById("m-fedff").textContent = fmt(m.fed_funds_implied, 2) + "%";

    const d10y = document.getElementById("d-10y");
    const d30y = document.getElementById("d-30y");
    const dBrent = document.getElementById("d-brent");
    const dWti = document.getElementById("d-wti");
    const dFedff = document.getElementById("d-fedff");

    d10y.textContent = deltaLabel(m.ten_year, p.ten_year, "%", "yield");
    d10y.className = "metric-delta " + deltaClass(m.ten_year, p.ten_year);
    d30y.textContent = deltaLabel(m.thirty_year, p.thirty_year, "%", "yield");
    d30y.className = "metric-delta " + deltaClass(m.thirty_year, p.thirty_year);
    dBrent.textContent = deltaLabel(m.brent, p.brent, "$");
    dBrent.className = "metric-delta " + deltaClass(m.brent, p.brent);
    dWti.textContent = deltaLabel(m.wti, p.wti, "$");
    dWti.className = "metric-delta " + deltaClass(m.wti, p.wti);
    dFedff.textContent = deltaLabel(m.fed_funds_implied, p.fed_funds_implied, "%", "yield");
    dFedff.className = "metric-delta " + deltaClass(m.fed_funds_implied, p.fed_funds_implied);
  }

  function renderProbabilities(latest) {
    document.getElementById("p-bull").textContent = latest.probabilities.bull + "%";
    document.getElementById("p-base").textContent = latest.probabilities.base + "%";
    document.getElementById("p-bear").textContent = latest.probabilities.bear + "%";
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderDailyFeed(history) {
    const feed = document.getElementById("daily-feed");
    if (!feed) return;
    feed.innerHTML = "";

    [...history].reverse().forEach((day, idx) => {
      const [, mo, d] = day.date.split("-");
      const dateLabel = `${parseInt(mo)}/${parseInt(d)}`;
      const todayMarker = idx === 0 ? ` <span class="today-marker">오늘</span>` : "";

      const driversHtml = (day.key_drivers || []).map(dr => `
        <div class="driver-row">
          <span class="driver-name">${escapeHtml(dr.name)}</span>
          <span class="driver-value">
            ${escapeHtml(dr.value)}
            <span class="driver-tag ${dr.direction || "base"}"></span>
          </span>
        </div>`).join("");

      const card = document.createElement("article");
      card.className = "daily-card";
      card.innerHTML = `
        <h2 class="daily-date">${dateLabel}${todayMarker}</h2>
        ${day.summary ? `<p class="summary-text">${escapeHtml(day.summary)}</p>` : ""}
        ${day.trigger_today ? `
          <div class="trigger">
            <strong>트리거:</strong>
            <span>${escapeHtml(day.trigger_today)}</span>
          </div>` : ""}
        ${(day.key_drivers || []).length > 0 ? `
          <h3 class="daily-section-label">주요 다이얼</h3>
          <div class="drivers-list">${driversHtml}</div>` : ""}
        ${day.bear_steelman ? `
          <h3 class="daily-section-label">반대 시각 (Steelman)</h3>
          <p class="steelman-text">${escapeHtml(day.bear_steelman)}</p>` : ""}
      `;
      feed.appendChild(card);
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
            position: "bottom",
            labels: {
              color: tickColor,
              boxWidth: 10,
              boxHeight: 10,
              padding: 12,
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
            max: history.length <= 3 ? 100 : 80,
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
    renderTrendChart(history);
    renderDailyFeed(history);
  } catch (e) {
    console.error(e);
    document.body.innerHTML += '<p style="text-align:center;padding:2rem;color:#999;">데이터 로드 실패. 잠시 후 다시 시도해주세요.</p>';
  }
})();

/* ===== 월별 경로 추정 엔진 (us10y 통합) ===== */
(function(){
'use strict';
function cssv(n,f){var v=getComputedStyle(document.documentElement).getPropertyValue(n);return (v&&v.trim())||f;}
var COL={};
function loadColors(){
  COL.grid=cssv('--border','rgba(0,0,0,0.08)');
  COL.axis=cssv('--text-secondary','#6b6b66');
  COL.txt=cssv('--text','#1a1a1a');
  COL.faint=cssv('--text-tertiary','#9a9a95');
  COL.cardbg=cssv('--bg-secondary','#f5f4ef');
  COL.hawk=cssv('--bear','#D85A30');
  COL.base=cssv('--base','#888780');
  COL.dove=cssv('--bull','#1D9E75');
  COL.brand=cssv('--brand','#1257d6');
}
loadColors();

var ANCHOR = {label:'현재', y:4.46};
var DEFAULTS = [
  {key:'2026-07', label:'7월',  fomc:'동결', none:false, ev:'07-28/29 hold',     base:{p:50,y:4.45}, hawk:{p:30,y:4.70}, dove:{p:20,y:4.25}},
  {key:'2026-08', label:'8월',  fomc:'—',   none:true,  ev:'QRA 08-05·대체관세',  base:{p:48,y:4.55}, hawk:{p:32,y:4.80}, dove:{p:20,y:4.30}},
  {key:'2026-09', label:'9월',  fomc:'SEP', none:false, ev:'Warsh 첫 점도표',     base:{p:45,y:4.60}, hawk:{p:33,y:4.85}, dove:{p:22,y:4.35}},
  {key:'2026-10', label:'10월', fomc:'동결', none:false, ev:'선거 직전',          base:{p:44,y:4.62}, hawk:{p:34,y:4.90}, dove:{p:22,y:4.35}},
  {key:'2026-11', label:'11월', fomc:'—',   none:true,  ev:'중간선거 11/3',       base:{p:42,y:4.65}, hawk:{p:35,y:4.95}, dove:{p:23,y:4.35}},
  {key:'2026-12', label:'12월', fomc:'SEP', none:false, ev:'인상 분기점',         base:{p:40,y:4.70}, hawk:{p:35,y:4.95}, dove:{p:25,y:4.35}}
];
var THRESHOLDS = [
  {y:4.52, lab:'4.52 정책트리거', t:'faint'},
  {y:4.85, lab:'4.85 상방경보',   t:'hawk'},
  {y:5.05, lab:'5.05 꼬리',       t:'hawk'}
];
function clone(o){return JSON.parse(JSON.stringify(o));}
var state = clone(DEFAULTS);
var gateHz = 'fragile', gateHk = 'mid';
var seedApplied = false, _seed = null;
var _prevSeed = null; // 1주일 전 스냅샷(현재10Y·연말확률)

function wsum(m){return m.base.p+m.hawk.p+m.dove.p;}
function weighted(m){var s=wsum(m);if(s<=0)return 0;return (m.base.p*m.base.y+m.hawk.p*m.hawk.y+m.dove.p*m.dove.y)/s;}
function f2(v){return v.toFixed(2);}
function el(id){return document.getElementById(id);}
function gateScore(){var hz={holds:-1,fragile:0,breaks:1}[gateHz];var hk={low:-1,mid:0,high:1}[gateHk];return hz+hk;}
function gateState(){
  var s=gateScore();
  if(s<=-1)return{t:'RISK-ON · 게이트 개방',col:COL.dove,dsc:'하방 시나리오 우위 — AI 인프라 우호'};
  if(s>=1) return{t:'RISK-OFF · 게이트 폐쇄',col:COL.hawk,dsc:'상방 시나리오 우위 — 듀레이션·고밸류 압박'};
  return{t:'중립 (현재)',col:COL.base,dsc:'양방향 균형 — 신규 듀레이션 추가 보류'};
}
function renderGate(){
  var g=gateState(),b=el('gateBadge');
  if(!b)return;
  b.style.borderColor=g.col;
  b.querySelector('.dot').style.background=g.col;
  b.querySelector('.t').textContent=g.t;b.querySelector('.t').style.color=g.col;
  b.querySelector('.dsc').textContent=g.dsc;
}
function applyGate(){
  var shift=(gateScore()/2)*18;
  state.forEach(function(m){
    if(shift>0){var mv=Math.min(shift,m.dove.p);m.dove.p-=mv;m.hawk.p+=mv;}
    else if(shift<0){var mv=Math.min(-shift,m.hawk.p);m.hawk.p-=mv;m.dove.p+=mv;}
    m.base.p=Math.round(m.base.p);m.hawk.p=Math.round(m.hawk.p);m.dove.p=Math.round(m.dove.p);
  });
  renderAll();
}
function chart(){
  var W=840,H=380,L=46,R=76,T=24,B=42;
  var xL=L,xR=W-R,yT=T,yB=H-B;
  var yMin=4.0,yMax=5.10;
  var pts=state.length+1;
  var xAt=function(i){return xL+(xR-xL)*i/(pts-1);};
  var yAt=function(v){return yB-(v-yMin)/(yMax-yMin)*(yB-yT);};
  var xs=[ANCHOR].concat(state);
  var s='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">';
  for(var v=4.0;v<=5.0001;v+=0.2){var y=yAt(v);
    s+='<line x1="'+xL+'" y1="'+y+'" x2="'+xR+'" y2="'+y+'" stroke="'+COL.grid+'" stroke-width="1"/>';
    s+='<text x="'+(xL-8)+'" y="'+(y+4)+'" fill="'+COL.axis+'" font-size="14" text-anchor="end" font-family="monospace">'+v.toFixed(1)+'</text>';
  }
  THRESHOLDS.forEach(function(t){if(t.y<yMin||t.y>yMax)return;var y=yAt(t.y);var c=COL[t.t]||COL.faint;
    s+='<line x1="'+xL+'" y1="'+y+'" x2="'+xR+'" y2="'+y+'" stroke="'+c+'" stroke-width="1.4" stroke-dasharray="2,3" opacity="0.85"/>';
    s+='<text x="'+(xR+4)+'" y="'+(y+3.5)+'" fill="'+c+'" font-size="14" font-family="monospace">'+t.lab+'</text>';
  });
  var top='';
  xs.forEach(function(m,i){var x=xAt(i);var hi=(i===0)?ANCHOR.y:m.hawk.y;top+=(i?'L':'M')+x+' '+yAt(hi)+' ';});
  var bot='';
  for(var i=xs.length-1;i>=0;i--){var m=xs[i],x=xAt(i);var lo=(i===0)?ANCHOR.y:m.dove.y;bot+='L'+x+' '+yAt(lo)+' ';}
  s+='<path d="'+top+bot+'Z" fill="'+COL.txt+'" opacity="0.07"/>';
  // 1주일 전 가중 경로 (밴드 없이 가중평균 수치만)
  if(_prevSeed){
    var pst=clone(DEFAULTS), pdec=pst[pst.length-1];
    if(_prevSeed.p){
      if(typeof _prevSeed.p.bull==='number')pdec.dove.p=_prevSeed.p.bull;
      if(typeof _prevSeed.p.base==='number')pdec.base.p=_prevSeed.p.base;
      if(typeof _prevSeed.p.bear==='number')pdec.hawk.p=_prevSeed.p.bear;
    }
    var pAnchor=(typeof _prevSeed.y10==='number')?_prevSeed.y10:ANCHOR.y;
    var pPath=[pAnchor].concat(pst.map(weighted));
    var pl='';
    pPath.forEach(function(v,i){pl+=(i?'L':'M')+xAt(i)+' '+yAt(v)+' ';});
    s+='<path d="'+pl+'" fill="none" stroke="'+COL.faint+'" stroke-width="1.8" stroke-dasharray="4,3" opacity="0.9"/>';
    pPath.forEach(function(v,i){var x=xAt(i);
      s+='<circle cx="'+x+'" cy="'+yAt(v)+'" r="3" fill="'+COL.cardbg+'" stroke="'+COL.faint+'" stroke-width="1.6"><title>'+((i===0)?'현재':pst[i-1].label)+' 1주일 전 가중: '+f2(v)+'%</title></circle>';
      s+='<text x="'+x+'" y="'+(yAt(v)+18)+'" fill="'+COL.faint+'" font-size="14" text-anchor="middle" font-family="monospace">'+f2(v)+'</text>';
    });
  }
  var wl='';
  xs.forEach(function(m,i){var x=xAt(i);var v=(i===0)?ANCHOR.y:weighted(m);wl+=(i?'L':'M')+x+' '+yAt(v)+' ';});
  s+='<path d="'+wl+'" fill="none" stroke="'+COL.txt+'" stroke-width="2.2"/>';
  xs.forEach(function(m,i){var x=xAt(i);
    if(i>0){
      [['hawk',COL.hawk],['base',COL.base],['dove',COL.dove]].forEach(function(a){var k=a[0],c=a[1];
        s+='<circle cx="'+x+'" cy="'+yAt(m[k].y)+'" r="3" fill="'+c+'"><title>'+m.label+' '+k+': '+f2(m[k].y)+'% (p='+Math.round(m[k].p*100/wsum(m))+'%)</title></circle>';
      });
    }
    var wv=(i===0)?ANCHOR.y:weighted(m);
    s+='<circle cx="'+x+'" cy="'+yAt(wv)+'" r="4.5" fill="'+COL.cardbg+'" stroke="'+COL.txt+'" stroke-width="2.2"><title>'+((i===0)?'현재':m.label)+' 가중: '+f2(wv)+'%</title></circle>';
    s+='<text x="'+x+'" y="'+(yAt(wv)-12)+'" fill="'+COL.txt+'" font-size="14" text-anchor="middle" font-family="monospace" font-weight="700">'+f2(wv)+'</text>';
    s+='<text x="'+x+'" y="'+(yB+20)+'" fill="'+COL.axis+'" font-size="14" text-anchor="middle">'+((i===0)?'현재':m.label)+'</text>';
  });
  s+='</svg>';
  el('chart').innerHTML=s;
}
function npc(mk,scen,fld,v){return '<input class="np'+(fld==='y'?' ny':'')+'" type="number" step="'+(fld==='y'?'0.01':'1')+'" data-m="'+mk+'" data-s="'+scen+'" data-f="'+fld+'" value="'+v+'">';}
function renderTable(){
  if(!el('tbody'))return;
  var h='';
  state.forEach(function(m){
    var s=wsum(m),w=weighted(m);
    h+='<tr>'
      +'<td class="lft"><b>'+m.label+'</b><div class="ev">'+m.ev+'</div></td>'
      +'<td><span class="fomc'+(m.none?' none':'')+'">'+m.fomc+'</span></td>'
      +'<td>'+npc(m.key,'base','p',m.base.p)+'<span class="pp">%</span> '+npc(m.key,'base','y',m.base.y)+'</td>'
      +'<td>'+npc(m.key,'hawk','p',m.hawk.p)+'<span class="pp">%</span> '+npc(m.key,'hawk','y',m.hawk.y)+'</td>'
      +'<td>'+npc(m.key,'dove','p',m.dove.p)+'<span class="pp">%</span> '+npc(m.key,'dove','y',m.dove.y)+'</td>'
      +'<td><span class="sumbad'+(Math.round(s)!==100?' bad':'')+'">'+Math.round(s)+'</span></td>'
      +'<td><span class="wexp">'+f2(w)+'</span></td>'
      +'</tr>';
  });
  el('tbody').innerHTML=h;
  document.querySelectorAll('#rates-engine #tbody input.np').forEach(function(inp){
    inp.addEventListener('input',function(e){
      var m=state.find(function(x){return x.key===e.target.dataset.m;});
      var val=parseFloat(e.target.value);if(isNaN(val))return;
      m[e.target.dataset.s][e.target.dataset.f]=val;
      var row=e.target.closest('tr');
      var ss=wsum(m);
      row.querySelector('.sumbad').textContent=Math.round(ss);
      row.querySelector('.sumbad').className='sumbad'+(Math.round(ss)!==100?' bad':'');
      row.querySelector('.wexp').textContent=f2(weighted(m));
      chart();renderStats();
    });
  });
}
function renderStats(){
  var dec=state[state.length-1];
  var w=weighted(dec);
  var rows=[
    {lab:'현재 10Y',val:f2(ANCHOR.y),d:ANCHOR.d||'data.json 시드'},
    {lab:'연말(12월) 가중',val:f2(w),d:'확률가중 기대치'},
    {lab:'12월 상방(Hawkish)',val:f2(dec.hawk.y),d:'p='+Math.round(dec.hawk.p*100/wsum(dec))+'%'},
    {lab:'12월 하방(Dovish)',val:f2(dec.dove.y),d:'p='+Math.round(dec.dove.p*100/wsum(dec))+'%'}
  ];
  el('statRow').innerHTML=rows.map(function(r){return '<div class="estat"><div class="lab">'+r.lab+'</div><div class="val">'+r.val+'<span class="pct">%</span></div><div class="d">'+r.d+'</div></div>';}).join('');
}
var FACTORS=[
  ['CPI/PCE 서프라이즈','+5~12bp / 0.1%p 상회','며칠~수주','고착·인상 레짐 증폭'],
  ['Fed 도트 매파(인하 1회 제거)','+10~20bp','다음 회의까지','hold↔hike 전환 최민감'],
  ['고용(NFP)','±5~10bp / 10만 빗나감','단기','2026 노동안정으로 약화'],
  ['유가(지속 +$10/bbl)','10Y +5~15bp · 인플레 +35~40bp','유가 잔존 비례','공급쇼크 core 침투'],
  ['관세 라운드','+15~30bp','정책 되돌림 민감','core goods 패스스루 61~86%'],
  ['리펀딩(장기물↑)','+5~20bp','분기','2026 쿠폰동결 중립·2027 리스크'],
  ['기간프리미엄 재평가','+0.7%p 누적·구조적','영속','ACM ~0.6~0.8% (봄 2026)'],
  ['신용강등','+0~5bp','일시적','강제매도 없음'],
  ['AI capex 크라우딩','한계적 상방·스티프너','구조적','~$360B 10y등가 = UST의 ~1/8'],
  ['Flight-to-quality','전통 −10~30bp → 2025~26 0~+30bp','이벤트','안전베타 약화']
];
function renderFactors(){
  var tb=document.querySelector('#rates-engine #ftbl tbody');
  if(!tb)return;
  tb.innerHTML=FACTORS.map(function(r){return '<tr><td><b>'+r[0]+'</b></td><td class="bp">'+r[1]+'</td><td class="ev">'+r[2]+'</td><td class="ev">'+r[3]+'</td></tr>';}).join('');
}
/* ----- 10Y 분해 뷰: 실질 + BEI ----- */
var DC={ realBase:2.05, beiBase:2.44, levers:{
  oil:    {comp:'bei',  v:0, label:'유가'},
  infl:   {comp:'bei',  v:0, label:'인플레 ex-oil'},
  fed:    {comp:'real', v:0, label:'Fed 정책경로'},
  tp:     {comp:'real', v:0, label:'기간프리미엄·재정'},
  growth: {comp:'real', v:0, label:'성장·노동'}
}};
function sumComp(c){var s=0;for(var k in DC.levers){if(DC.levers[k].comp===c)s+=DC.levers[k].v;}return s;}
function dReal(){return DC.realBase+sumComp('real')/100;}
function dBei(){return DC.beiBase+sumComp('bei')/100;}
function dbar(real,bei,label,emph){
  var SCALE=5.4;
  var rw=Math.max(0,real)/SCALE*100, bw=Math.max(0,bei)/SCALE*100;
  return '<div class="dbarrow"><div class="dblab">'+label+'</div><div class="dbar">'
    +'<div class="dseg real" style="width:'+rw+'%">'+(rw>9?real.toFixed(2):'')+'</div>'
    +'<div class="dseg bei" style="width:'+bw+'%">'+(bw>9?bei.toFixed(2):'')+'</div>'
    +'</div><div class="dbtot'+(emph?' emph':'')+'">'+(real+bei).toFixed(2)+'%</div></div>';
}
function renderDecomp(){
  if(!el('dbars'))return;
  var rb=DC.realBase,bb=DC.beiBase,nb=rb+bb;
  var r=dReal(),b=dBei(),n=r+b;
  el('dbars').innerHTML=dbar(rb,bb,'기준',false)+dbar(r,b,'조정',true);
  for(var k in DC.levers){
    var e=el('v_'+k); if(!e)continue;
    var v=DC.levers[k].v; e.textContent=(v>0?'+':'')+v+'bp';
    e.style.color = v===0 ? 'var(--text-secondary)' : (DC.levers[k].comp==='bei'?'var(--dbei)':'var(--dreal)');
  }
  var dN=Math.round((n-nb)*100);
  var tabs=0; for(var k2 in DC.levers) tabs+=Math.abs(DC.levers[k2].v);
  var chips='';
  if(tabs>0){
    for(var k3 in DC.levers){var l=DC.levers[k3]; if(l.v===0)continue;
      var sh=Math.round(Math.abs(l.v)/tabs*100);
      chips+='<span class="dchip '+l.comp+'">'+l.label+' '+(l.v>0?'+':'')+l.v+'bp · '+sh+'%</span>';
    }
  } else { chips='<span style="color:var(--text-tertiary)">레버를 움직이면 각 드라이버의 기여 비중이 표시됩니다.</span>'; }
  el('dout').innerHTML=
    '명목 10Y = <b>'+n.toFixed(2)+'%</b> ('+(dN>=0?'Δ +':'Δ ')+dN+'bp) · 실질 <b>'+r.toFixed(2)+'</b> · BEI <b>'+b.toFixed(2)+'</b><br>'
    +'<span style="font-size:11.5px">드라이버 기여 비중: </span>'+chips;
}
function bindLevers(){
  document.querySelectorAll('#rates-engine .lvr').forEach(function(s){
    s.addEventListener('input',function(e){
      DC.levers[e.target.dataset.k].v=parseInt(e.target.value,10);
      renderDecomp();
    });
  });
  var dr=el('decompReset');
  if(dr)dr.addEventListener('click',function(){
    for(var k in DC.levers)DC.levers[k].v=0;
    document.querySelectorAll('#rates-engine .lvr').forEach(function(s){s.value=0;});
    renderDecomp();
  });
  var go=el('gateOilBtn');
  if(go)go.addEventListener('click',function(){
    var map={holds:-20,fragile:0,breaks:45};
    DC.levers.oil.v=map[gateHz];
    var so=el('s_oil'); if(so)so.value=DC.levers.oil.v;
    renderDecomp();
  });
}
/* ----- CME FedWatch 내재 정책금리 경로 ----- */
var FW=[["6/26",3.621,0.031],["7/26",3.643,0.076],["9/26",3.694,0.126],["10/26",3.733,0.156],["12/26",3.813,0.195],["1/27",3.853,0.215],["3/27",3.918,0.241],["4/27",3.950,0.256],["6/27",3.953,0.257],["7/27",3.953,0.257],["9/27",3.929,0.267],["10/27",3.904,0.276],["12/27",3.838,0.297]];
// 1주일 전(2026-05-28) 회의별 가중평균 내재금리 — CME FedWatch History 분포 기반.
// 9 Jun 2027(6/27) 이후 회의는 당시 분포 데이터가 없어 라인 미표시.
var FW_PREV={"6/26":3.626,"7/26":3.643,"9/26":3.690,"10/26":3.713,"12/26":3.775,"1/27":3.798,"3/27":3.851,"4/27":3.873,"6/27":3.873};
var FWCUR=3.625;
function fwChart(){
  if(!el('fwchart'))return;
  var W=840,H=360,L=44,R=18,T=26,B=48;
  var xL=L,xR=W-R,yT=T,yB=H-B;
  var yMin=3.2,yMax=4.4;
  var n=FW.length;
  var xAt=function(i){return xL+(xR-xL)*i/(n-1);};
  var yAt=function(v){return yB-(v-yMin)/(yMax-yMin)*(yB-yT);};
  var s='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">';
  for(var v=3.25;v<=4.4001;v+=0.25){var y=yAt(v);
    s+='<line x1="'+xL+'" y1="'+y+'" x2="'+xR+'" y2="'+y+'" stroke="'+COL.grid+'"/>';
    s+='<text x="'+(xL-7)+'" y="'+(y+4)+'" fill="'+COL.axis+'" font-size="14" text-anchor="end" font-family="monospace">'+v.toFixed(2)+'</text>';
  }
  var yc=yAt(FWCUR);
  s+='<line x1="'+xL+'" y1="'+yc+'" x2="'+xR+'" y2="'+yc+'" stroke="'+COL.faint+'" stroke-width="1.4" stroke-dasharray="3,3"/>';
  s+='<text x="'+(xR-2)+'" y="'+(yc-5)+'" fill="'+COL.axis+'" font-size="14" text-anchor="end" font-family="monospace">현재 3.625</text>';
  var top='',bot='';
  FW.forEach(function(d,i){top+=(i?'L':'M')+xAt(i)+' '+yAt(d[1]+d[2])+' ';});
  for(var i=FW.length-1;i>=0;i--){bot+='L'+xAt(i)+' '+yAt(FW[i][1]-FW[i][2])+' ';}
  s+='<path d="'+top+bot+'Z" fill="'+COL.brand+'" opacity="0.13"/>';
  // 1주일 전 가중평균 경로 (밴드 없이 라인 + 수치만)
  var pv=[];FW.forEach(function(d,i){if(FW_PREV[d[0]]!=null)pv.push([i,FW_PREV[d[0]]]);});
  if(pv.length){
    var pl='';pv.forEach(function(p,k){pl+=(k?'L':'M')+xAt(p[0])+' '+yAt(p[1])+' ';});
    s+='<path d="'+pl+'" fill="none" stroke="'+COL.faint+'" stroke-width="1.8" stroke-dasharray="4,3" opacity="0.9"/>';
    pv.forEach(function(p){var x=xAt(p[0]),y=yAt(p[1]);
      s+='<circle cx="'+x+'" cy="'+y+'" r="3" fill="'+COL.cardbg+'" stroke="'+COL.faint+'" stroke-width="1.6"><title>'+FW[p[0]][0]+' 1주일 전 가중: '+p[1].toFixed(3)+'%</title></circle>';
      s+='<text x="'+x+'" y="'+(y+15)+'" fill="'+COL.faint+'" font-size="14" text-anchor="middle" font-family="monospace">'+p[1].toFixed(2)+'</text>';
    });
  }
  var ml='';FW.forEach(function(d,i){ml+=(i?'L':'M')+xAt(i)+' '+yAt(d[1])+' ';});
  s+='<path d="'+ml+'" fill="none" stroke="'+COL.brand+'" stroke-width="2.4"/>';
  var pk=0;FW.forEach(function(d,i){if(d[1]>FW[pk][1])pk=i;});
  FW.forEach(function(d,i){var x=xAt(i),y=yAt(d[1]);
    s+='<circle cx="'+x+'" cy="'+y+'" r="3.4" fill="'+COL.cardbg+'" stroke="'+COL.brand+'" stroke-width="2"><title>'+d[0]+': '+d[1].toFixed(3)+'% (±'+Math.round(d[2]*100)+'bp)</title></circle>';
    s+='<text x="'+x+'" y="'+(yB+15)+'" fill="'+COL.axis+'" font-size="14" text-anchor="end" font-family="monospace" transform="rotate(-42 '+x+' '+(yB+15)+')">'+d[0]+'</text>';
  });
  var px=xAt(pk),py=yAt(FW[pk][1]);
  s+='<text x="'+px+'" y="'+(py-10)+'" fill="'+COL.txt+'" font-size="14" text-anchor="middle" font-family="monospace" font-weight="700">피크 '+FW[pk][1].toFixed(2)+'</text>';
  s+='</svg>';
  el('fwchart').innerHTML=s;
}
function fwReadout(){
  if(!el('fwout'))return;
  var pk=0;FW.forEach(function(d,i){if(d[1]>FW[pk][1])pk=i;});
  var cur=FW[0][1],peak=FW[pk][1],last=FW[FW.length-1][1];
  el('fwout').innerHTML=
    '현재 <b>'+cur.toFixed(2)+'%</b> → 피크 <b>'+peak.toFixed(2)+'%</b> ('+FW[pk][0]+', '+Math.round((peak-cur)*100)+'bp) → \'27말 <b>'+last.toFixed(2)+'%</b><br>'
    +'<span style="font-size:11.5px">시장은 향후 ~1회 인상을 2027 중반까지 가격화 후 소폭 되돌림. σ 0.03→0.30%로 확산(불확실성 콘).</span>';
}
function renderAll(){renderStats();chart();renderTable();renderGate();}

function reapplySeed(){
  if(!_seed)return;
  if(typeof _seed.y10==='number'){ANCHOR.y=_seed.y10;ANCHOR.d='data.json '+(_seed.date||'');}
  var dec=state[state.length-1];
  if(_seed.p){
    if(typeof _seed.p.bull==='number')dec.dove.p=_seed.p.bull;
    if(typeof _seed.p.base==='number')dec.base.p=_seed.p.base;
    if(typeof _seed.p.bear==='number')dec.hawk.p=_seed.p.bear;
  }
}

function bind(){
  var segHz=el('segHz'),segHk=el('segHk'),applyBtn=el('applyBtn'),resetBtn=el('resetBtn');
  if(segHz)segHz.addEventListener('click',function(e){
    if(e.target.tagName!=='BUTTON')return;gateHz=e.target.dataset.v;
    [].slice.call(e.currentTarget.children).forEach(function(b){b.classList.toggle('on',b===e.target);});renderGate();
  });
  if(segHk)segHk.addEventListener('click',function(e){
    if(e.target.tagName!=='BUTTON')return;gateHk=e.target.dataset.v;
    [].slice.call(e.currentTarget.children).forEach(function(b){b.classList.toggle('on',b===e.target);});renderGate();
  });
  if(applyBtn)applyBtn.addEventListener('click',applyGate);
  if(resetBtn)resetBtn.addEventListener('click',function(){state=clone(DEFAULTS);if(seedApplied)reapplySeed();renderAll();});
  var foot=el('foot');
  if(foot)foot.innerHTML='출처: FRED(DGS10·DFII10·T10YIE·ACMTP10) · NY Fed ACM term premium · CME FedWatch · US Treasury 분기 리펀딩(2026-05) · FOMC SEP · Dallas Fed Trimmed-Mean PCE · BLS CPI · BEA PCE · Bloomberg/Reuters/CNBC/CNN · Moody\'s · Yale Budget Lab. 현재 10Y·연말 시나리오 확률은 이 사이트의 data.json에서 시드됩니다.<br>※ 이 페이지는 추정 보조도구이며 방향 처방이 아닌 조건부 리스크사이징 입력값입니다. 시나리오 입력값은 새로고침 시 기본값으로 초기화됩니다.';
  if(window.matchMedia){
    try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){loadColors();renderAll();fwChart();});}catch(e){}
  }
}

function init(){
  if(!el('rates-engine'))return;
  bind();
  renderFactors();renderAll();
  bindLevers();renderDecomp();
  fwChart();fwReadout();
  fetch('./data.json?t='+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(d&&d.history&&d.history.length){
      var h=d.history[d.history.length-1];
      _seed={y10:(h.markets&&h.markets.ten_year),p:h.probabilities,date:h.date};
      reapplySeed();seedApplied=true;
      // 1주일 전(7일 영업기준) 스냅샷 — 가중 경로 비교용
      if(d.history.length>=8){
        var hp=d.history[d.history.length-8];
        _prevSeed={y10:(hp.markets&&hp.markets.ten_year),p:hp.probabilities,date:hp.date};
      }
      var us=el('updStat');if(us)us.textContent='data.json '+h.date+' · 현재10Y·연말확률 시드';
    }
    renderAll();
  }).catch(function(){});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();
