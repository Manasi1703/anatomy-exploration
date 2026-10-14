import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, tools, basePlate, labelPlate, frustum, writePage } from "../common.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 600;
const HEIGHT = 500;

const PLATE = { x: -78, y: -66, w: 156, d: 160, r: 8 };
const CAB = { x: -56, y: -50, w: 112, d: 96, r: 3 };
const CAB_Z = 4;
const CAB_TOP = 40;
const FRONT = CAB.y + CAB.d;
const DRAWER = { x: -50, w: 100, z: 9, h: 22, reach: 30, depth: 40 };
const HOUSE = { x: -48, y: -46, w: 96, d: 24, r: 2 };
const HOUSE_TOP = 100;
const HOUSE_FRONT = HOUSE.y + HOUSE.d;
const WIN = { z0: 74, z1: 92 };
const COLS = [-30, -6, 18];
const UNITS = [100, 10, 1];
const ROWS = 6;
const rowY = (j) => FRONT - 12 - j * 9.5;
const rowZ = (j) => CAB_TOP + j * 3.2;
const TOTAL = [40, rowY(2)];
const KEY_H = 10;
const PRESS = 3.6;

const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), ...k.boxCorners(HOUSE, 0, HOUSE_TOP + 14), [0, FRONT + DRAWER.reach + 4, CAB_Z]], WIDTH, HEIGHT, { pad: 26, azimuth: 52, elevation: 30 });
const { at, S, L, D, byDepth } = tools(P);
const poly = (pts) => "M" + pts.map((p) => k.iso(p, P).join(" ")).join("L") + "Z";

function cabinet() {
  const out = [];
  for (const [x, y] of byDepth(k.corners(CAB, 6))) out.push(S(k.cylinder(x, y, 4, 0, CAB_Z, P, 20), { tone: "lo" }));
  out.push(S(k.slabOf(CAB, CAB_Z, CAB_TOP - CAB_Z, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(CAB, CAB_Z + 34, P, 3), { tone: "faint" }) }));
  // Drawer opening on the front face, and a panel line round the side.
  out.push(`<path class="iso-shade" data-shade="3" d="${poly([[DRAWER.x, FRONT + 0.1, DRAWER.z], [DRAWER.x + DRAWER.w, FRONT + 0.1, DRAWER.z], [DRAWER.x + DRAWER.w, FRONT + 0.1, DRAWER.z + DRAWER.h], [DRAWER.x, FRONT + 0.1, DRAWER.z + DRAWER.h]])}"/>`);
  out.push(L(poly([[CAB.x + CAB.w + 0.1, CAB.y + 8, CAB_Z + 6], [CAB.x + CAB.w + 0.1, FRONT - 8, CAB_Z + 6], [CAB.x + CAB.w + 0.1, FRONT - 8, CAB_TOP - 8], [CAB.x + CAB.w + 0.1, CAB.y + 8, CAB_TOP - 8]]), { tone: "faint" }));
  out.push(D([[CAB.y + 11, CAB_Z + 9], [FRONT - 11, CAB_Z + 9], [CAB.y + 11, CAB_TOP - 11], [FRONT - 11, CAB_TOP - 11]].map(([y, z]) => at([CAB.x + CAB.w + 0.1, y, z])), { size: 0.5, tone: "lo" }));
  return out.join("");
}

function housing() {
  const out = [S(k.slabOf(HOUSE, CAB_TOP, HOUSE_TOP - CAB_TOP, P, 2, 0.8), { tone: "mid", inner: [CAB_TOP + 22, WIN.z0 - 3, WIN.z1 + 3].map((z) => L(k.sideSeam(HOUSE, z, P, 2), { tone: "faint" })).join("") })];
  const crest = { x: HOUSE.x - 3, y: HOUSE.y - 3, w: HOUSE.w + 6, d: HOUSE.d + 6, r: 2 };
  out.push(S(k.slabOf(crest, HOUSE_TOP, 3, P, 2, 0.6), { tone: "mid" }));
  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  out.push(S(frustum(rect(-36, 36, HOUSE.y + 2, HOUSE_FRONT - 2), HOUSE_TOP + 3, rect(-14, 14, HOUSE.y + 8, HOUSE_FRONT - 8), HOUSE_TOP + 12, P), { tone: "mid" }));
  out.push(S(G.sphereOf([0, HOUSE.y + HOUSE.d / 2, HOUSE_TOP + 14.5], 2.6, P), { tone: "hi" }));
  // The window: a dark recess the number flags rise into.
  const win = [[-42, HOUSE_FRONT + 0.1, WIN.z0], [42, HOUSE_FRONT + 0.1, WIN.z0], [42, HOUSE_FRONT + 0.1, WIN.z1], [-42, HOUSE_FRONT + 0.1, WIN.z1]];
  out.push(`<path class="iso-shade" data-shade="3" d="${poly(win)}"/>`);
  out.push(`<clipPath id="window"><path d="${poly(win)}"/></clipPath><g clip-path="url(#window)" data-part="flags"></g>`);
  out.push(L(poly(win), { tone: "lo" }));
  out.push(L(poly([[-44, HOUSE_FRONT + 0.1, WIN.z0 - 2], [44, HOUSE_FRONT + 0.1, WIN.z0 - 2], [44, HOUSE_FRONT + 0.1, WIN.z1 + 2], [-44, HOUSE_FRONT + 0.1, WIN.z1 + 2]]), { tone: "faint" }));
  return out.join("");
}

function bell() {
  const F = G.frameOf([HOUSE.x + HOUSE.w, HOUSE.y + HOUSE.d / 2, 60], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const dome = (s) => Math.sqrt(Math.max(0, 1 - (s / 7) ** 2)) * 5.4;
  const prof = [0, 1.5, 3, 4.5, 5.5, 6.3, 6.8, 7].map((s) => [s, dome(s), 1]);
  return `<g data-part="bell">${S(G.disc(0, 1.6, 2, F, P), { tone: "mid" })}${S(G.solidOf(prof.map(([s, r, f]) => [s + 1.6, r, f]), F, P), { tone: "hi" })}</g>`;
}

function crank() {
  const F = G.frameOf([CAB.x + CAB.w, 0, 24], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const out = [S(G.disc(0, 1.5, 7, F, P), { tone: "lo" }), S(G.disc(1.5, 9, 2, F, P), { tone: "mid" })];
  out.push(S(G.prismOf(F, [[-2.4, -2.4], [26, -2.4], [26, 2.4], [-2.4, 2.4]], 9, 11.6, P), { tone: "mid" }));
  const knob = G.frameOf(G.pointOf(F, 11.6, 24, 0), [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 9, 3, knob, P), { tone: "mid" }), L(G.circleOf(knob, 9, 1.6, P), { tone: "lo" }));
  return out.join("");
}

function deck() {
  const out = [];
  for (let j = ROWS - 1; j >= 0; j--) {
    const plan = { x: -42, y: rowY(j) - 4.75, w: 92, d: 9.5, r: 0.6 };
    out.push(S(k.slabOf(plan, CAB_TOP, rowZ(j) - CAB_TOP + 0.01, P, 2, 0.4), { tone: "mid" }));
    for (const x of COLS) out.push(L(k.ring(x, rowY(j), 2, rowZ(j), P, 16), { tone: "lo" }));
  }
  return out.join("");
}

// One key, built at rest; pressing moves its group down by PRESS.
function key(x, y, z, label, { r = 4.2, total = false } = {}) {
  const top = z + KEY_H;
  const out = [S(k.cylinder(x, y, 1.3, z, KEY_H - 2.4, P, 12), { tone: "mid", crease: "none" })];
  if (total) out.push(S(k.slabOf({ x: x - 5, y: y - 8, w: 10, d: 16, r: 3 }, top - 2.4, 2.8, P, 4, 0.5), { tone: "hi", crease: "lo" }));
  else out.push(S(k.cylinder(x, y, r, top - 2.4, 2.4, P, 32, 0.4), { tone: "hi", crease: "lo" }), L(k.ring(x, y, r - 0.9, top, P, 28), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 1.1], total ? top + 0.4 : top, P, "x"), label, { size: total ? 2.4 : 3, tone: "mid", anchor: "middle" }));
  return out.join("");
}

function keys() {
  const list = [];
  COLS.forEach((x, c) => {
    for (let j = 0; j < ROWS; j++) list.push({ x, y: rowY(j), z: rowZ(j), id: `${c}-${j + 1}`, label: c === 0 ? `$${j + 1}` : c === 1 ? `${(j + 1) * 10}` : `${j + 1}` });
  });
  list.push({ x: TOTAL[0], y: TOTAL[1], z: rowZ(2), id: "total", label: "TOTAL", total: true });
  return byDepth(list.map((key) => [key.x, key.y, key.z, key]))
    .map(([, , , item]) => `<g data-key="${item.id}">${key(item.x, item.y, item.z, item.label, { total: item.total })}</g>`)
    .join("");
}

const flagSvg = (col, digit) => {
  const x = COLS[col] - 2;
  const face = HOUSE_FRONT - 1;
  const box = poly([[x - 7, face, WIN.z0 - 14], [x + 7, face, WIN.z0 - 14], [x + 7, face, WIN.z0 + 1], [x - 7, face, WIN.z0 + 1]]);
  return `<path class="iso-top" d="${box}"/><path class="iso-line" data-tone="mid" d="${box}"/>` + k.faceTextSvg(k.sideMatrix([x - 3.2, face + 0.05, 0], WIN.z0 - 4.6, P, "left"), String(digit), { size: 8, tone: "hi" });
};
const FLAGS = COLS.map((_, col) => Array.from({ length: ROWS + 1 }, (_, d) => flagSvg(col, d)));

const body0 = [
  basePlate(PLATE, P),
  labelPlate({ x: -60, y: PLATE.y + PLATE.d - 30, w: 32, d: 9, r: 1 }, 0, P),
  cabinet(),
  housing(),
  bell(),
  crank(),
  deck(),
  keys(),
  `<g data-part="drawer"></g>`,
];

const live = `
const P = ${JSON.stringify(P)};
const COLS = ${JSON.stringify(COLS)}, UNITS = ${JSON.stringify(UNITS)}, FRONT = ${FRONT}, DRAWER = ${JSON.stringify(DRAWER)}, PRESS = ${PRESS}, WIN = ${JSON.stringify(WIN)};
const FLAGS = ${JSON.stringify(FLAGS)};
const flags = svg.querySelector('[data-part="flags"]');
const drawerG = svg.querySelector('[data-part="drawer"]');
const bellG = svg.querySelector('[data-part="bell"]');
const keyEls = Object.fromEntries([...svg.querySelectorAll("[data-key]")].map((el) => [el.dataset.key, el]));
const SALES = [125, 37, 260, 405, 512, 63];
let sale = 0, script = [], clock = 0, open = 0, openGoal = 0, bellT = 9, shown = [0, 0, 0], lift = [0, 0, 0], press = {}, amount = 0, state = "idle", wait = 1.2, touring = !still.matches;
const digitsOf = (cents) => [Math.floor(cents / 100), Math.floor(cents / 10) % 10, cents % 10];
function ringUp(cents) {
  const d = digitsOf(cents);
  script = [];
  d.forEach((v, c) => { if (v) script.push({ at: script.length * 0.45, key: c + "-" + v, col: c, digit: v }); });
  script.push({ at: script.length * 0.45 + 0.2, key: "total" });
  amount = cents; clock = 0; state = "keying"; shown = [0, 0, 0];
}
function drawDrawer(o) {
  const y0 = FRONT - 2, y1 = FRONT + o;
  const out = [];
  if (o > 0.3) {
    out.push(solidSvg(slabOf({ x: DRAWER.x + 2, y: y0, w: DRAWER.w - 4, d: y1 - y0 - 2, r: 0.5 }, DRAWER.z, DRAWER.h - 3, P, 2), { tone: "lo" }));
    const bins = [DRAWER.x + 4, DRAWER.x + 22, DRAWER.x + 40, DRAWER.x + 58, DRAWER.x + 76];
    bins.forEach((x, i) => {
      const plan = { x, y: y0 + 1, w: 16, d: Math.max(0.5, y1 - y0 - 5), r: 1 };
      out.push(lineSvg(planOutline(plan, DRAWER.z + DRAWER.h - 3, P, 2), { tone: "faint" }));
      for (let n = 0; n < 3; n++) { const cy = y1 - 6 - n * 7; if (cy - 3 > y0) out.push(solidSvg(cylinder(x + 8, cy, 3.2 - i * 0.2, DRAWER.z + DRAWER.h - 3, 1.2 + n * 0.6, P, 20), { tone: "hi", crease: "lo" })); }
    });
  }
  const fp = { x: DRAWER.x, y: y1, w: DRAWER.w, d: 3, r: 0.8 };
  out.push(solidSvg(slabOf(fp, DRAWER.z, DRAWER.h, P, 2, 0.5), { tone: "mid" }));
  out.push(solidSvg(slabOf({ x: -12, y: y1 + 3, w: 24, d: 3, r: 1.4 }, DRAWER.z + 9, 4, P, 3, 0.4), { tone: "hi", lit: open > 0.5 }));
  drawerG.innerHTML = out.join("");
}
function tick(dt) {
  if (state === "idle") { wait -= dt; if (wait <= 0 && touring) ringUp(SALES[sale++ % SALES.length]); }
  if (state === "keying") {
    clock += dt;
    for (const step of script) {
      const t = clock - step.at;
      press[step.key] = t > 0 && t < 0.35 ? 1 : 0;
      if (t > 0.08 && step.col !== undefined) shown[step.col] = step.digit;
      if (step.key === "total" && t > 0.2 && openGoal === 0) { openGoal = 1; bellT = 0; }
    }
    if (clock > script[script.length - 1].at + 2.6) { openGoal = 0; state = "closing"; }
  }
  if (state === "closing" && open < 0.02) { state = "idle"; wait = 1.4; }
  open = follow(open, openGoal, dt, openGoal ? 0.12 : 0.25);
  bellT += dt;
  for (const id in keyEls) { const p = press[id] || 0; keyEls[id].setAttribute("transform", translateAlong(P, [0, 0, -PRESS * p])); }
  lift = lift.map((r, c) => follow(r, shown[c] ? 1 : 0, dt, 0.08));
  flags.innerHTML = COLS.map((_, c) => '<g transform="' + translateAlong(P, [0, 0, 15 * lift[c]]) + '">' + FLAGS[c][shown[c]] + "</g>").join("");
  drawDrawer(open * DRAWER.reach);
  const ringing = bellT < 0.6 && !still.matches;
  bellG.setAttribute("transform", ringing ? "translate(" + (Math.sin(bellT * 60) * 0.6 * (1 - bellT / 0.6)).toFixed(2) + " 0)" : "");
  const money = "$" + (amount / 100).toFixed(2);
  say(state === "idle" ? "ready · last sale " + money : state === "keying" && openGoal ? money + " · ding · drawer open" : state === "keying" ? "keying " + "$" + (shown[0] + shown[1] / 10 + shown[2] / 100).toFixed(2) : money + " · drawer closing");
}
stage.addEventListener("click", () => { if (state !== "idle") return; touring = false; ringUp(1 + Math.floor(Math.random() * 666)); setTimeout(() => { touring = !still.matches; }, 6000); });
stage.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stage.click(); } });
loop(tick);
`;

writePage(HERE, "cash-register", {
  width: WIDTH,
  height: HEIGHT,
  label: "An antique brass cash register. Three columns of keys, dollars, dimes and cents, each raise a numbered flag in the window above; the total key rings the bell and throws the cash drawer open on its spring.",
  body: body0,
  fig: "Fig 1",
  title: "Cash register",
  hint: "Click to ring up a sale",
  readout: "ready · last sale $0.00",
  keys: [
    { mark: "lit", label: "Drawer pull: thrown out by a spring when the total key trips the latch" },
    { mark: "raised", label: "Key columns: dollars, dimes, cents" },
  ],
  caption: "Every key is a lever. Pressing it lifts a numbered flag on a rod into the window, so the customer sees the sale; the total key releases a latch, a spring kicks the drawer out and a hammer strikes the bell. Nothing is added up: the flags are the display.",
  aria: "Cash register: press Enter to ring up a sale",
  live,
});
