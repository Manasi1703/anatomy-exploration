import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, tools, basePlate, labelPlate, frustum, writePage } from "../common.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 600;
const HEIGHT = 460;

// Truth: a double-weighted pendulum. Fixed bob below the pivot (A = M·L, B = M·L²),
// sliding weight (mass 1) at s above it, in mm with g = 9810 mm/s².
// ω² = g (A − s) / (B + s²); a metronome ticks at both ends, so bpm = 60 ω / π.
// A and B are solved so s = 40 gives 208 bpm and s = 100 gives 40 bpm (Maelzel's range).
const g = 9810;
const w2 = (bpm) => ((bpm * Math.PI) / 60) ** 2;
const B = (g * 60 - w2(208) * 1600 + w2(40) * 10000) / (w2(208) - w2(40));
const A = 40 + (w2(208) * (B + 1600)) / g;
const bpmAt = (s) => (60 / Math.PI) * Math.sqrt((g * (A - s)) / (B + s * s));
const sFor = (bpm) => { let lo = 40, hi = 100; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (bpmAt(mid) > bpm) lo = mid; else hi = mid; } return (lo + hi) / 2; };
const MARKS = [40, 50, 60, 72, 84, 96, 108, 120, 138, 160, 184, 208];

const PLATE = { x: -62, y: -60, w: 124, d: 132, r: 8 };
const PLINTH = { x: -40, y: -40, w: 80, d: 80, r: 3 };
const Z0 = 7;
const H = 128;
const W0 = 33;
const W1 = 10;
const half = (z) => W0 - ((W0 - W1) * (z - Z0)) / H;
const SLOPE = (W0 - W1) / H;
const U = (() => { const n = Math.hypot(SLOPE, 1); return [0, -SLOPE / n, 1 / n]; })();
const N = (() => { const n = Math.hypot(SLOPE, 1); return [0, 1 / n, SLOPE / n]; })();
const X = [1, 0, 0];
const PIVOT_Z = 24;
const PIVOT = [0, half(PIVOT_Z) + 4, PIVOT_Z];
const ROD = 118;
const AMP = 20;

const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [0, 0, Z0 + H + 10], G.add3(PIVOT, G.mul3(U, ROD))], WIDTH, HEIGHT, { pad: 30, azimuth: 64, elevation: 24 });
const { at, S, L, D } = tools(P);
const on = (p, x, u, n = 0) => G.add3(G.add3(G.add3(p, G.mul3(X, x)), G.mul3(U, u)), G.mul3(N, n));
const faceAt = (x, z, lift = 0.4) => [x, half(z) + lift * N[1], z + lift * N[2]];
const path = (pts) => "M" + pts.map((p) => k.iso(p, P).join(" ")).join("L") + "Z";

function plinth() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(PLINTH, 0, 1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(PLINTH, 0, Z0, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(PLINTH, 2.2, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(PLINTH, 4).map(([x, y]) => at([x, y, Z0])), { size: 0.45, tone: "lo" }));
  return out.join("");
}

function caseBody() {
  const sq = (w) => [[-w, -w], [w, -w], [w, w], [-w, w]];
  const out = [S(frustum(sq(W0), Z0, sq(W1), Z0 + H, P), { tone: "mid" })];
  out.push(S(k.slabOf({ x: -W1 - 1.5, y: -W1 - 1.5, w: (W1 + 1.5) * 2, d: (W1 + 1.5) * 2, r: 1 }, Z0 + H, 2, P, 2, 0.4), { tone: "mid" }));
  out.push(S(frustum(sq(4), Z0 + H + 2, sq(0.6), Z0 + H + 8, P), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: -W0, y: -W0, w: W0 * 2, d: W0 * 2, r: 0 }, Z0 + 0.01, P, 1), { tone: "faint" }));
  // Recessed front window and the tempo scale behind the rod.
  const win = [faceAt(-12, Z0 + 6, 0.1), faceAt(12, Z0 + 6, 0.1), faceAt(6.5, Z0 + H - 8, 0.1), faceAt(-6.5, Z0 + H - 8, 0.1)];
  out.push(`<path class="iso-shade" data-shade="3" d="${path(win)}"/>`, L(path(win), { tone: "lo" }));
  const strip = [faceAt(-5, Z0 + 26, 0.3), faceAt(5, Z0 + 26, 0.3), faceAt(5, Z0 + H - 14, 0.3), faceAt(-5, Z0 + H - 14, 0.3)];
  out.push(`<path class="iso-top" d="${path(strip)}"/>`, L(path(strip), { tone: "faint" }));
  for (const mark of MARKS) {
    const s = sFor(mark);
    const p = on(PIVOT, 0, s, -4 + 0.35);
    const major = mark % 12 === 0 || mark === 208 || mark === 40;
    out.push(L(k.segment(G.add3(p, G.mul3(X, -5)), G.add3(p, G.mul3(X, major ? 1.5 : -1.5)), P), { tone: major ? "mid" : "lo" }));
  }
  return out.join("");
}

function windingKey() {
  const z = Z0 + 34;
  const F = G.frameOf([half(z), 0, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const out = [S(G.disc(0, 2, 5, F, P), { tone: "lo" }), S(G.disc(2, 9, 1.8, F, P), { tone: "mid" })];
  out.push(S(G.prismOf(F, [[-9, -3], [-6, -6], [6, -6], [9, -3], [9, 3], [6, 6], [-6, 6], [-9, 3]], 9, 11, P), { tone: "mid" }));
  out.push(L(G.circleOf(F, 11, 1.4, P), { tone: "lo" }));
  return out.join("");
}

function pendulum() {
  const out = [];
  const R = G.frameOf(PIVOT, N, X, U);
  out.push(S(G.disc(-4, 0, 5, R, P), { tone: "lo" }));
  out.push(S(G.disc(0, 1.6, 3.4, R, P), { tone: "mid" }));
  const rod = [[-0.8, -6], [0.8, -6], [0.8, ROD], [-0.8, ROD]];
  const rodPart = S(G.prismOf(R, rod, -0.6, 0.6, P), { tone: "hi", crease: "none" });
  const Wf = G.frameOf(PIVOT, N, X, U);
  const weight = S(G.prismOf(Wf, [[-7, -5], [7, -5], [7, 2.5], [4, 7], [-4, 7], [-7, 2.5]], -1.8, 1.8, P), { tone: "hi", lit: true, crease: "lo" });
  const notch = L(k.segment(on(PIVOT, -7, 0, 1.85), on(PIVOT, 7, 0, 1.85), P), { tone: "lo" });
  out.push(`<g data-part="rod">${rodPart}<g data-part="weight">${weight}${notch}</g></g>`);
  out.push(S(G.disc(1.6, 3.2, 1.6, R, P), { tone: "mid" }));
  return out.join("");
}

// The rod swings in its own plane (X, U): an in-plane rotation is an affine map on screen.
const o = k.iso(PIVOT, P);
const e1 = G.sub3([...k.iso(G.add3(PIVOT, X), P), 0], [...o, 0]);
const e2 = G.sub3([...k.iso(G.add3(PIVOT, U), P), 0], [...o, 0]);
const PLANE = { o, e1: [e1[0], e1[1]], e2: [e2[0], e2[1]], U: k.axisVector(P, U) };

const S0 = sFor(120);
const body0 = [
  basePlate(PLATE, P),
  labelPlate({ x: -20, y: 48, w: 40, d: 10, r: 1 }, 0, P),
  plinth(),
  caseBody(),
  windingKey(),
  pendulum(),
];

const live = `
const g = ${g}, A = ${A}, B = ${B}, AMP = ${AMP};
const MARKS = ${JSON.stringify(MARKS)};
const PL = ${JSON.stringify(PLANE)};
const bpmAt = ${bpmAt.toString()};
const sFor = ${sFor.toString()};
const NAMES = [[200, "Prestissimo"], [168, "Presto"], [120, "Allegro"], [108, "Moderato"], [76, "Andante"], [66, "Adagio"], [60, "Larghetto"], [0, "Largo"]];
const nameOf = (b) => NAMES.find(([v]) => b >= v)[1];
const rod = svg.querySelector('[data-part="rod"]');
const weight = svg.querySelector('[data-part="weight"]');
const [a, b] = PL.e1, [c, d] = PL.e2, det = a * d - b * c;
function matrixFor(deg) {
  const t = deg * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t);
  // T = M R M^-1 with M = [e1 e2]; rotation is clockwise as seen from the front.
  const r = [cs, -sn, sn, cs];
  const m = [a * r[0] + c * r[1], b * r[0] + d * r[1], a * r[2] + c * r[3], b * r[2] + d * r[3]];
  const inv = [d / det, -b / det, -c / det, a / det];
  const T = [m[0] * inv[0] + m[2] * inv[1], m[1] * inv[0] + m[3] * inv[1], m[0] * inv[2] + m[2] * inv[3], m[1] * inv[2] + m[3] * inv[3]];
  const [ox, oy] = PL.o;
  return "matrix(" + [T[0], T[1], T[2], T[3], ox - T[0] * ox - T[2] * oy, oy - T[1] * ox - T[3] * oy].map((v) => v.toFixed(4)).join(" ") + ")";
}
let s = ${S0}, goal = s, phase = 0, flash = 0, touring = !still.matches, clock = 0, idle = 0, lastSide = 0;
const TOUR = [120, 60, 184, 92];
function tick(dt) {
  if (touring) { clock += dt; goal = sFor(TOUR[Math.floor(clock / 5) % TOUR.length]); } else { idle += dt; if (idle > 5) { touring = !still.matches; clock = 0; } }
  s = follow(s, goal, dt, 0.35);
  const bpm = bpmAt(s), omega = bpm * Math.PI / 60;
  phase += omega * dt;
  const angle = still.matches ? 0 : AMP * Math.sin(phase);
  const side = Math.sign(Math.cos(phase));
  if (side !== lastSide) { flash = 1; lastSide = side; }
  flash = Math.max(0, flash - dt * 6);
  rod.setAttribute("transform", matrixFor(angle));
  weight.setAttribute("transform", "translate(" + (PL.U[0] * s).toFixed(2) + " " + (PL.U[1] * s).toFixed(2) + ")");
  weight.style.opacity = (0.82 + 0.18 * flash).toFixed(3);
  const shown = Math.round(bpm);
  say("♩ = " + shown + " · " + nameOf(shown) + (flash > 0.5 ? " · tick" : " · "));
}
const steer = (next) => { touring = false; idle = 0; goal = clamp(next, 40, 100); };
stage.addEventListener("pointermove", (e) => { const box = svg.getBoundingClientRect(); steer(100 - clamp(((e.clientY - box.top) / box.height - 0.2) / 0.6, 0, 1) * 60); });
stage.addEventListener("keydown", (e) => {
  const now = Math.round(bpmAt(goal));
  let i = MARKS.findIndex((m) => m >= now); if (i < 0) i = MARKS.length - 1;
  if (e.key === "ArrowUp" || e.key === "ArrowRight") i = Math.min(MARKS.length - 1, MARKS[i] > now ? i : i + 1);
  else if (e.key === "ArrowDown" || e.key === "ArrowLeft") i = Math.max(0, i - 1);
  else return;
  e.preventDefault(); steer(sFor(MARKS[i]));
});
loop(tick);
`;

writePage(HERE, "metronome", {
  width: WIDTH,
  height: HEIGHT,
  label: "A wind-up pyramid metronome. A rod swings from a pivot near the base; a brass weight slides along it. Sliding the weight up makes the pendulum slower, and the tempo scale behind the rod shows where each beat rate sits.",
  body: body0,
  fig: "Fig 5",
  title: "Wind-up metronome",
  hint: "Hover up or down to slide the weight",
  readout: "♩ = 120 · Allegro · ",
  keys: [
    { mark: "lit", label: "Sliding weight: higher is slower" },
    { mark: "raised", label: "Tempo scale, 40 to 208 beats a minute" },
  ],
  caption: "A metronome is a pendulum with a heavy bob below the pivot and a small weight above it. Raise the small weight and the swing slows: 40 mm above the pivot gives 208 beats a minute, 100 mm gives 40. It ticks at both ends of every swing.",
  aria: "Metronome: arrow keys step the tempo up or down",
  live,
});
