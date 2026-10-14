import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, tools, basePlate, frustum, writePage } from "../common.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTH = 600;
const HEIGHT = 540;

// Truth: a 248 mm pendulum beats a 1.0 s period (T = 2π √(L/g)). 1 unit = 3.26 mm.
const MM = 3.26;
const PEND = 76;
const PERIOD = 2 * Math.PI * Math.sqrt((PEND * MM) / 1000 / 9.81);

const PLATE = { x: -72, y: -82, w: 144, d: 104, r: 8 };
const WALL = { x: -62, y: -76, w: 124, d: 8, r: 1.5 };
const WALL_TOP = 236;
const CASE = { x: -34, y: -68, w: 68, d: 34, r: 1.5 };
const Z0 = 124;
const Z1 = 192;
const FRONT = CASE.y + CASE.d;
const DIAL = [0, FRONT, 150];
const DIAL_R = 19;
const DOOR = { x: -7, z: 172, w: 14, h: 13 };
const ROOF = { over: 7, rise: 30, s0: CASE.y - 2, s1: FRONT + 6 };
const PIVOT = [0, FRONT - 6, Z0 - 2];
const AMP = 9;
const WEIGHTS = [-22, 22];
const CHAIN_Y = CASE.y + 18;

const P = k.fitProjection([...k.boxCorners(PLATE, -14, 0), [WALL.x, WALL.y, WALL_TOP], [WALL.x + WALL.w, WALL.y, WALL_TOP], [0, ROOF.s1, Z1 + ROOF.rise + 4]], WIDTH, HEIGHT, { pad: 26, azimuth: 58, elevation: 22 });
const { at, S, L, D } = tools(P);
const FF = G.frameOf([0, FRONT, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
const onFront = (x, z, lift = 0) => [x, FRONT + lift, z];
const poly = (pts) => "M" + pts.map((p) => k.iso(p, P).join(" ")).join("L") + "Z";

function wall() {
  const out = [S(k.slabOf(WALL, 0, WALL_TOP, P, 2, 0.6), { tone: "lo", inner: L(k.sideSeam(WALL, 0.01, P, 2), { tone: "faint" }) })];
  out.push(S(k.slabOf({ x: WALL.x - 4, y: WALL.y - 2, w: WALL.w + 8, d: 12, r: 2 }, 0, 6, P, 3, 0.5), { tone: "mid" }));
  for (const x of [WALL.x + 8, WALL.x + WALL.w - 8]) out.push(L(k.ring(x, WALL.y + WALL.d / 2, 1.6, 6, P, 12), { tone: "lo" }), D([at([x, WALL.y + WALL.d / 2, 6])], { size: 0.45 }));
  const face = WALL.y + WALL.d + 0.1;
  out.push(L([-31, 0, 31].map((x) => k.segment([x, face, 6], [x, face, WALL_TOP], P)).join(""), { tone: "faint" }));
  out.push(D([[WALL.x + 8, WALL_TOP - 8], [WALL.x + WALL.w - 8, WALL_TOP - 8], [WALL.x + 8, 20], [WALL.x + WALL.w - 8, 20]].map(([x, z]) => at([x, face, z])), { size: 0.5, tone: "lo" }));
  return out.join("");
}

function caseBody() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CASE, Z0, 1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(CASE, Z0, Z1 - Z0, P, 2, 0.6), { tone: "mid", inner: [Z0 + 6, Z1 - 4].map((z) => L(k.sideSeam(CASE, z, P, 2), { tone: "faint" })).join("") }));
  out.push(S(k.slabOf({ x: CASE.x - 3, y: CASE.y, w: CASE.w + 6, d: CASE.d + 3, r: 1.5 }, Z0 - 4, 4, P, 2, 0.5), { tone: "mid" }));
  // Front frame round the dial, and four corner pegs.
  out.push(L(poly([onFront(-28, Z0 + 4, 0.1), onFront(28, Z0 + 4, 0.1), onFront(28, Z1 - 30, 0.1), onFront(-28, Z1 - 30, 0.1)]), { tone: "lo" }));
  out.push(D([[-25, Z0 + 7], [25, Z0 + 7], [-25, Z1 - 33], [25, Z1 - 33]].map(([x, z]) => at(onFront(x, z, 0.1))), { size: 0.5, tone: "lo" }));
  // Roof: a gable along y, with shingle courses running front to back on both slopes.
  const RF = G.frameOf([0, ROOF.s0, Z1], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const half = CASE.w / 2 + ROOF.over;
  out.push(S(G.prismOf(RF, [[-half, -1.5], [half, -1.5], [0, ROOF.rise]], 0, ROOF.s1 - ROOF.s0, P), { tone: "mid", crease: "lo" }));
  const courses = [];
  for (let i = 1; i < 5; i++) {
    const f = i / 5;
    for (const side of [-1, 1]) {
      const x = side * half * (1 - f), z = Z1 - 1.5 + (ROOF.rise + 1.5) * f;
      courses.push(k.segment([x, ROOF.s0, z], [x, ROOF.s1, z], P));
    }
  }
  out.push(L(courses.join(""), { tone: "faint" }));
  out.push(S(G.sphereOf([0, ROOF.s1 - 1, Z1 + ROOF.rise + 1.5], 2.6, P), { tone: "hi" }));
  // Gable face: a vent slot and the bird's doorway frame.
  out.push(L(poly([onFront(-DOOR.w / 2 - 2, DOOR.z - 2, 0.1), onFront(DOOR.w / 2 + 2, DOOR.z - 2, 0.1), onFront(DOOR.w / 2 + 2, DOOR.z + DOOR.h + 2, 0.1), onFront(-DOOR.w / 2 - 2, DOOR.z + DOOR.h + 2, 0.1)]), { tone: "lo" }));
  out.push(`<path class="iso-shade" data-shade="3" d="${poly([onFront(-DOOR.w / 2, DOOR.z, 0.15), onFront(DOOR.w / 2, DOOR.z, 0.15), onFront(DOOR.w / 2, DOOR.z + DOOR.h, 0.15), onFront(-DOOR.w / 2, DOOR.z + DOOR.h, 0.15)])}"/>`);
  return out.join("");
}

function dial() {
  const F = G.frameOf(DIAL, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const out = [S(G.disc(0, 1.2, DIAL_R + 1.6, F, P), { tone: "mid" }), S(G.disc(1.2, 2, DIAL_R, F, P), { tone: "hi", crease: "lo" })];
  out.push(L(G.circleOf(F, 2, DIAL_R - 2.2, P), { tone: "lo" }));
  out.push(L(G.spokesOf(F, 2, DIAL_R - 2.2, DIAL_R - 6, 12, P), { tone: "mid" }));
  out.push(D(G.dotsOf(F, 2, DIAL_R - 3.4, 60, P, { all: true }), { size: 0.3, tone: "lo" }));
  out.push(`<path data-part="hands" class="iso-line" data-tone="hi" data-free="end" style="stroke-width:1.4" d=""/>`);
  out.push(S(G.disc(2, 3, 1.6, F, P), { tone: "hi" }));
  return out.join("");
}

function chain(x, z0, z1) {
  const links = [];
  for (let z = z1; z > z0; z -= 2.2) links.push(k.iso([x, CHAIN_Y, z], P));
  return `<path class="iso-line" data-tone="lo" style="stroke-dasharray:1.1 1.1" d="M${k.iso([x, CHAIN_Y, z1], P).join(" ")}L${k.iso([x, CHAIN_Y, z0], P).join(" ")}"/>` + k.dotsSvg([k.iso([x, CHAIN_Y, z0], P)], { size: 0.4, tone: "lo" });
}

// A pine-cone weight hangs at z = top (built at 0, moved with translateAlong).
function weight(x) {
  const out = [];
  out.push(S(k.cylinder(x, CHAIN_Y, 1.4, -4, 4, P, 12), { tone: "mid" }));
  out.push(S(frustum(G.hullOf(k.circleRing(x, CHAIN_Y, 3, 24)), -9, G.hullOf(k.circleRing(x, CHAIN_Y, 5.6, 24)), -4, P), { tone: "mid" }));
  out.push(S(k.cylinder(x, CHAIN_Y, 5.6, -30, 21, P, 32), { tone: "mid", inner: L([-12, -16, -20, -24].map((z) => k.sideArc(x, CHAIN_Y, 5.6, z, P, 20)).join(""), { tone: "faint" }) }));
  out.push(L(k.knurl(x, CHAIN_Y, 5.6, -30, -9, 14, P), { tone: "faint" }));
  out.push(S(frustum(G.hullOf(k.circleRing(x, CHAIN_Y, 5.6, 24)), -30, G.hullOf(k.circleRing(x, CHAIN_Y, 1.2, 24)), -35, P), { tone: "mid" }));
  return out.join("");
}

function pendulum() {
  const F = G.frameOf(PIVOT, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const rod = S(G.prismOf(F, [[-0.7, 0], [0.7, 0], [0.7, -PEND], [-0.7, -PEND]], -0.4, 0.4, P), { tone: "hi", crease: "none" });
  const bob = S(G.disc(-0.8, 0.8, 10, G.frameOf(G.add3(PIVOT, [0, 0, -PEND]), [0, 1, 0], [1, 0, 0], [0, 0, 1]), P), { tone: "hi", lit: true });
  const leaf = L(G.spokesOf(G.frameOf(G.add3(PIVOT, [0, 0, -PEND]), [0, 1, 0], [1, 0, 0], [0, 0, 1]), 0.8, 2, 8, 6, P, { phase: Math.PI / 6 }), { tone: "lo" });
  return `<g data-part="pendulum">${rod}${bob}${leaf}</g>` + S(G.disc(-0.6, 1.4, 2.2, F, P), { tone: "mid" });
}

function bird() {
  const y = FRONT - 10;
  const zc = DOOR.z + DOOR.h / 2;
  const out = [S(k.slabOf({ x: -4, y, w: 8, d: 10, r: 3 }, zc - 4, 7, P, 4, 0.4), { tone: "hi", lit: true })];
  out.push(S(k.slabOf({ x: -3, y: y + 7, w: 6, d: 5, r: 2.5 }, zc + 1, 5, P, 4), { tone: "hi", lit: true }));
  out.push(S(frustum([[-1.2, y + 12], [1.2, y + 12], [1.2, y + 14.5], [-1.2, y + 14.5]], zc + 2.6, [[-0.3, y + 13.6], [0.3, y + 13.6], [0.3, y + 13.8], [-0.3, y + 13.8]], zc + 3.2, P), { tone: "mid" }));
  out.push(D([at([2.6, y + 10, zc + 4])], { size: 0.5, tone: "lo" }));
  return `<g data-part="bird">${out.join("")}</g>`;
}

const doorAt = (open) => {
  const a = open * 1.9, hx = -DOOR.w / 2, w = DOOR.w;
  const ex = hx + Math.cos(a) * w, ey = FRONT + 0.3 + Math.sin(a) * w;
  return poly([[hx, FRONT + 0.3, DOOR.z], [ex, ey, DOOR.z], [ex, ey, DOOR.z + DOOR.h], [hx, FRONT + 0.3, DOOR.z + DOOR.h]].map((p) => p));
};

const e = (v) => { const o = k.iso(PIVOT, P), m = k.iso(G.add3(PIVOT, v), P); return [m[0] - o[0], m[1] - o[1]]; };
const PLANE = { o: k.iso(PIVOT, P), e1: e([1, 0, 0]), e2: e([0, 0, 1]) };
const W_HOME = 104;

const body0 = [
  basePlate(PLATE, P),
  wall(),
  ...WEIGHTS.map((x) => `<g data-part="weight">${chain(x, -2, 0)}${weight(x)}</g>`),
  caseBody(),
  `<g data-part="chains"></g>`,
  pendulum(),
  dial(),
  bird(),
  `<path data-part="door" class="iso-top" d="${doorAt(0)}"/><path data-part="door-edge" class="iso-line" data-tone="mid" d="${doorAt(0)}"/>`,
];

const live = `
const P = ${JSON.stringify(P)};
const PL = ${JSON.stringify(PLANE)}, PERIOD = ${PERIOD}, AMP = ${AMP}, DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, FRONT = ${FRONT};
const DOOR = ${JSON.stringify(DOOR)}, WEIGHTS = ${JSON.stringify(WEIGHTS)}, CHAIN_Y = ${CHAIN_Y}, Z0 = ${Z0}, W_HOME = ${W_HOME};
const poly = (pts) => "M" + pts.map((p) => iso(p, P).join(" ")).join("L") + "Z";
const doorAt = ${doorAt.toString()};
const pend = svg.querySelector('[data-part="pendulum"]');
const hands = svg.querySelector('[data-part="hands"]');
const door = svg.querySelector('[data-part="door"]'), doorEdge = svg.querySelector('[data-part="door-edge"]');
const bird = svg.querySelector('[data-part="bird"]');
const weights = [...svg.querySelectorAll('[data-part="weight"]')];
const chains = svg.querySelector('[data-part="chains"]');
const [a, b] = PL.e1, [c, d] = PL.e2, det = a * d - b * c;
function matrixFor(deg) {
  const t = deg * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t);
  const m = [a * cs + c * sn, b * cs + d * sn, -a * sn + c * cs, -b * sn + d * cs];
  const inv = [d / det, -b / det, -c / det, a / det];
  const T = [m[0] * inv[0] + m[2] * inv[1], m[1] * inv[0] + m[3] * inv[1], m[0] * inv[2] + m[2] * inv[3], m[1] * inv[2] + m[3] * inv[3]];
  const [ox, oy] = PL.o;
  return "matrix(" + [T[0], T[1], T[2], T[3], ox - T[0] * ox - T[2] * oy, oy - T[1] * ox - T[3] * oy].map((v) => v.toFixed(4)).join(" ") + ")";
}
const handPts = (frac, len) => { const ang = frac * Math.PI * 2; return [DIAL[0] + Math.sin(ang) * len, FRONT + 2.4, DIAL[2] + Math.cos(ang) * len]; };
const centre = [DIAL[0], FRONT + 2.4, DIAL[2]];
let minutes = 2 * 60 + 52, phase = 0, cuckoo = null, drop = [0, 0], touring = !still.matches, idle = 0, rate = 10;
function tick(dt) {
  if (!touring) { idle += dt; if (idle > 6) { touring = !still.matches; rate = 10; } }
  if (!still.matches) phase += dt * Math.PI * 2 / PERIOD;
  pend.setAttribute("transform", matrixFor(still.matches ? 0 : AMP * Math.sin(phase)));
  if (!cuckoo) {
    const before = minutes;
    minutes += dt * rate;
    drop[0] += dt * rate * 0.018;
    if (Math.floor(before / 60) !== Math.floor(minutes / 60)) { minutes = Math.floor(minutes / 60) * 60; cuckoo = { count: ((minutes / 60 - 1) % 12) + 1, t: 0 }; }
  } else {
    cuckoo.t += dt;
    if (cuckoo.t > 1.0 + cuckoo.count * 0.8 + 0.8) cuckoo = null;
  }
  const h = (minutes / 60) % 12, m = minutes % 60;
  hands.setAttribute("d", segment(centre, handPts(h / 12, DIAL_R * 0.5), P) + segment(centre, handPts(m / 60, DIAL_R * 0.82), P));
  let open = 0, out = 0, calls = 0;
  if (cuckoo) {
    const t = cuckoo.t, n = cuckoo.count, end = 0.6 + n * 0.8;
    open = clamp(t / 0.4, 0, 1) * (1 - clamp((t - end - 0.2) / 0.4, 0, 1));
    const inCall = t > 0.5 && t < end + 0.2 ? ((t - 0.5) % 0.8) / 0.8 : 1;
    out = t > 0.5 && t < end + 0.2 ? Math.sin(Math.PI * Math.min(1, inCall * 1.6)) : 0;
    calls = clamp(Math.floor((t - 0.5) / 0.8) + 1, 0, n);
    drop[1] = Math.min(60, drop[1] + dt * 0.9);
  }
  door.setAttribute("d", doorAt(open)); doorEdge.setAttribute("d", doorAt(open));
  bird.setAttribute("transform", translateAlong(P, [0, out * 10 * open, 0]));
  bird.style.opacity = open > 0.05 ? 1 : 0;
  drop = drop.map((v) => (v > 60 ? 0 : v));
  let links = "";
  WEIGHTS.forEach((x, i) => {
    const z = W_HOME - drop[i];
    weights[i].setAttribute("transform", translateAlong(P, [0, 0, z]));
    const top = iso([x, CHAIN_Y, Z0 - 4], P), low = iso([x, CHAIN_Y, z], P);
    const pull = iso([x + 5, CHAIN_Y, Z0 - 4], P), ring = iso([x + 5, CHAIN_Y, W_HOME - 40 + drop[i]], P);
    links += "M" + top.join(" ") + "L" + low.join(" ") + "M" + pull.join(" ") + "L" + ring.join(" ");
  });
  chains.innerHTML = '<path class="iso-line" data-tone="lo" style="stroke-dasharray:1.1 1.1" d="' + links + '"/>' + WEIGHTS.map((x, i) => lineSvg(ring(x + 5, CHAIN_Y, 2, W_HOME - 42 + drop[i], P, 16), { tone: "mid" })).join("");
  const clock = (Math.floor(h) || 12) + ":" + String(Math.floor(m)).padStart(2, "0");
  say(cuckoo ? clock + " · cuckoo " + Math.max(1, calls) + " of " + cuckoo.count : clock + " · pendulum " + PERIOD.toFixed(2) + " s");
}
stage.addEventListener("click", () => { if (cuckoo) return; touring = false; idle = 0; minutes = Math.ceil((minutes + 0.01) / 60) * 60 - 0.2; rate = 10; });
stage.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); touring = false; idle = 0; minutes += 5; } });
loop(tick);
`;

writePage(HERE, "cuckoo-clock", {
  width: WIDTH,
  height: HEIGHT,
  label: "A Black Forest cuckoo clock hung on a wall board. A 248 mm pendulum swings once a second below the case; two pine-cone weights on chains drive it, the left one running the hands and the right one the cuckoo. On the hour the door under the gable opens and the bird calls once per hour.",
  body: body0,
  fig: "Fig 3",
  title: "Cuckoo clock",
  hint: "Click to skip to the hour",
  readout: "2:52 · pendulum 1.00 s",
  keys: [
    { mark: "lit", label: "Pendulum bob and the bird" },
    { mark: "raised", label: "Pine-cone weights: one for time, one for the call" },
  ],
  caption: "Two falling weights power everything. The left drives the hands through an escapement that the 1.00 s pendulum lets go one tooth per swing; the right is only released on the hour, which is why it drops in steps. Pull the chain ring to wind. Time runs ten minutes a second.",
  aria: "Cuckoo clock: click to jump to the next hour, right arrow adds five minutes",
  live,
});
