import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, tools, basePlate, labelPlate, writePage } from "../common.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 600;
const HEIGHT = 420;

const PLATE = { x: -80, y: -82, w: 160, d: 168, r: 8 };
const BODY = { x: -62, y: -64, w: 124, d: 134, r: 18 };
const BODY_Z = 3;
const BODY_TOP = 24;
const TIER = { x: -58, y: -60, w: 116, d: 46, r: 10 };
const TIER_TOP = 31;

const C = [4, 26];
const PLATE_R = 40;
const DIAL_Z = BODY_TOP + 2;
const WHEEL_R = 32;
const WHEEL_Z = DIAL_Z + 1;
const WHEEL_TOP = WHEEL_Z + 3;
const HOLE_R = 4.4;
const HOLE_AT = 24.5;
const STOP = 132;
const STEP = 30;
const LOST = 21;

const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [-58, -46, 56], [58, -46, 56]], WIDTH, HEIGHT, { pad: 34, azimuth: 40, elevation: 36 });
const { at, S, L, D, byDepth } = tools(P);

const polar = (deg, r) => [C[0] + Math.sin((deg * Math.PI) / 180) * r, C[1] - Math.cos((deg * Math.PI) / 180) * r];
const holeAngle = (n) => STOP - STEP * (n + 1);
const rotated = (centre, deg, len, wid) => {
  const a = (deg * Math.PI) / 180, u = [Math.sin(a), -Math.cos(a)], v = [Math.cos(a), Math.sin(a)];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [centre[0] + u[0] * i * len / 2 + v[0] * j * wid / 2, centre[1] + u[1] * i * len / 2 + v[1] * j * wid / 2]);
};

function body() {
  const out = [];
  for (const [x, y] of byDepth(k.corners(BODY, 14))) out.push(S(k.cylinder(x, y, 4, 0, BODY_Z, P, 20), { tone: "lo" }));
  out.push(`<path class="iso-halo" d="${k.haloOf(BODY, BODY_Z, 1, P)}" style="filter:blur(4px)"/>`);
  out.push(S(k.slabOf(BODY, BODY_Z, BODY_TOP - BODY_Z, P, 10, 1.4), { tone: "mid", inner: L(k.sideSeam(BODY, 9, P, 10), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BODY, 4), BODY_TOP, P, 10), { tone: "faint" }));
  out.push(S(k.slabOf(TIER, BODY_TOP, TIER_TOP - BODY_TOP, P, 8, 0.8), { tone: "mid" }));
  const screws = k.corners(TIER, 6);
  out.push(D(screws.map(([x, y]) => at([x, y, TIER_TOP])), { size: 0.5, tone: "lo" }));
  out.push(labelPlate({ x: -14, y: -26, w: 28, d: 9, r: 1 }, TIER_TOP, P));
  const knob = [50, 54];
  out.push(S(k.cylinder(knob[0], knob[1], 6, BODY_TOP, 1, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(knob[0], knob[1], 5, BODY_TOP + 1, 4, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 5, BODY_TOP + 1, BODY_TOP + 5, 30, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([knob[0], knob[1] - 1], [knob[0], knob[1] - 4.4], BODY_TOP + 5, P), { tone: "hi" }));
  out.push(D([at([knob[0], knob[1], BODY_TOP + 5])], { size: 0.45, tone: "hi" }));
  return out.join("");
}

function handset() {
  const out = [];
  const ends = [-44, 44];
  for (const x of ends) {
    out.push(S(k.slabOf({ x: x - 9, y: -54, w: 18, d: 14, r: 2 }, TIER_TOP, 6, P, 3, 0.5), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 4, y: -51, w: 8, d: 8, r: 1.5 }, TIER_TOP + 6, 2, P, 3), { tone: "lo" }));
  }
  const cupZ = TIER_TOP + 8;
  for (const x of byDepth(ends.map((x) => [x, -47])).map(([x]) => x)) {
    out.push(S(k.cylinder(x, -47, 11, cupZ, 3, P, 40), { tone: "mid" }));
    out.push(S(k.cylinder(x, -47, 10, cupZ + 3, 6, P, 40, 0.6), { tone: "mid" }));
    out.push(L(k.sideArc(x, -47, 10, cupZ + 6.5, P, 28), { tone: "faint" }));
  }
  const handle = { x: -40, y: -52, w: 80, d: 10, r: 4 };
  out.push(S(k.slabOf(handle, cupZ + 9, 6, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(handle, cupZ + 11.5, P, 4), { tone: "faint" }) }));
  return out.join("");
}

function dialPlate() {
  const out = [];
  out.push(S(k.cylinder(C[0], C[1], PLATE_R + 1.5, BODY_TOP, 0.8, P, 72), { tone: "lo" }));
  out.push(S(k.cylinder(C[0], C[1], PLATE_R, BODY_TOP + 0.8, DIAL_Z - BODY_TOP - 0.8, P, 72, 0.6), { tone: "hi", crease: "lo" }));
  const ticks = k.radialTicks(C[0], C[1], PLATE_R - 1, 60, 5, DIAL_Z, [0.9, 1.6], P);
  out.push(L(ticks.minor, { tone: "faint" }));
  for (let n = 1; n <= 10; n++) {
    const [x, y] = polar(holeAngle(n), PLATE_R - 4.6);
    out.push(k.faceTextSvg(k.topMatrix([x, y], DIAL_Z, P, "x"), String(n % 10), { size: 3.6, tone: "mid", anchor: "middle" }));
  }
  return out.join("");
}

function wheel() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: C[0] - WHEEL_R, y: C[1] - WHEEL_R, w: WHEEL_R * 2, d: WHEEL_R * 2, r: WHEEL_R }, WHEEL_Z, 0.5, P)}" style="filter:blur(2px)"/>`);
  out.push(S(k.cylinder(C[0], C[1], WHEEL_R, WHEEL_Z, WHEEL_TOP - WHEEL_Z, P, 72, 0.6), { tone: "mid" }));
  out.push(L(k.ring(C[0], C[1], WHEEL_R - 2, WHEEL_TOP, P, 72), { tone: "faint" }));
  out.push(L(k.ring(C[0], C[1], HOLE_AT - HOLE_R - 2, WHEEL_TOP, P, 64), { tone: "faint" }));
  out.push(S(k.cylinder(C[0], C[1], 12, WHEEL_TOP, 1, P, 48, 0.4), { tone: "hi", crease: "lo" }));
  out.push(labelPlate({ x: C[0] - 8, y: C[1] - 5, w: 16, d: 8, r: 1 }, WHEEL_TOP + 1, P));
  out.push(D([at([C[0], C[1] - 8.5, WHEEL_TOP + 1]), at([C[0], C[1] + 8.5, WHEEL_TOP + 1])], { size: 0.5, tone: "lo" }));
  return out.join("");
}

const holesAt = (turn) => Array.from({ length: 10 }, (_, i) => {
  const [x, y] = polar(holeAngle(i + 1) + turn, HOLE_AT);
  return k.ring(x, y, HOLE_R, WHEEL_TOP, P, 28) + k.ring(x, y, HOLE_R - 1, DIAL_Z, P, 24);
});

function fingerStop() {
  const out = [];
  const foot = polar(STOP, PLATE_R - 3);
  out.push(S(k.extrude(rotated(foot, STOP, 8, 6), DIAL_Z, 1, P), { tone: "lo" }));
  out.push(S(k.extrude(rotated(polar(STOP, PLATE_R - 4.5), STOP, 4, 3), DIAL_Z + 1, 4.6, P), { tone: "mid" }));
  out.push(S(k.extrude(rotated(polar(STOP, HOLE_AT + 2), STOP, 16, 3), WHEEL_TOP + 1.6, 1.6, P), { tone: "hi", lit: true }));
  out.push(D([at([...foot, DIAL_Z + 1])], { size: 0.45, tone: "lo" }));
  return out.join("");
}

const body0 = [
  basePlate(PLATE, P),
  body(),
  handset(),
  dialPlate(),
  wheel(),
  `<path data-part="holes" class="iso-line" data-tone="lo" d="${holesAt(0).join("")}"/>`,
  `<path data-part="active" class="iso-line" data-tone="lit" d="" style="stroke-width:1.1"/>`,
  fingerStop(),
];

const live = `
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)}, STOP = ${STOP}, STEP = ${STEP}, LOST = ${LOST}, HOLE_AT = ${HOLE_AT}, HOLE_R = ${HOLE_R}, WHEEL_TOP = ${WHEEL_TOP}, DIAL_Z = ${DIAL_Z};
const polar = ${polar.toString()};
const holeAngle = ${holeAngle.toString()};
const holesAt = ${holesAt.toString().replaceAll("k.ring", "ring")};
const holes = svg.querySelector('[data-part="holes"]');
const active = svg.querySelector('[data-part="active"]');
const NUMBER = "5550142";
let turn = 0, phase = "rest", digit = 0, timer = 0, dialed = "", queue = [], touring = !still.matches, idle = 0, pulses = 0;
const reach = (n) => (n + 1) * STEP - 9;
function start(n) { digit = n; phase = "wind"; timer = 0; pulses = 0; }
function tick(dt) {
  if (touring && phase === "rest" && !queue.length) { timer += dt; if (timer > 1.6) { dialed = dialed.length >= NUMBER.length ? "" : dialed; queue = NUMBER.slice(dialed.length).split("").map(Number); timer = 0; } }
  if (!touring) { idle += dt; if (idle > 5 && !still.matches) { touring = true; dialed = ""; } }
  if (phase === "rest" && queue.length) { timer += dt; if (timer > 0.45) start(queue.shift() || 10); }
  const goal = reach(digit);
  if (phase === "wind") { turn = follow(turn, goal, dt, 0.16); if (goal - turn < 0.3) { turn = goal; phase = "hold"; timer = 0; } }
  else if (phase === "hold") { timer += dt; if (timer > 0.18) phase = "return"; }
  else if (phase === "return") {
    turn = still.matches ? 0 : Math.max(0, turn - 300 * dt);
    const back = goal - turn;
    pulses = back > LOST ? Math.min(digit, Math.floor((back - LOST) / STEP) + 1) : 0;
    if (turn === 0) { pulses = digit; phase = "rest"; timer = 0; dialed += String(digit % 10); }
  }
  holes.setAttribute("d", holesAt(turn).join(""));
  const busy = phase !== "rest";
  if (busy) { const [x, y] = polar(holeAngle(digit) + turn, HOLE_AT); active.setAttribute("d", ring(x, y, HOLE_R, WHEEL_TOP, P, 28)); }
  else active.setAttribute("d", "");
  const shown = dialed.replace(/^(\\d{3})(\\d)/, "$1-$2");
  say(busy ? "dialing " + (digit % 10) + " · pulse " + pulses + " of " + digit + " · " + (shown || "—") : (shown ? "dialed " + shown : "on hook · dial a number"));
}
function dial(n) { touring = false; idle = 0; if (dialed.length >= 7) dialed = ""; queue.push(n || 10); }
stage.addEventListener("keydown", (e) => { if (/^[0-9]$/.test(e.key)) { e.preventDefault(); dial(Number(e.key)); } });
stage.addEventListener("click", () => dial(1 + Math.floor(Math.random() * 10)));
loop(tick);
`;

writePage(HERE, "rotary-dial", {
  width: WIDTH,
  height: HEIGHT,
  label: "A desk telephone with a rotary dial. A finger wheel with ten holes turns clockwise to a metal finger stop, then a governor spins it back at a steady ten pulses a second; each pulse is one break in the line, so dialing 5 sends five clicks.",
  body: body0,
  fig: "Fig 2",
  title: "Rotary dial",
  hint: "Type a digit, or click to dial",
  readout: "on hook · dial a number",
  keys: [
    { mark: "lit", label: "Finger stop and the hole being dialed" },
    { mark: "raised", label: "Finger wheel: ten holes, 30° apart" },
  ],
  caption: "Pull a digit round to the stop and let go. The wheel returns at a governed 10 pulses per second, and the line opens once per 30° it passes: 1 sends one pulse, 0 sends ten. That is why 0 took longest to dial.",
  aria: "Rotary dial: type a digit from 0 to 9 to dial it",
  live,
});
