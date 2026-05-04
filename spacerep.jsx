import { useState, useEffect, useCallback, useRef } from "react";

/* ─── SM-2 Algorithm ─── */
function makeCard(q, a, deck, qImgs = [], aImgs = [], author = "") {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    question: q, answer: a, deck, qImages: qImgs, aImages: aImgs, author,
    ease: 2.5, interval: 0, repetitions: 0,
    dueDate: Date.now(), created: Date.now(), lastReview: null, history: []
  };
}

function reviewCard(card, quality) {
  const q = [0, 2, 3, 5][quality];
  let { ease, interval, repetitions } = card;
  const now = Date.now();
  if (q < 3) {
    repetitions = 0;
    interval = quality === 1 ? Math.max(1, Math.round(interval * 0.5)) : 0;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * ease);
    repetitions++;
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  if (quality === 3) interval = Math.round(interval * 1.3);
  return {
    ...card, ease, interval, repetitions,
    dueDate: now + interval * 86400000, lastReview: now,
    history: [...card.history, { date: now, quality, interval }]
  };
}

/* ─── Constants ─── */
const DECKS = ["ECON 233", "ECON 305", "MATH 232"];
const DCLR = { "ECON 233": "#6366f1", "ECON 305": "#f59e0b", "MATH 232": "#10b981" };
const VIEW = { DASH: "dash", REVIEW: "review", ADD: "add", BROWSE: "browse", EXPORT: "export", SHARED: "shared" };
const MY_CARDS = "spacerep-my-v4";
const ACTIVITY_KEY = "spacerep-activity-v1";
const SHARED_PFX = "spacerep-shared-deck:";
const PROFILE_KEY = "spacerep-profile-v1";
const PROGRESS_KEY = "spacerep-progress-v1";
const GITHUB_KEY = "spacerep-github-v1";

/* ─── Storage ─── */
async function ld(key, fb, shared = false) {
  try { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : fb; }
  catch { return fb; }
}
async function sv(key, val, shared = false) {
  try { await window.storage.set(key, JSON.stringify(val), shared); } catch (e) { console.error(e); }
}
const toDS = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

/* ─── LaTeX ─── */
function rLatex(r) {
  r = r.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g,
    '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px"><span style="border-bottom:1px solid #aaa;padding:0 4px">$1</span><span style="padding:0 4px">$2</span></span>');
  r = r.replace(/\^{([^}]*)}/g, "<sup>$1</sup>");
  r = r.replace(/\^([a-zA-Z0-9*'])/g, "<sup>$1</sup>");
  r = r.replace(/_{([^}]*)}/g, "<sub>$1</sub>");
  r = r.replace(/_([a-zA-Z0-9])/g, "<sub>$1</sub>");
  const G = { alpha:"\u03b1",beta:"\u03b2",gamma:"\u03b3",delta:"\u03b4",epsilon:"\u03b5",theta:"\u03b8",lambda:"\u03bb",mu:"\u03bc",pi:"\u03c0",sigma:"\u03c3",rho:"\u03c1",phi:"\u03c6",psi:"\u03c8",omega:"\u03c9",Delta:"\u0394",Sigma:"\u03a3",Pi:"\u03a0",Omega:"\u03a9",Gamma:"\u0393",Lambda:"\u039b",infty:"\u221e",partial:"\u2202",nabla:"\u2207",pm:"\u00b1",times:"\u00d7",cdot:"\u00b7",leq:"\u2264",geq:"\u2265",neq:"\u2260",approx:"\u2248",sum:"\u2211",prod:"\u220f",int:"\u222b",forall:"\u2200",exists:"\u2203",in:"\u2208",subset:"\u2282",cup:"\u222a",cap:"\u2229",rightarrow:"\u2192",Rightarrow:"\u21d2",leftarrow:"\u2190" };
  for (const [k, v] of Object.entries(G)) r = r.replace(new RegExp("\\\\"+k+"(?![a-zA-Z])","g"), v);
  r = r.replace(/\\text\{([^}]*)\}/g, '<span style="font-style:normal;font-family:sans-serif">$1</span>');
  r = r.replace(/\\mathbf\{([^}]*)\}/g, "<b>$1</b>");
  r = r.replace(/\\overline\{([^}]*)\}/g, '<span style="text-decoration:overline">$1</span>');
  r = r.replace(/\\hat\{([^}]*)\}/g, "$1\u0302");
  r = r.replace(/\\dot\{([^}]*)\}/g, "$1\u0307");
  r = r.replace(/\\sqrt\{([^}]*)\}/g, "\u221a($1)");
  r = r.replace(/\\qquad/g, '<span style="margin:0 12px"></span>');
  r = r.replace(/\\quad/g, '<span style="margin:0 6px"></span>');
  r = r.replace(/\\;/g, '<span style="margin:0 3px"></span>');
  r = r.replace(/\\,/g, '<span style="margin:0 2px"></span>');
  r = r.replace(/\\\s/g, '<span style="margin:0 4px"></span>');
  r = r.replace(/\\!/g, '<span style="margin:0 -1px"></span>');
  r = r.replace(/\\left[(\[{]/g, m => m.slice(-1));
  r = r.replace(/\\right[)\]}]/g, m => m.slice(-1));
  r = r.replace(/\\begin\{[bp]?matrix\}([\s\S]*?)\\end\{[bp]?matrix\}/g, (_, body) => {
    const rows = body.trim().split("\\\\").map(row => row.trim().split("&").map(c => c.trim()));
    const n = rows[0]?.length || 1;
    let h = `<span style="display:inline-flex;align-items:center;vertical-align:middle">[<span style="display:inline-grid;grid-template-columns:repeat(${n}, auto);gap:2px 10px;padding:2px 6px">`;
    for (const row of rows) for (const cell of row) h += `<span style="text-align:center">${rLatex(cell)}</span>`;
    return h + "</span>]</span>";
  });
  r = r.replace(/\\[a-zA-Z]+/g, "");
  return r;
}

/* ─── R Highlighting ─── */
function hlR(code) {
  let h = code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  h = h.replace(/(#[^\n]*)/g, '<span style="color:#6b7280;font-style:italic">$1</span>');
  h = h.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span style="color:#a5d6a7">$1</span>');
  const kw = ["function","if","else","for","while","repeat","in","next","break","return","TRUE","FALSE","NULL","NA","Inf","NaN","library","require"];
  for (const k of kw) h = h.replace(new RegExp(`\\b(${k})\\b`,"g"), '<span style="color:#c792ea">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#f78c6c">$1</span>');
  const fns = ["lm","summary","plot","ggplot","aes","geom_point","geom_line","data\\.frame","c","mean","sd","var","cor","t\\.test","read\\.csv","print","str","head","tail","length","seq","rep","matrix","solve","det","eigen","cbind","rbind"];
  for (const f of fns) h = h.replace(new RegExp(`\\b(${f})(?=\\()`,"g"), '<span style="color:#82aaff">$1</span>');
  h = h.replace(/(<-|->|~|%>%|\|>)/g, '<span style="color:#89ddff">$1</span>');
  return h;
}

/* ─── Render Content ─── */
function rc(text) {
  if (!text) return { __html: "" };
  let h = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  h = h.replace(/```r\n?([\s\S]*?)```/g, (_, c) =>
    `<pre style="background:#1a1a2e;padding:10px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5;font-family:monospace;margin:8px 0">${hlR(c.trim())}</pre>`);
  h = h.replace(/```\n?([\s\S]*?)```/g, (_, c) =>
    `<pre style="background:#1a1a2e;padding:10px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5;font-family:monospace;margin:8px 0">${c.trim()}</pre>`);
  h = h.replace(/`([^`]+)`/g, '<code style="background:#1a1a2e;padding:2px 6px;border-radius:3px;font-size:13px;font-family:monospace">$1</code>');
  h = h.replace(/\$\$([\s\S]*?)\$\$/g, (_, e) =>
    `<div style="text-align:center;margin:8px 0;font-size:18px;font-style:italic">${rLatex(e.trim())}</div>`);
  h = h.replace(/\$([^$\n]+?)\$/g, (_, e) =>
    `<span style="font-style:italic">${rLatex(e.trim())}</span>`);
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\n/g, "<br/>");
  return { __html: h };
}

/* ─── ImageGallery ─── */
function ImageGallery({ images, onRemove, editable }) {
  if (!images || !images.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
      {images.map((img, i) => (
        <div key={i} style={{ position: "relative" }}>
          <img src={img} alt="" style={{ maxWidth: 280, maxHeight: 200, borderRadius: 8, border: "1px solid #2a2a45", objectFit: "contain", background: "#161b22" }}
            onError={e => { e.target.style.display = "none"; }} />
          {editable && onRemove && (
            <button onClick={() => onRemove(i)} style={{ position: "absolute", top: 4, right: 4, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Ebbinghaus Curve ─── */
function EbbinghausCurve({ cards, deck }) {
  const now = Date.now();
  const allCards = cards.filter(c => !deck || c.deck === deck);
  const dueNow = allCards.filter(c => c.dueDate <= now);

  // Group cards by their interval (days since last review or creation)
  // Buckets: 0 (new), <1d, 1d, 2-3d, 4-7d, 8-14d, 15-30d, 31-60d, 60d+
  const buckets = [
    { label: "New", min: 0, max: 0, color: "#6366f1" },
    { label: "<1d", min: 0.01, max: 1, color: "#ef4444" },
    { label: "1d", min: 1, max: 2, color: "#f97316" },
    { label: "2-3d", min: 2, max: 4, color: "#f59e0b" },
    { label: "4-7d", min: 4, max: 8, color: "#eab308" },
    { label: "1-2w", min: 8, max: 15, color: "#84cc16" },
    { label: "2-4w", min: 15, max: 31, color: "#22c55e" },
    { label: "1-2m", min: 31, max: 61, color: "#10b981" },
    { label: "2m+", min: 61, max: Infinity, color: "#059669" },
  ];

  // Place each card into a bucket based on interval
  const bucketCounts = buckets.map(b => ({
    ...b,
    total: allCards.filter(c => {
      if (b.max === 0) return c.interval === 0;
      return c.interval >= b.min && c.interval < b.max;
    }).length,
    due: dueNow.filter(c => {
      if (b.max === 0) return c.interval === 0;
      return c.interval >= b.min && c.interval < b.max;
    }).length,
  }));

  const maxTotal = Math.max(1, ...bucketCounts.map(b => b.total));

  // Ebbinghaus retention curve points (theoretical)
  // R(t) = e^(-t/S) where S is stability
  const curvePoints = [];
  const W = 320;
  const H = 120;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Draw multiple forgetting curves for different review stages
  const stabilities = [
    { s: 1, label: "1st review", color: "#ef444480" },
    { s: 3, label: "2nd review", color: "#f59e0b80" },
    { s: 10, label: "3rd review", color: "#22c55e80" },
    { s: 30, label: "4th+ review", color: "#10b98180" },
  ];

  const maxDays = 60;
  const xScale = (d) => padL + (d / maxDays) * chartW;
  const yScale = (r) => padT + (1 - r) * chartH;

  // Generate curve paths
  const curvePaths = stabilities.map(({ s, color }) => {
    let path = "";
    for (let t = 0; t <= maxDays; t += 0.5) {
      const retention = Math.exp(-t / s);
      const x = xScale(t);
      const y = yScale(retention);
      path += (t === 0 ? "M" : "L") + `${x},${y}`;
    }
    return { path, color };
  });

  // Position due card dots on the curve
  const cardDots = [];
  for (const c of dueNow) {
    const daysSinceReview = c.lastReview ? (now - c.lastReview) / 86400000 : (now - c.created) / 86400000;
    const stability = Math.max(1, c.interval || 1);
    const retention = Math.exp(-daysSinceReview / stability);
    const xDay = Math.min(daysSinceReview, maxDays);
    cardDots.push({
      x: xScale(xDay),
      y: yScale(Math.max(0, Math.min(1, retention))),
      deck: c.deck,
      interval: c.interval,
      retention: Math.round(retention * 100),
    });
  }

  if (allCards.length === 0) return null;

  return (
    <div style={{ background: "#0d1117", borderRadius: 12, padding: 16, border: "1px solid #21262d", marginTop: 16 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#e6edf3" }}>📉 Ebbinghaus Forgetting Curve</h3>
      <p style={{ margin: "0 0 12px", fontSize: 11, color: "#8b949e" }}>
        Where your {dueNow.length} due cards sit on the retention curve
      </p>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 500 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(r => (
          <g key={r}>
            <line x1={padL} y1={yScale(r)} x2={W - padR} y2={yScale(r)} stroke="#21262d" strokeWidth="0.5" />
            <text x={padL - 4} y={yScale(r) + 3} fill="#484f58" fontSize="7" textAnchor="end">{Math.round(r * 100)}%</text>
          </g>
        ))}
        {/* X axis labels */}
        {[0, 7, 14, 30, 60].map(d => (
          <g key={d}>
            <line x1={xScale(d)} y1={padT} x2={xScale(d)} y2={H - padB} stroke="#21262d" strokeWidth="0.5" strokeDasharray="2,2" />
            <text x={xScale(d)} y={H - padB + 12} fill="#484f58" fontSize="7" textAnchor="middle">{d}d</text>
          </g>
        ))}
        {/* Forgetting curves */}
        {curvePaths.map((cp, i) => (
          <path key={i} d={cp.path} fill="none" stroke={cp.color} strokeWidth="1.5" />
        ))}
        {/* Due card dots */}
        {cardDots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r="3"
            fill={DCLR[dot.deck] || "#6366f1"} stroke="#0d1117" strokeWidth="1" opacity="0.85">
            <title>{`${dot.deck} | Interval: ${dot.interval}d | Est. retention: ${dot.retention}%`}</title>
          </circle>
        ))}
        {/* Axis labels */}
        <text x={W / 2} y={H - 2} fill="#8b949e" fontSize="8" textAnchor="middle">Days since last review</text>
        <text x={8} y={H / 2} fill="#8b949e" fontSize="8" textAnchor="middle" transform={`rotate(-90, 8, ${H / 2})`}>Retention</text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", fontSize: 10 }}>
        {stabilities.map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 16, height: 2, background: color, borderRadius: 1 }} />
            <span style={{ color: "#8b949e" }}>{label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1" }} />
          <span style={{ color: "#8b949e" }}>Due cards</span>
        </div>
      </div>

      {/* Bucket bar chart */}
      <div style={{ marginTop: 14, borderTop: "1px solid #21262d", paddingTop: 12 }}>
        <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 8 }}>Card distribution by interval</div>
        <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 50 }}>
          {bucketCounts.map((b, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ fontSize: 8, color: b.due > 0 ? "#e6edf3" : "#484f58" }}>{b.due > 0 ? b.due : ""}</div>
              <div style={{ width: "100%", position: "relative", height: 36 }}>
                {/* Total bar */}
                <div style={{
                  position: "absolute", bottom: 0, width: "100%",
                  height: `${Math.max(2, (b.total / maxTotal) * 36)}px`,
                  background: "#21262d", borderRadius: 2
                }} />
                {/* Due portion */}
                {b.due > 0 && (
                  <div style={{
                    position: "absolute", bottom: 0, width: "100%",
                    height: `${Math.max(2, (b.due / maxTotal) * 36)}px`,
                    background: b.color, borderRadius: 2, opacity: 0.9
                  }} />
                )}
              </div>
              <div style={{ fontSize: 7, color: "#8b949e", whiteSpace: "nowrap" }}>{b.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, background: "#21262d", borderRadius: 2 }} />
            <span style={{ color: "#8b949e" }}>Total cards</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, background: "#22c55e", borderRadius: 2 }} />
            <span style={{ color: "#8b949e" }}>Due now</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Heatmap ─── */
function Heatmap({ activity, cards }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 24 * 7 + 1);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days = [];
  const d = new Date(startDate);
  while (d <= today) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }

  const weekCols = [];
  let cur = [];
  for (const day of days) {
    if (day.getDay() === 0 && cur.length > 0) { weekCols.push(cur); cur = []; }
    cur.push(day);
  }
  if (cur.length > 0) weekCols.push(cur);

  const allC = Object.values(activity);
  const mx = Math.max(1, ...allC);
  const gl = (c) => c === 0 ? 0 : c <= mx * 0.25 ? 1 : c <= mx * 0.5 ? 2 : c <= mx * 0.75 ? 3 : 4;
  const cls = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
  const mos = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  let streak = 0;
  const chk = new Date(today);
  while (true) {
    const k = toDS(chk);
    if (activity[k] > 0) { streak++; chk.setDate(chk.getDate() - 1); }
    else break;
  }

  const tot = allC.reduce((s, c) => s + c, 0);
  const actD = allC.filter(c => c > 0).length;
  const tk = toDS(today);
  const tc = activity[tk] || 0;

  return (
    <div style={{ background: "#0d1117", borderRadius: 12, padding: 16, border: "1px solid #21262d" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "#e6edf3" }}>📅 Study Activity</h3>
        <div style={{ display: "flex", gap: 12, fontSize: 12, flexWrap: "wrap" }}>
          <span style={{ color: "#8b949e" }}>{tot} reviews</span>
          <span style={{ color: "#8b949e" }}>{actD} active days</span>
          <span style={{ color: streak > 0 ? "#39d353" : "#8b949e" }}>🔥 {streak} day streak</span>
        </div>
      </div>
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 6, paddingTop: 18 }}>
          {["", "Mon", "", "Wed", "", "Fri", ""].map((l, i) => (
            <div key={i} style={{ height: 13, fontSize: 9, color: "#8b949e", display: "flex", alignItems: "center" }}>{l}</div>
          ))}
        </div>
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div style={{ display: "flex", marginBottom: 4, height: 14 }}>
            {weekCols.map((wk, wi) => (
              <div key={wi} style={{ width: 13, marginRight: 2, fontSize: 9, color: "#8b949e" }}>
                {wi === 0 || wk[0].getDate() <= 7 ? mos[wk[0].getMonth()] : ""}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {weekCols.map((wk, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Array.from({ length: 7 }, (_, di) => {
                  const day = wk.find(dd => dd.getDay() === di);
                  if (!day || day > today) return <div key={di} style={{ width: 13, height: 13 }} />;
                  const k = toDS(day);
                  const cnt = activity[k] || 0;
                  return (
                    <div key={di} title={`${k}: ${cnt}`} style={{
                      width: 13, height: 13, borderRadius: 2, background: cls[gl(cnt)],
                      outline: k === tk ? "2px solid #58a6ff" : "none", outlineOffset: -1
                    }} />
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: "#8b949e" }}>Less</span>
            {cls.map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />)}
            <span style={{ fontSize: 10, color: "#8b949e" }}>More</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#161b22", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ fontSize: 13, color: "#e6edf3" }}>Today: </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: tc > 0 ? "#39d353" : "#484f58" }}>{tc}</span>
          <span style={{ fontSize: 12, color: "#8b949e" }}> reviews</span>
        </div>
        <div>
          <span style={{ fontSize: 13, color: "#e6edf3" }}>Created: </span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#58a6ff" }}>{cards.filter(c => toDS(c.created) === tk).length}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── EditForm ─── */
function EditForm({ card, allDecks, onSave, onCancel, colors, fileToDataUrl, showToast }) {
  const [q, setQ] = useState(card.question);
  const [a, setA] = useState(card.answer);
  const [dk, setDk] = useState(card.deck);
  const [qi, setQi] = useState(card.qImages || []);
  const [ai, setAi] = useState(card.aImages || []);
  const editFileRef = useRef(null);
  const [et, setEt] = useState("q");

  const hf = async (e) => {
    for (const f of e.target.files) {
      try {
        const url = await fileToDataUrl(f);
        if (et === "q") setQi(p => [...p, url]);
        else setAi(p => [...p, url]);
      } catch (err) { showToast("❌ " + err); }
    }
    e.target.value = "";
  };

  return (
    <div>
      <input ref={editFileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={hf} />
      <select value={dk} onChange={e => setDk(e.target.value)}
        style={{ background: colors.sf2, color: colors.t1, border: `1px solid ${colors.bd}`, borderRadius: 6, padding: "6px 10px", fontSize: 13, marginBottom: 8, outline: "none" }}>
        {allDecks.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <div style={{ fontSize: 11, color: "#9898b0", marginBottom: 4 }}>Question:</div>
      <textarea value={q} onChange={e => setQ(e.target.value)}
        style={{ width: "100%", minHeight: 60, background: colors.sf2, color: colors.t1, border: `1px solid ${colors.bd}`, borderRadius: 6, padding: 8, fontSize: 13, fontFamily: "monospace", resize: "vertical", outline: "none", marginBottom: 4, boxSizing: "border-box" }} />
      {qi.length > 0 && <ImageGallery images={qi} editable onRemove={i => setQi(p => p.filter((_, j) => j !== i))} />}
      <div style={{ fontSize: 11, color: "#9898b0", marginBottom: 4, marginTop: 8 }}>Answer:</div>
      <textarea value={a} onChange={e => setA(e.target.value)}
        style={{ width: "100%", minHeight: 60, background: colors.sf2, color: colors.t1, border: `1px solid ${colors.bd}`, borderRadius: 6, padding: 8, fontSize: 13, fontFamily: "monospace", resize: "vertical", outline: "none", marginBottom: 4, boxSizing: "border-box" }} />
      {ai.length > 0 && <ImageGallery images={ai} editable onRemove={i => setAi(p => p.filter((_, j) => j !== i))} />}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 2, background: colors.sf2, borderRadius: 4, padding: 2 }}>
          <button onClick={() => setEt("q")} style={{ padding: "3px 8px", borderRadius: 3, border: "none", fontSize: 11, cursor: "pointer", background: et === "q" ? colors.ac : "transparent", color: et === "q" ? "#fff" : "#9898b0" }}>📷→Q</button>
          <button onClick={() => setEt("a")} style={{ padding: "3px 8px", borderRadius: 3, border: "none", fontSize: 11, cursor: "pointer", background: et === "a" ? "#10b981" : "transparent", color: et === "a" ? "#fff" : "#9898b0" }}>📷→A</button>
        </div>
        <button onClick={() => editFileRef.current?.click()} style={{ background: colors.sf2, color: colors.t1, border: `1px solid ${colors.bd}`, borderRadius: 4, padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>📎 Add</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onSave(card.id, q, a, dk, qi, ai)} style={{ background: colors.ac, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Save</button>
        <button onClick={onCancel} style={{ background: "transparent", color: colors.t1, border: `1px solid ${colors.bd}`, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [myCards, setMyCards] = useState([]);
  const [sharedCards, setSharedCards] = useState({});
  const [sharedProgress, setSharedProgress] = useState({});
  const [activity, setActivity] = useState({});
  const [profile, setProfile] = useState({ name: "", id: "" });
  const [showProfile, setShowProfile] = useState(false);
  const [view, setView] = useState(VIEW.DASH);
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [qImages, setQImages] = useState([]);
  const [aImages, setAImages] = useState([]);
  const [imgTarget, setImgTarget] = useState("q");
  const [isSharedAdd, setIsSharedAdd] = useState(false);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [toast, setToast] = useState("");
  const [editCard, setEditCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newDeckName, setNewDeckName] = useState("");
  const [allDecks, setAllDecks] = useState([...DECKS]);
  const [syncing, setSyncing] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [gistId, setGistId] = useState("");
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const fileInputRef = useRef(null);
  const backupFileRef = useRef(null);

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.myCards || !Array.isArray(data.myCards)) {
        showToast("❌ Invalid backup file");
        return;
      }
      const mode = confirm(
        `Found backup from ${data.exportDate || "unknown date"} with ${data.myCards.length} cards.\n\nOK = Merge (add new cards, keep existing)\nCancel = Replace all (overwrites everything)`
      );
      if (mode) {
        // Merge: add cards that don't exist yet
        const existingIds = new Set(myCards.map(c => c.id));
        const newCards = data.myCards.filter(c => !existingIds.has(c.id));
        setMyCards(prev => [...prev, ...newCards]);
        // Merge activity
        if (data.activity) {
          setActivity(prev => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(data.activity)) {
              merged[k] = Math.max(merged[k] || 0, v);
            }
            return merged;
          });
        }
        // Merge progress
        if (data.sharedProgress) {
          setSharedProgress(prev => ({ ...prev, ...data.sharedProgress }));
        }
        // Merge decks
        if (data.allDecks) {
          setAllDecks(prev => {
            const set = new Set([...prev, ...data.allDecks]);
            return [...set];
          });
        }
        showToast(`✅ Merged ${newCards.length} new cards (${data.myCards.length - newCards.length} already existed)`);
      } else {
        // Replace all
        setMyCards(data.myCards);
        if (data.activity) setActivity(data.activity);
        if (data.sharedProgress) setSharedProgress(data.sharedProgress);
        if (data.profile) setProfile(data.profile);
        if (data.allDecks) {
          const set = new Set([...DECKS, ...data.allDecks]);
          setAllDecks([...set]);
        }
        showToast(`✅ Restored ${data.myCards.length} cards from backup`);
      }
    } catch (err) {
      showToast("❌ Could not read backup: " + err.message);
    }
  };

  const syncShared = async (decksSet) => {
    setSyncing(true);
    const shared = {};
    const dkList = decksSet ? [...decksSet] : [...allDecks];
    for (const d of dkList) {
      try {
        const data = await ld(SHARED_PFX + d, [], true);
        if (data.length > 0) shared[d] = data;
      } catch {}
    }
    setSharedCards(shared);
    setSyncing(false);
  };

  useEffect(() => {
    (async () => {
      const c = await ld(MY_CARDS, []);
      const a = await ld(ACTIVITY_KEY, {});
      const p = await ld(PROFILE_KEY, { name: "", id: "" });
      const prog = await ld(PROGRESS_KEY, {});
      const gh = await ld(GITHUB_KEY, { token: "", gistId: "" });
      if (!p.id) p.id = Math.random().toString(36).slice(2, 10);
      setMyCards(c); setActivity(a); setProfile(p); setSharedProgress(prog);
      setGithubToken(gh.token || ""); setGistId(gh.gistId || "");
      const ds = new Set([...DECKS]);
      c.forEach(x => ds.add(x.deck));
      setAllDecks([...ds]);
      await syncShared(ds);
      setLoading(false);
      if (!p.name) setShowProfile(true);
    })();
  }, []);

  useEffect(() => { if (!loading) sv(MY_CARDS, myCards); }, [myCards, loading]);
  useEffect(() => { if (!loading) sv(ACTIVITY_KEY, activity); }, [activity, loading]);
  useEffect(() => { if (!loading) sv(PROFILE_KEY, profile); }, [profile, loading]);
  useEffect(() => { if (!loading) sv(PROGRESS_KEY, sharedProgress); }, [sharedProgress, loading]);
  useEffect(() => { if (!loading) sv(GITHUB_KEY, { token: githubToken, gistId }); }, [githubToken, gistId, loading]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const logActivity = () => { const k = toDS(Date.now()); setActivity(p => ({ ...p, [k]: (p[k] || 0) + 1 })); };

  const now = Date.now();

  const getAllCards = useCallback((d) => {
    const mine = myCards.filter(c => !d || c.deck === d);
    const sh = [];
    const dkList = d ? [d] : Object.keys(sharedCards);
    for (const dk of dkList) {
      for (const c of (sharedCards[dk] || [])) {
        if (myCards.some(m => m.id === c.id)) continue;
        const prog = sharedProgress[c.id] || { ease: 2.5, interval: 0, repetitions: 0, dueDate: c.created, lastReview: null, history: [] };
        sh.push({ ...c, ...prog, _shared: true });
      }
    }
    return [...mine, ...sh];
  }, [myCards, sharedCards, sharedProgress]);

  const deckCards = useCallback((d) => getAllCards(d), [getAllCards]);
  const dueCards = useCallback((d) => deckCards(d).filter(c => c.dueDate <= now), [deckCards, now]);
  const newCardsF = useCallback((d) => deckCards(d).filter(c => c.repetitions === 0 && c.dueDate <= now), [deckCards, now]);
  const reviewCardsF = useCallback((d) => deckCards(d).filter(c => c.repetitions > 0 && c.dueDate <= now), [deckCards, now]);
  const myDeckCards = useCallback((d) => myCards.filter(c => !d || c.deck === d), [myCards]);
  const sharedDeckCards = useCallback((d) => {
    const cards = [];
    const dks = d ? [d] : Object.keys(sharedCards);
    for (const dk of dks) for (const c of (sharedCards[dk] || [])) cards.push(c);
    return cards;
  }, [sharedCards]);

  const fileToDataUrl = (file) => new Promise((res, rej) => {
    if (!file.type.startsWith("image/")) { rej("Not an image"); return; }
    if (file.size > 2 * 1024 * 1024) { rej("Max 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = () => rej("Read error");
    reader.readAsDataURL(file);
  });

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        try {
          const url = await fileToDataUrl(item.getAsFile());
          if (imgTarget === "q") setQImages(p => [...p, url]);
          else setAImages(p => [...p, url]);
          showToast("🖼️ Image added");
        } catch (err) { showToast("❌ " + err); }
        return;
      }
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        try {
          const url = await fileToDataUrl(file);
          if (imgTarget === "q") setQImages(p => [...p, url]);
          else setAImages(p => [...p, url]);
          showToast("🖼️ Image added");
        } catch (err) { showToast("❌ " + err); }
      }
    }
  };

  const handleFileSelect = async (e) => {
    for (const f of e.target.files) {
      try {
        const url = await fileToDataUrl(f);
        if (imgTarget === "q") setQImages(p => [...p, url]);
        else setAImages(p => [...p, url]);
      } catch (err) { showToast("❌ " + err); }
    }
    e.target.value = "";
  };

  const extractImgUrls = (text) => {
    const urls = [];
    const cleaned = text.replace(/#img\s+(https?:\/\/\S+)/gi, (_, url) => {
      let u = url.trim();
      const driveMatch = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
      if (driveMatch) u = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
      urls.push(u);
      return "";
    });
    return { cleaned: cleaned.trim(), urls };
  };

  const handleCommand = async () => {
    const text = input.trim();
    if (!text) return;
    const qMatch = text.match(/^#q\s+([\s\S]*?)(?:\s*#ans\s+([\s\S]*))?$/i);
    if (qMatch) {
      let qT = qMatch[1]?.trim() || "";
      let aT = qMatch[2]?.trim() || "";
      if (!qT && qImages.length === 0) { showToast("❌ Empty question"); return; }
      if (!aT && aImages.length === 0) { showToast("💡 Add #ans"); return; }
      const qE = extractImgUrls(qT);
      const aE = extractImgUrls(aT);
      const allQI = [...qImages, ...qE.urls];
      const allAI = [...aImages, ...aE.urls];
      const targetDeck = deck || allDecks[0];
      const card = makeCard(qE.cleaned, aE.cleaned, targetDeck, allQI, allAI, profile.name || "Anonymous");

      if (isSharedAdd) {
        const existing = await ld(SHARED_PFX + targetDeck, [], true);
        existing.push({ id: card.id, question: card.question, answer: card.answer, deck: card.deck, qImages: card.qImages, aImages: card.aImages, author: card.author, created: card.created });
        await sv(SHARED_PFX + targetDeck, existing, true);
        setSharedCards(p => ({ ...p, [targetDeck]: existing }));
        showToast("🌐 Shared card added to " + targetDeck);
      } else {
        setMyCards(p => [...p, card]);
        showToast("✅ Card added to " + targetDeck);
      }
      setInput(""); setQImages([]); setAImages([]);
      return;
    }
    showToast("💡 Use: #q question #ans answer");
  };

  const startReview = (d) => {
    const due = dueCards(d);
    if (due.length === 0) { showToast("No cards due!"); return; }
    const n = due.filter(c => c.repetitions === 0).sort(() => Math.random() - 0.5);
    const r = due.filter(c => c.repetitions > 0).sort(() => Math.random() - 0.5);
    setReviewQueue([...n, ...r]);
    setReviewIdx(0); setShowAnswer(false); setView(VIEW.REVIEW);
  };

  const handleReview = (quality) => {
    const card = reviewQueue[reviewIdx];
    const updated = reviewCard(card, quality);
    if (card._shared) {
      setSharedProgress(p => ({ ...p, [card.id]: { ease: updated.ease, interval: updated.interval, repetitions: updated.repetitions, dueDate: updated.dueDate, lastReview: updated.lastReview, history: updated.history } }));
    } else {
      setMyCards(p => p.map(c => c.id === card.id ? updated : c));
    }
    logActivity();
    if (reviewIdx + 1 < reviewQueue.length) { setReviewIdx(reviewIdx + 1); setShowAnswer(false); }
    else { setView(VIEW.DASH); showToast("🎉 Session complete!"); }
  };

  const deleteCard = (id, isShared, deckName) => {
    if (isShared) {
      (async () => {
        const existing = await ld(SHARED_PFX + deckName, [], true);
        const updated = existing.filter(c => c.id !== id);
        await sv(SHARED_PFX + deckName, updated, true);
        setSharedCards(p => ({ ...p, [deckName]: updated }));
        showToast("🗑️ Shared card removed");
      })();
    } else {
      setMyCards(p => p.filter(c => c.id !== id));
      showToast("🗑️ Deleted");
    }
  };

  const saveEdit = (id, q, a, d, qi, ai) => {
    setMyCards(p => p.map(c => c.id === id ? { ...c, question: q, answer: a, deck: d, qImages: qi || [], aImages: ai || [] } : c));
    setEditCard(null); showToast("✏️ Updated");
  };

  const exportCSV = (d) => {
    const dc = deckCards(d);
    if (!dc.length) { showToast("No cards"); return; }
    const esc = s => '"' + s.replace(/"/g, '""').replace(/\n/g, "<br>") + '"';
    const csv = dc.map(c => {
      let qH = c.question, aH = c.answer;
      if (c.qImages?.length) qH += "<br>" + c.qImages.map(u => `<img src="${u}">`).join("");
      if (c.aImages?.length) aH += "<br>" + c.aImages.map(u => `<img src="${u}">`).join("");
      return `${esc(qH)}\t${esc(aH)}\t${c.deck}`;
    }).join("\n");
    const blob = new Blob([csv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${d || "all"}-anki.txt`; a.click();
    URL.revokeObjectURL(url); showToast("📥 Exported");
  };

  const exportMarkdown = (d) => {
    const dc = deckCards(d);
    if (!dc.length) { showToast("No cards"); return; }
    const md = dc.map(c => {
      let q = `## Q: ${c.question}`, a = `**A:** ${c.answer}`;
      if (c.qImages?.length) q += "\n" + c.qImages.map(u => `![](${u})`).join("\n");
      if (c.aImages?.length) a += "\n" + c.aImages.map(u => `![](${u})`).join("\n");
      return q + "\n\n" + a + "\n\n---";
    }).join("\n\n");
    navigator.clipboard.writeText(`# ${d || "All"} Flashcards\n\n` + md);
    showToast("📋 Copied!");
  };

  const addCustomDeck = () => {
    const n = newDeckName.trim();
    if (!n) return;
    if (allDecks.includes(n)) { showToast("Exists"); return; }
    setAllDecks(p => [...p, n]); setNewDeckName(""); showToast(`📁 "${n}" created`);
  };

  const resetAll = async () => {
    if (!confirm("Delete ALL personal cards and progress?")) return;
    setMyCards([]); setActivity({}); setSharedProgress({});
    setAllDecks([...DECKS]); setDeck(null); showToast("🔄 Reset");
  };

  const pullFromGist = async () => {
    if (!gistId.trim()) { showToast("❌ Enter a Gist ID first"); return; }
    setGithubSyncing(true);
    try {
      const headers = githubToken ? { Authorization: `Bearer ${githubToken}` } : {};
      const res = await fetch(`https://api.github.com/gists/${gistId.trim()}`, { headers });
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      const data = await res.json();
      const shared = { ...sharedCards };
      for (const [filename, file] of Object.entries(data.files)) {
        if (filename.endsWith(".json")) {
          const deckName = filename.slice(0, -5);
          const cards = JSON.parse(file.content || "[]");
          shared[deckName] = cards;
          await sv(SHARED_PFX + deckName, cards, true);
        }
      }
      setSharedCards(shared);
      showToast("🐙 Pulled from Gist!");
    } catch (err) {
      showToast("❌ " + err.message);
    } finally {
      setGithubSyncing(false);
    }
  };

  const pushToGist = async () => {
    if (!githubToken.trim()) { showToast("❌ Enter a GitHub token first"); return; }
    setGithubSyncing(true);
    try {
      const files = {};
      for (const d of allDecks) {
        const cards = sharedCards[d] || [];
        if (cards.length > 0) files[`${d}.json`] = { content: JSON.stringify(cards, null, 2) };
      }
      if (Object.keys(files).length === 0) { showToast("❌ No shared cards to push"); setGithubSyncing(false); return; }
      const body = { description: "SpaceRep shared flashcard decks", public: false, files };
      const url = gistId.trim() ? `https://api.github.com/gists/${gistId.trim()}` : "https://api.github.com/gists";
      const method = gistId.trim() ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${githubToken.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      const data = await res.json();
      if (!gistId.trim()) setGistId(data.id);
      showToast("🐙 Pushed to Gist!");
    } catch (err) {
      showToast("❌ " + err.message);
    } finally {
      setGithubSyncing(false);
    }
  };

  /* ─── Styles ─── */
  const bg = "#0f0f1a", sf = "#1a1a2e", sf2 = "#252540", t1 = "#e8e8f0", t2 = "#9898b0", ac = "#6366f1", bd = "#2a2a45";
  const btnS = (c = ac) => ({ background: c, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 });
  const btnO = { background: "transparent", color: t1, border: `1px solid ${bd}`, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14 };
  const crd = { background: sf, borderRadius: 12, padding: 20, border: `1px solid ${bd}` };

  if (loading) return (
    <div style={{ background: bg, color: t1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>Loading...</div>
  );

  if (showProfile) return (
    <div style={{ background: bg, color: t1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ ...crd, maxWidth: 400, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
        <h2 style={{ margin: "0 0 8px" }}>Welcome to SpaceRep</h2>
        <p style={{ color: t2, margin: "0 0 20px", fontSize: 14 }}>Enter your name so friends can see who contributed shared cards</p>
        <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
          placeholder="Your name (e.g. Hannah)"
          style={{ width: "100%", background: sf2, color: t1, border: `1px solid ${bd}`, borderRadius: 8, padding: "12px 14px", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16, textAlign: "center" }}
          onKeyDown={e => { if (e.key === "Enter" && profile.name.trim()) setShowProfile(false); }} />
        <button onClick={() => { if (profile.name.trim()) setShowProfile(false); else showToast("Please enter a name"); }}
          style={{ ...btnS(), width: "100%", justifyContent: "center", padding: 14, fontSize: 16 }}>Get Started</button>
      </div>
    </div>
  );

  const curCard = reviewQueue[reviewIdx];

  return (
    <div style={{ background: bg, color: t1, minHeight: "100vh", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: sf2, color: t1, padding: "12px 24px", borderRadius: 10, zIndex: 999, border: `1px solid ${bd}`, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>{toast}</div>}
      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileSelect} />
      <input ref={backupFileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleRestore} />

      {/* Header */}
      <div style={{ background: sf, borderBottom: `1px solid ${bd}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => { setView(VIEW.DASH); setDeck(null); }}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>SpaceRep</span>
          <span style={{ fontSize: 11, color: t2, background: sf2, padding: "2px 8px", borderRadius: 10 }}>👤 {profile.name}</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[{ v: VIEW.DASH, l: "📊" }, { v: VIEW.ADD, l: "➕" }, { v: VIEW.BROWSE, l: "📚" }, { v: VIEW.SHARED, l: "🌐" }, { v: VIEW.EXPORT, l: "📤" }].map(({ v, l }) => (
            <button key={v} onClick={() => setView(v)} style={{ ...btnO, background: view === v ? sf2 : "transparent", fontSize: 14, padding: "6px 10px" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Deck tabs */}
      <div style={{ padding: "10px 20px", display: "flex", gap: 6, overflowX: "auto", borderBottom: `1px solid ${bd}`, background: sf }}>
        <button onClick={() => setDeck(null)} style={{ ...btnO, fontSize: 12, padding: "5px 12px", background: deck === null ? sf2 : "transparent", whiteSpace: "nowrap" }}>All ({deckCards(null).length})</button>
        {allDecks.map(d => {
          const shared = sharedDeckCards(d).length;
          return (
            <button key={d} onClick={() => setDeck(d)} style={{ ...btnO, fontSize: 12, padding: "5px 12px", background: deck === d ? sf2 : "transparent", borderColor: DCLR[d] || ac, color: deck === d ? (DCLR[d] || ac) : t2, whiteSpace: "nowrap" }}>
              {d} ({deckCards(d).length}){shared > 0 && <span style={{ fontSize: 10, color: "#10b981" }}> 🌐{shared}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>

        {/* ─── DASHBOARD ─── */}
        {view === VIEW.DASH && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>{deck || "All Decks"}</h2>
            <p style={{ color: t2, margin: "0 0 20px", fontSize: 14 }}>Personal + shared cards combined</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { l: "Total", v: deckCards(deck).length, c: ac },
                { l: "Due", v: dueCards(deck).length, c: "#ef4444" },
                { l: "New", v: newCardsF(deck).length, c: "#3b82f6" },
                { l: "Review", v: reviewCardsF(deck).length, c: "#f59e0b" },
                { l: "Shared", v: sharedDeckCards(deck).length, c: "#10b981" }
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...crd, textAlign: "center", padding: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
                  <div style={{ fontSize: 12, color: t2 }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => startReview(deck)} disabled={dueCards(deck).length === 0}
              style={{ ...btnS(dueCards(deck).length > 0 ? "#6366f1" : "#444"), width: "100%", justifyContent: "center", padding: 16, fontSize: 16, opacity: dueCards(deck).length > 0 ? 1 : 0.5, marginBottom: 20 }}>
              🎯 Start Review ({dueCards(deck).length} due)
            </button>
            <Heatmap activity={activity} cards={myCards} />
            <EbbinghausCurve cards={deckCards(null)} deck={deck} />
            {myCards.length > 0 && (
              <div style={{ ...crd, marginTop: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>📈 Mastery</h3>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80 }}>
                  {allDecks.map(d => {
                    const dc = deckCards(d);
                    if (!dc.length) return null;
                    const m = dc.filter(c => c.interval >= 21).length;
                    const l = dc.filter(c => c.interval > 0 && c.interval < 21).length;
                    const f = dc.filter(c => c.interval === 0).length;
                    const t = dc.length;
                    return (
                      <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 1, height: 60 }}>
                          {m > 0 && <div style={{ background: "#10b981", height: `${m / t * 100}%`, borderRadius: 3, minHeight: 3 }} />}
                          {l > 0 && <div style={{ background: "#f59e0b", height: `${l / t * 100}%`, borderRadius: 3, minHeight: 3 }} />}
                          {f > 0 && <div style={{ background: "#6366f1", height: `${f / t * 100}%`, borderRadius: 3, minHeight: 3 }} />}
                        </div>
                        <span style={{ fontSize: 10, color: t2 }}>{d.split(" ")[1] || d}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: t2 }}>
                  <span>🟢 Mastered</span><span>🟡 Learning</span><span>🟣 New</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── REVIEW ─── */}
        {view === VIEW.REVIEW && curCard && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: t2 }}>{reviewIdx + 1}/{reviewQueue.length}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {curCard._shared && <span style={{ fontSize: 10, background: "#10b98130", color: "#10b981", padding: "2px 6px", borderRadius: 8 }}>🌐 shared</span>}
                <span style={{ fontSize: 12, color: DCLR[curCard.deck] || ac, background: sf2, padding: "3px 10px", borderRadius: 20 }}>{curCard.deck}</span>
              </div>
              <button onClick={() => setView(VIEW.DASH)} style={{ ...btnO, fontSize: 12, padding: "4px 12px" }}>✕</button>
            </div>
            <div style={{ height: 4, background: sf2, borderRadius: 4, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(reviewIdx / reviewQueue.length) * 100}%`, background: ac, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ ...crd, minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 11, color: t2, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Question</div>
              <div style={{ fontSize: 18, lineHeight: 1.6 }} dangerouslySetInnerHTML={rc(curCard.question)} />
              <ImageGallery images={curCard.qImages} editable={false} />
            </div>
            {!showAnswer ? (
              <button onClick={() => setShowAnswer(true)} style={{ ...btnS(), width: "100%", justifyContent: "center", marginTop: 16, padding: 16, fontSize: 16 }}>Show Answer</button>
            ) : (
              <>
                <div style={{ ...crd, marginTop: 12, textAlign: "center", padding: 32, borderColor: "#10b98140" }}>
                  <div style={{ fontSize: 11, color: "#10b981", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Answer</div>
                  <div style={{ fontSize: 18, lineHeight: 1.6 }} dangerouslySetInnerHTML={rc(curCard.answer)} />
                  <ImageGallery images={curCard.aImages} editable={false} />
                  {curCard.author && <div style={{ fontSize: 11, color: t2, marginTop: 12 }}>by {curCard.author}</div>}
                </div>
                <div style={{ fontSize: 13, color: t2, textAlign: "center", margin: "16px 0 8px" }}>How well did you remember?</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {[
                    { q: 0, l: "Again", s: "<1m", c: "#ef4444" },
                    { q: 1, l: "Hard", s: `${Math.max(1, Math.round((curCard.interval || 1) * 0.5))}d`, c: "#f59e0b" },
                    { q: 2, l: "Good", s: `${Math.max(1, Math.round((curCard.interval || 1) * curCard.ease))}d`, c: "#3b82f6" },
                    { q: 3, l: "Easy", s: `${Math.max(1, Math.round((curCard.interval || 1) * curCard.ease * 1.3))}d`, c: "#10b981" }
                  ].map(({ q, l, s, c }) => (
                    <button key={q} onClick={() => handleReview(q)} style={{ background: sf2, color: c, border: `1px solid ${c}40`, borderRadius: 8, padding: "12px 8px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                      {l}<br /><span style={{ fontSize: 11, fontWeight: 400, color: t2 }}>{s}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── ADD ─── */}
        {view === VIEW.ADD && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Add Cards</h2>
            <p style={{ color: t2, margin: "0 0 16px", fontSize: 13 }}>Create personal or shared cards</p>
            <div style={{ ...crd, marginBottom: 16 }} onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 13, color: t2 }}>Deck: <strong style={{ color: DCLR[deck] || ac }}>{deck || allDecks[0]}</strong></div>
                <div style={{ display: "flex", gap: 4, background: sf2, borderRadius: 6, padding: 2 }}>
                  <button onClick={() => setIsSharedAdd(false)} style={{ padding: "5px 12px", borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600, background: !isSharedAdd ? ac : "transparent", color: !isSharedAdd ? "#fff" : t2 }}>🔒 Private</button>
                  <button onClick={() => setIsSharedAdd(true)} style={{ padding: "5px 12px", borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600, background: isSharedAdd ? "#10b981" : "transparent", color: isSharedAdd ? "#fff" : t2 }}>🌐 Shared</button>
                </div>
              </div>
              {isSharedAdd && <div style={{ background: "#10b98115", border: "1px solid #10b98130", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#10b981", marginBottom: 10 }}>🌐 Visible to everyone. Added by: <strong>{profile.name}</strong></div>}
              <textarea value={input} onChange={e => setInput(e.target.value)} onPaste={handlePaste}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCommand(); }}
                placeholder={"#q What quantiles from this CDF figure?\n#img https://drive.google.com/file/d/...\n#ans Median at $F(x) = 0.5$, $Q_1$ at $F(x) = 0.25$"}
                style={{ width: "100%", minHeight: 120, background: sf2, color: t1, border: `1px solid ${bd}`, borderRadius: 8, padding: 12, fontSize: 14, fontFamily: "monospace", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 4, background: sf2, borderRadius: 6, padding: 2 }}>
                  <button onClick={() => setImgTarget("q")} style={{ padding: "4px 10px", borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer", background: imgTarget === "q" ? ac : "transparent", color: imgTarget === "q" ? "#fff" : t2 }}>📷→Q</button>
                  <button onClick={() => setImgTarget("a")} style={{ padding: "4px 10px", borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer", background: imgTarget === "a" ? "#10b981" : "transparent", color: imgTarget === "a" ? "#fff" : t2 }}>📷→A</button>
                </div>
                <button onClick={() => fileInputRef.current?.click()} style={{ ...btnS(sf2), padding: "6px 12px", fontSize: 12, border: `1px solid ${bd}`, color: t1 }}>📎 Browse</button>
                <span style={{ fontSize: 11, color: t2 }}>or paste / drop</span>
              </div>
              {qImages.length > 0 && <div style={{ marginTop: 10 }}><div style={{ fontSize: 11, color: t2, marginBottom: 4 }}>Q images:</div><ImageGallery images={qImages} editable onRemove={i => setQImages(p => p.filter((_, j) => j !== i))} /></div>}
              {aImages.length > 0 && <div style={{ marginTop: 10 }}><div style={{ fontSize: 11, color: "#10b981", marginBottom: 4 }}>A images:</div><ImageGallery images={aImages} editable onRemove={i => setAImages(p => p.filter((_, j) => j !== i))} /></div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 11, color: t2 }}>Ctrl+Enter to add</span>
                <button onClick={handleCommand} style={btnS(isSharedAdd ? "#10b981" : ac)}>{isSharedAdd ? "🌐 Share Card" : "Add Card"}</button>
              </div>
            </div>
            <div style={{ ...crd }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>📖 Formatting</h3>
              <div style={{ fontSize: 13, color: t2, lineHeight: 1.8 }}>
                <div><strong style={{ color: t1 }}>LaTeX:</strong> <code style={{ background: sf2, padding: "1px 5px", borderRadius: 3 }}>$x \quad y$</code></div>
                <div><strong style={{ color: t1 }}>R:</strong> <code style={{ background: sf2, padding: "1px 5px", borderRadius: 3 }}>{"```r ... ```"}</code></div>
                <div><strong style={{ color: t1 }}>Images:</strong> paste, drop, 📎, or <code style={{ background: sf2, padding: "1px 5px", borderRadius: 3 }}>#img url</code></div>
                <div><strong style={{ color: t1 }}>Drive:</strong> auto-converts share links</div>
              </div>
            </div>
            <div style={{ ...crd, marginTop: 16 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>📁 New Deck</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newDeckName} onChange={e => setNewDeckName(e.target.value)} placeholder="Deck name..."
                  style={{ flex: 1, background: sf2, color: t1, border: `1px solid ${bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }}
                  onKeyDown={e => { if (e.key === "Enter") addCustomDeck(); }} />
                <button onClick={addCustomDeck} style={btnS()}>Create</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── BROWSE ─── */}
        {view === VIEW.BROWSE && (
          <div>
            <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>My Cards</h2>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..."
              style={{ width: "100%", background: sf2, color: t1, border: `1px solid ${bd}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", marginBottom: 16, boxSizing: "border-box" }} />
            {myDeckCards(deck).filter(c => {
              if (!searchTerm) return true;
              const s = searchTerm.toLowerCase();
              return c.question.toLowerCase().includes(s) || c.answer.toLowerCase().includes(s);
            }).map(c => (
              <div key={c.id} style={{ ...crd, marginBottom: 10 }}>
                {editCard === c.id ? (
                  <EditForm card={c} allDecks={allDecks} onSave={saveEdit} onCancel={() => setEditCard(null)} colors={{ sf2, t1, bd, ac }} fileToDataUrl={fileToDataUrl} showToast={showToast} />
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: DCLR[c.deck] || ac, background: sf2, padding: "2px 8px", borderRadius: 10 }}>{c.deck}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditCard(c.id)} style={{ background: "none", border: "none", color: t2, cursor: "pointer", fontSize: 13 }}>✏️</button>
                        <button onClick={() => deleteCard(c.id, false)} style={{ background: "none", border: "none", color: t2, cursor: "pointer", fontSize: 13 }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, marginBottom: 4 }}><span style={{ color: t2, fontSize: 12 }}>Q: </span><span dangerouslySetInnerHTML={rc(c.question)} /></div>
                    {c.qImages?.length > 0 && <ImageGallery images={c.qImages} editable={false} />}
                    <div style={{ fontSize: 14, color: "#a0a0c0", marginTop: 4 }}><span style={{ color: t2, fontSize: 12 }}>A: </span><span dangerouslySetInnerHTML={rc(c.answer)} /></div>
                    {c.aImages?.length > 0 && <ImageGallery images={c.aImages} editable={false} />}
                    <div style={{ fontSize: 11, color: t2, marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>Int: {c.interval}d</span><span>Ease: {c.ease.toFixed(2)}</span>
                      {c.dueDate <= now && <span style={{ color: "#f59e0b" }}>Due</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
            {myDeckCards(deck).length === 0 && <p style={{ color: t2, textAlign: "center", padding: 40 }}>No personal cards</p>}
          </div>
        )}

        {/* ─── SHARED ─── */}
        {view === VIEW.SHARED && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>🌐 Shared Cards</h2>
              <button onClick={() => syncShared()} style={{ ...btnS(sf2), padding: "6px 14px", fontSize: 12, border: `1px solid ${bd}`, color: t1 }}>{syncing ? "Syncing..." : "🔄 Refresh"}</button>
            </div>
            <p style={{ color: t2, margin: "0 0 16px", fontSize: 13 }}>Cards shared by everyone — your review progress stays private</p>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search shared cards..."
              style={{ width: "100%", background: sf2, color: t1, border: `1px solid ${bd}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", marginBottom: 16, boxSizing: "border-box" }} />
            {sharedDeckCards(deck).filter(c => {
              if (!searchTerm) return true;
              const s = searchTerm.toLowerCase();
              return c.question.toLowerCase().includes(s) || c.answer.toLowerCase().includes(s);
            }).map(c => {
              const prog = sharedProgress[c.id];
              return (
                <div key={c.id} style={{ ...crd, marginBottom: 10, borderColor: "#10b98130" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: DCLR[c.deck] || ac, background: sf2, padding: "2px 8px", borderRadius: 10 }}>{c.deck}</span>
                      <span style={{ fontSize: 10, background: "#10b98120", color: "#10b981", padding: "2px 6px", borderRadius: 8 }}>🌐</span>
                    </div>
                    <span style={{ fontSize: 11, color: t2 }}>by {c.author || "?"}</span>
                  </div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}><span style={{ color: t2, fontSize: 12 }}>Q: </span><span dangerouslySetInnerHTML={rc(c.question)} /></div>
                  {c.qImages?.length > 0 && <ImageGallery images={c.qImages} editable={false} />}
                  <div style={{ fontSize: 14, color: "#a0a0c0", marginTop: 4 }}><span style={{ color: t2, fontSize: 12 }}>A: </span><span dangerouslySetInnerHTML={rc(c.answer)} /></div>
                  {c.aImages?.length > 0 && <ImageGallery images={c.aImages} editable={false} />}
                  {prog && (
                    <div style={{ fontSize: 11, color: t2, marginTop: 8, display: "flex", gap: 12 }}>
                      <span>Int: {prog.interval}d</span><span>Ease: {prog.ease.toFixed(2)}</span><span>Reps: {prog.repetitions}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {sharedDeckCards(deck).length === 0 && <p style={{ color: t2, textAlign: "center", padding: 40 }}>No shared cards yet — be the first to contribute!</p>}
          </div>
        )}

        {/* ─── EXPORT ─── */}
        {view === VIEW.EXPORT && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Export & Backup</h2>
            <p style={{ color: t2, margin: "0 0 20px", fontSize: 13 }}>Backup, restore, and export your data</p>

            {/* BACKUP / RESTORE */}
            <div style={{ ...crd, marginBottom: 16, borderColor: "#3b82f640" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#3b82f6" }}>💾 Full Backup & Restore</h3>
              <p style={{ color: t2, fontSize: 12, margin: "0 0 12px" }}>Saves everything: cards, review progress, activity heatmap, and settings. Use this before updates!</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <button onClick={() => {
                  const backup = {
                    version: 2,
                    exportDate: new Date().toISOString(),
                    profile,
                    myCards,
                    sharedProgress,
                    activity,
                    allDecks
                  };
                  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `spacerep-backup-${toDS(Date.now())}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast("💾 Backup saved!");
                }} style={btnS("#3b82f6")}>💾 Download Backup</button>
                <button onClick={() => backupFileRef.current?.click()}
                  style={btnS("#8b5cf6")}>📂 Restore from Backup</button>
              </div>
              <div style={{ background: "#3b82f610", border: "1px solid #3b82f630", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#93c5fd" }}>
                💡 Tip: Download a backup before I update the app. To restore, click "Restore from Backup" and select your .json file. You can choose to merge with existing cards or replace everything.
              </div>
            </div>

            {/* ANKI EXPORT */}
            <div style={{ ...crd, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>📥 Anki (TSV)</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => exportCSV(null)} style={btnS()}>All</button>
                {allDecks.map(d => <button key={d} onClick={() => exportCSV(d)} style={btnS(DCLR[d] || ac)}>{d}</button>)}
              </div>
            </div>

            {/* MARKDOWN EXPORT */}
            <div style={{ ...crd, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>📋 Markdown</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => exportMarkdown(null)} style={btnS("#10b981")}>All</button>
                {allDecks.map(d => <button key={d} onClick={() => exportMarkdown(d)} style={btnS(DCLR[d] || ac)}>{d}</button>)}
              </div>
            </div>

            {/* PROFILE */}
            <div style={{ ...crd, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>👤 Profile</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  style={{ flex: 1, background: sf2, color: t1, border: `1px solid ${bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" }} />
                <span style={{ fontSize: 11, color: t2 }}>Shown on shared cards</span>
              </div>
            </div>

            {/* GITHUB GIST STORE */}
            <div style={{ ...crd, marginBottom: 16, borderColor: "#30363d" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#8b949e" }}>🐙 GitHub Gist Store</h3>
              <p style={{ color: t2, fontSize: 12, margin: "0 0 12px" }}>Sync shared decks to a GitHub Gist for cross-device access and sharing. Token needs <code style={{ background: sf2, padding: "1px 4px", borderRadius: 3 }}>gist</code> scope.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder="GitHub Personal Access Token (gist scope)"
                    type={showToken ? "text" : "password"}
                    style={{ flex: 1, background: sf2, color: t1, border: `1px solid ${bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "monospace" }}
                  />
                  <button onClick={() => setShowToken(v => !v)} style={{ ...btnS(sf2), border: `1px solid ${bd}`, color: t2, padding: "8px 10px", fontSize: 13 }}>{showToken ? "🙈" : "👁️"}</button>
                </div>
                <input
                  value={gistId}
                  onChange={e => setGistId(e.target.value)}
                  placeholder="Gist ID (leave blank to create new on push)"
                  style={{ background: sf2, color: t1, border: `1px solid ${bd}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "monospace" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: gistId ? 10 : 0 }}>
                <button onClick={pullFromGist} disabled={githubSyncing || !gistId.trim()} style={{ ...btnS("#1f6feb"), opacity: githubSyncing || !gistId.trim() ? 0.5 : 1 }}>
                  {githubSyncing ? "⏳ Syncing…" : "⬇️ Pull from Gist"}
                </button>
                <button onClick={pushToGist} disabled={githubSyncing || !githubToken.trim()} style={{ ...btnS("#238636"), opacity: githubSyncing || !githubToken.trim() ? 0.5 : 1 }}>
                  {githubSyncing ? "⏳ Syncing…" : "⬆️ Push to Gist"}
                </button>
              </div>
              {/^[0-9a-f]+$/i.test(gistId.trim()) && (
                <div style={{ fontSize: 11, color: t2 }}>
                  Gist: <a href={`https://gist.github.com/${gistId.trim()}`} target="_blank" rel="noopener noreferrer" style={{ color: ac }}>{gistId.trim()}</a>
                </div>
              )}
            </div>

            {/* RESET */}
            <div style={{ ...crd }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 15, color: "#ef4444" }}>⚠️ Reset</h3>
              <p style={{ color: t2, fontSize: 13, margin: "0 0 12px" }}>Deletes personal cards & progress. Shared cards stay.</p>
              <button onClick={resetAll} style={btnS("#ef4444")}>Reset Personal Data</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
