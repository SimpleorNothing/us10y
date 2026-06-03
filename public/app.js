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
    s+='<text x="'+(xR+4)+'" y="'+(y+3.5)+'" fill="'+c+'" font-size="12" font-family="monospace">'+t.lab+'</text>';
  });
  var top='';
  xs.forEach(function(m,i){var x=xAt(i);var hi=(i===0)?ANCHOR.y:m.hawk.y;top+=(i?'L':'M')+x+' '+yAt(hi)+' ';});
  var bot='';
  for(var i=xs.length-1;i>=0;i--){var m=xs[i],x=xAt(i);var lo=(i===0)?ANCHOR.y:m.dove.y;bot+='L'+x+' '+yAt(lo)+' ';}
  s+='<path d="'+top+bot+'Z" fill="'+COL.txt+'" opacity="0.07"/>';
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
  if(foot)foot.innerHTML='출처: FRED(DGS10·DFII10·T10YIE·ACMTP10) · NY Fed ACM term premium · CME FedWatch · US Treasury 분기 리펀딩 · FOMC SEP · Dallas Fed Trimmed-Mean PCE · BLS/BEA · Bloomberg/Reuters/CNBC. 현재 10Y·연말 시나리오 확률은 이 사이트의 data.json에서 시드됩니다.<br>※ 추정 보조도구이며 방향 처방이 아닌 조건부 리스크사이징 입력값입니다. 시나리오 입력값은 새로고침 시 기본값으로 초기화됩니다.';
  if(window.matchMedia){
    try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){loadColors();renderAll();});}catch(e){}
  }
}

function init(){
  if(!el('rates-engine'))return;
  bind();
  renderFactors();renderAll();
  fetch('./data.json?t='+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(d&&d.history&&d.history.length){
      var h=d.history[d.history.length-1];
      _seed={y10:(h.markets&&h.markets.ten_year),p:h.probabilities,date:h.date};
      reapplySeed();seedApplied=true;
      var us=el('updStat');if(us)us.textContent='data.json '+h.date+' · 현재10Y·연말확률 시드';
    }
    renderAll();
  }).catch(function(){});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();
