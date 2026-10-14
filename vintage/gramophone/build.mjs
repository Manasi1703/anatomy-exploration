import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, tools, basePlate, labelPlate, writePage } from "../common.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 600;
const HEIGHT = 480;

// Truth: a 10-inch 78: 127 mm radius, grooves from 117 mm in to 55 mm, about 3 minutes a side.
// Constant groove pitch at constant rpm, so the stylus radius falls linearly with time.
const MM = 127 / 36;
const R_OUT = 117 / MM;
const R_IN = 55 / MM;
const SIDE = 180;

const PLATE = { x: -74, y: -74, w: 148, d: 150, r: 8 };
const BOX = { x: -50, y: -50, w: 100, d: 100, r: 3 };
const BOX_Z = 3;
const BOX_TOP = 34;
const LID = { x: -52, y: -52, w: 104, d: 104, r: 3.5 };
const DECK = BOX_TOP + 3;
const REC = [-2, 6];
const POST = [-38, -38];
const ARM_Z = DECK + 9;
const ARM_L = 54;
const ELBOW = [POST[0], POST[1], ARM_Z + 7];
const HORN_A = G.unit3([0.12, 0.3, 0.95]);
const HORN_L = 112;
const R0 = 3.2;
const R1 = 46;
const flare = Math.log(R1 / R0) / HORN_L;
const hornR = (s) => R0 * Math.exp(flare * s);
const hornSlope = (s) => flare * hornR(s);

const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), G.add3(ELBOW, G.mul3(HORN_A, HORN_L + 4)), [POST[0] - 40, POST[1], 175], [POST[0] + 50, POST[1] + 20, 175]], WIDTH, HEIGHT, { pad: 26, azimuth: 45, elevation: 30 });
const { at, S, L, D, byDepth } = tools(P);

function cabinet() {
  const out = [];
  for (const [x, y] of byDepth(k.corners(BOX, 8))) out.push(S(k.cylinder(x, y, 3.6, 0, BOX_Z, P, 20), { tone: "lo" }));
  out.push(S(k.slabOf(BOX, BOX_Z, BOX_TOP - BOX_Z, P, 3, 0.6), { tone: "mid", inner: [8, 27].map((z) => L(k.sideSeam(BOX, z, P, 3), { tone: "faint" })).join("") }));
  out.push(S(k.slabOf(LID, BOX_TOP, DECK - BOX_TOP, P, 3, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(LID, 3), DECK, P, 3), { tone: "faint" }));
  out.push(D(k.corners(LID, 6).map(([x, y]) => at([x, y, DECK])), { size: 0.45, tone: "lo" }));
  return out.join("");
}

function crank() {
  const F = G.frameOf([BOX.x + BOX.w, 12, 19], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const out = [S(G.disc(0, 1.5, 6, F, P), { tone: "lo" }), S(G.disc(1.5, 10, 1.6, F, P), { tone: "mid" })];
  out.push(S(G.prismOf(F, [[-2.2, -2.2], [2.2, -2.2], [2.2, 24], [-2.2, 24]], 10, 12.4, P), { tone: "mid" }));
  const knob = G.frameOf(G.pointOf(F, 12.4, 22, Math.PI / 2), [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 2, 2.4, knob, P), { tone: "lo" }), S(G.disc(2, 10, 3.2, knob, P, {}), { tone: "mid" }));
  out.push(L(G.circleOf(knob, 10, 1.6, P), { tone: "lo" }));
  return out.join("");
}

function speedKnob() {
  const [x, y] = [40, 40];
  return [S(k.cylinder(x, y, 5.4, DECK, 1, P, 32), { tone: "lo" }), S(k.cylinder(x, y, 4.4, DECK + 1, 4, P, 32), { tone: "mid" }), L(k.knurl(x, y, 4.4, DECK + 1, DECK + 5, 28, P), { tone: "lo" }), L(k.lineOnTop([x, y - 1], [x, y - 4], DECK + 5, P), { tone: "hi" })].join("");
}

function turntable() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: REC[0] - 38, y: REC[1] - 38, w: 76, d: 76, r: 38 }, DECK, 1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.cylinder(REC[0], REC[1], 38, DECK, 3, P, 96, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(REC[0], REC[1], 36, DECK + 3, 1, P, 96, 0.4), { tone: "lo", crease: "lo" }));
  const grooves = [];
  for (let r = R_IN; r <= R_OUT + 0.01; r += 1.4) grooves.push(k.ring(REC[0], REC[1], r, DECK + 4, P, 96));
  out.push(L(grooves.join(""), { tone: "faint" }));
  out.push(L(k.ring(REC[0], REC[1], 34.6, DECK + 4, P, 96), { tone: "lo" }));
  out.push(S(k.cylinder(REC[0], REC[1], 11, DECK + 4, 0.2, P, 64), { tone: "hi", crease: "none" }));
  out.push(L(k.ring(REC[0], REC[1], 9, DECK + 4.2, P, 48), { tone: "lo" }));
  out.push(`<path data-part="spin" class="iso-line" data-tone="mid" data-free="end" d=""/>`);
  out.push(S(k.cylinder(REC[0], REC[1], 1.1, DECK + 4.2, 4, P, 16), { tone: "hi" }));
  return out.join("");
}

function post() {
  return [S(k.cylinder(POST[0], POST[1], 7, DECK, 1.6, P, 40), { tone: "lo" }), S(k.cylinder(POST[0], POST[1], 4.6, DECK + 1.6, ARM_Z - DECK - 1.6, P, 32), { tone: "mid" }), L(k.sideArc(POST[0], POST[1], 4.6, DECK + 4, P, 20), { tone: "faint" })].join("");
}

function horn() {
  const F = G.frameAlong(ELBOW, HORN_A);
  const out = [S(G.sphereOf(ELBOW, 5.6, P), { tone: "mid" })];
  const body = G.solidOf([[0, hornR(0)], [HORN_L, hornR(HORN_L)]], F, P, { smooth: { slope: hornSlope, radius: hornR } });
  const seams = [40, 70, 92].map((s) => G.arcOf(F, s, hornR(s), P, { slope: hornSlope(s) })).join("");
  out.push(S(body, { tone: "hi", inner: L(seams, { tone: "faint" }) }));
  out.push(`<path class="iso-shade" data-shade="3" d="${G.circleOf(F, HORN_L, R1 - 1.6, P)}"/>`);
  out.push(L(G.circleOf(F, HORN_L, R1 - 1.6, P), { tone: "lo" }));
  out.push(`<path class="iso-shade" data-shade="2" style="opacity:.55" d="${G.circleOf(F, HORN_L - 0.01, R1 * 0.42, P)}"/>`);
  out.push(`<path class="iso-shade" data-shade="1" style="opacity:.45" d="${G.circleOf(F, HORN_L - 0.02, R1 * 0.16, P)}"/>`);
  out.push(S(G.ringBand(HORN_L - 1, HORN_L + 0.6, R1 - 1.6, R1 + 1, F, P), { tone: "hi", lit: true }));
  return out.join("");
}

// The needle sits where a circle of radius ARM_L round the post meets a groove of radius rho.
const d = Math.hypot(REC[0] - POST[0], REC[1] - POST[1]);
const needleAt = (rho) => {
  const a = (ARM_L * ARM_L - rho * rho + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, ARM_L * ARM_L - a * a));
  const ex = (REC[0] - POST[0]) / d, ey = (REC[1] - POST[1]) / d;
  return [POST[0] + ex * a + ey * h, POST[1] + ey * a - ex * h];
};

const body0 = [
  basePlate(PLATE, P),
  labelPlate({ x: 18, y: PLATE.y + PLATE.d - 26, w: 34, d: 9, r: 1 }, 0, P),
  cabinet(),
  crank(),
  speedKnob(),
  turntable(),
  post(),
  `<g data-part="arm"></g>`,
  horn(),
];

const live = `
const P = ${JSON.stringify(P)};
const REC = ${JSON.stringify(REC)}, POST = ${JSON.stringify(POST)}, ARM_L = ${ARM_L}, ARM_Z = ${ARM_Z}, DECK = ${DECK}, d = ${d};
const R_OUT = ${R_OUT}, R_IN = ${R_IN}, SIDE = ${SIDE}, MM = ${MM};
const needleAt = ${needleAt.toString()};
const arm = svg.querySelector('[data-part="arm"]');
const spin = svg.querySelector('[data-part="spin"]');
const bar = (a, b, w) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy), px = -dy / n * w / 2, py = dx / n * w / 2; return [[a[0] + px, a[1] + py], [b[0] + px, b[1] + py], [b[0] - px, b[1] - py], [a[0] - px, a[1] - py]]; };
function drawArm(rho) {
  const tip = needleAt(rho);
  const dir = [tip[0] - POST[0], tip[1] - POST[1]], n = Math.hypot(...dir);
  const box = [tip[0] - dir[0] / n * 6, tip[1] - dir[1] / n * 6];
  arm.innerHTML = [
    solidSvg(extrude(bar(POST, box, 3.2), ARM_Z, 3, P), { tone: "mid" }),
    solidSvg(cylinder(POST[0], POST[1], 5.2, ARM_Z, 4.4, P, 32), { tone: "mid" }),
    solidSvg(cylinder(box[0], box[1], 7.5, ARM_Z - 2.5, 4, P, 40, 0.4), { tone: "hi", crease: "lo" }),
    lineSvg(ring(box[0], box[1], 5, ARM_Z + 1.5, P, 32), { tone: "lo" }),
    lineSvg(segment([tip[0], tip[1], DECK + 4], [box[0], box[1], ARM_Z - 2.5], P), { tone: "lit" }),
    dotsSvg([iso([tip[0], tip[1], DECK + 4], P)], { size: 0.7, tone: "lit" }),
  ].join("");
}
let t = 20, goal = null, turn = 0, touring = !still.matches, idle = 0, lifted = 0;
const rhoAt = (time) => R_OUT - (R_OUT - R_IN) * time / SIDE;
const clock = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
let rho = rhoAt(t);
function tick(dt) {
  if (touring) { t += dt * 10; if (t > SIDE + 6) t = 0; }
  else { idle += dt; if (idle > 5) { touring = !still.matches; t = clamp(SIDE * (R_OUT - rho) / (R_OUT - R_IN), 0, SIDE); } }
  const want = goal !== null && !touring ? goal : rhoAt(Math.min(t, SIDE));
  rho = follow(rho, want, dt, touring ? 0.05 : 0.25);
  if (!still.matches && t <= SIDE) turn += dt * 78 / 60 * Math.PI * 2;
  const a = -turn;
  spin.setAttribute("d", lineOnTop([REC[0] + Math.sin(a) * 2.5, REC[1] - Math.cos(a) * 2.5], [REC[0] + Math.sin(a) * 9, REC[1] - Math.cos(a) * 9], DECK + 4.2, P));
  drawArm(rho);
  const played = clamp(SIDE * (R_OUT - rho) / (R_OUT - R_IN), 0, SIDE);
  say(t > SIDE && touring ? "78 rpm · run-out groove" : "78 rpm · " + clock(played) + " of 3:00 · groove at " + Math.round(rho * MM) + " mm");
}
stage.addEventListener("pointermove", (e) => { const box = svg.getBoundingClientRect(); touring = false; idle = 0; goal = R_OUT - clamp(((e.clientX - box.left) / box.width - 0.2) / 0.6, 0, 1) * (R_OUT - R_IN); });
stage.addEventListener("keydown", (e) => { const step = e.key === "ArrowRight" ? -2 : e.key === "ArrowLeft" ? 2 : 0; if (!step) return; e.preventDefault(); touring = false; idle = 0; goal = clamp((goal ?? rho) + step, R_IN, R_OUT); });
loop(tick);
`;

writePage(HERE, "gramophone", {
  width: WIDTH,
  height: HEIGHT,
  label: "A wind-up gramophone. A 78 rpm record turns on a felt platter; a tonearm swings from a post at the back so its steel needle follows the groove from the rim toward the label, and a flared brass horn above the post carries the sound up and out.",
  body: body0,
  fig: "Fig 4",
  title: "Gramophone",
  hint: "Hover left to right to move the needle",
  readout: "78 rpm · 0:20 of 3:00",
  keys: [
    { mark: "lit", label: "Needle and horn mouth: where the sound goes in and comes out" },
    { mark: "raised", label: "10-inch 78: grooves from 117 mm to 55 mm" },
  ],
  caption: "The groove spirals inward at a constant pitch while the record turns at 78 rpm, so the needle walks from 117 mm to 55 mm in about three minutes. The tonearm only steers; the horn's exponential flare is the amplifier. Time runs ten times fast here.",
  aria: "Gramophone: left and right arrows move the needle across the record",
  live,
});
