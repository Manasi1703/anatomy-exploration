import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";

export { k, G };
export const theme = process.argv.includes("--light") ? "light" : "dark";

export function tools(P) {
  const at = (point) => k.iso(point, P);
  return {
    at,
    S: (paths, style) => k.solidSvg(paths, style),
    L: (d, style) => k.lineSvg(d, style),
    D: (points, style) => k.dotsSvg(points, style),
    byDepth: (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], a[2] ?? 0], P) - k.depthOf([b[0], b[1], b[2] ?? 0], P)),
  };
}

// Base plate on four feet, a groove, corner screws and a ruler strip along the near edge.
export function basePlate(plan, P, { plateH = 10, footH = 4, ruler = true } = {}) {
  const { S, L, D, at, byDepth } = tools(P);
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, -plateH - footH, plateH, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(plan, 16))) {
    out.push(S(k.cylinder(x, y, 6, -plateH - footH, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, -plateH - footH + 1.4, footH - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(plan, -plateH, plateH, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 4.5), 0, P), { tone: "lo" }));
  const screws = k.corners(plan, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (ruler) {
    const strip = { x: plan.x + 18, y: plan.y + plan.d - 13, w: plan.w - 36, d: 6, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
    out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  }
  return out.join("");
}

// A tapered prism (pyramid frustum): bottom and top floor rings of equal length, shaded like extrude.
export function frustum(bottom, z0, top, z1, P) {
  const V = G.viewOf(P);
  const n = bottom.length;
  const mid = [bottom.reduce((s, p) => s + p[0], 0) / n, bottom.reduce((s, p) => s + p[1], 0) / n];
  const shades = ["", "", "", ""];
  let crease = "";
  const d = (pts) => "M" + pts.map((p) => k.iso(p, P).join(" ")).join("L") + "Z";
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = [...bottom[i], z0], b = [...bottom[j], z0], c = [...top[j], z1], e = [...top[i], z1];
    let normal = G.cross3(G.sub3(b, a), G.sub3(e, a));
    const out = [(a[0] + b[0]) / 2 - mid[0], (a[1] + b[1]) / 2 - mid[1], 0];
    if (G.dot3(normal, out) < 0) normal = G.mul3(normal, -1);
    if (G.dot3(normal, V) <= 0) continue;
    shades[G.toneOf(normal, P)] += d([a, b, c, e]);
    crease += k.segment(e, c, P);
  }
  const hull = G.hullOf([...bottom.map((p) => k.iso([...p, z0], P)), ...top.map((p) => k.iso([...p, z1], P))]);
  const outline = "M" + hull.map((p) => p.join(" ")).join("L") + "Z";
  return { fill: outline, outline, crease, top: d(top.map((p) => [...p, z1])), shades };
}

// A label plate with three rule lines that stand for engraved text.
export function labelPlate(plan, z, P) {
  const { S, L, D, at } = tools(P);
  const y0 = plan.y + plan.d * 0.3;
  const rules = [0, 1, 2].map((i) => {
    const y = y0 + i * (plan.d * 0.2);
    return L(k.lineOnTop([plan.x + 3, y], [plan.x + 3 + (plan.w - 10) * [1, 0.7, 0.45][i], y], z + 0.8, P), { tone: "lo", free: true });
  });
  return [S(k.slabOf(plan, z, 0.8, P, 4), { tone: "lo", crease: "none" }), L(k.planOutline(k.insetPlan(plan, 1.4), z + 0.8, P, 4), { tone: "faint" }), ...rules, D([at([plan.x + plan.w - 2.5, plan.y + plan.d / 2, z + 0.8])], { size: 0.4 })].join("");
}

// Shared live helpers inlined into every page: visibility, reduced motion, a frame loop.
export const liveBase = (name) => `
const stage = document.querySelector("#${name} .iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("#${name} [data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const say = (text) => { if (readout.textContent !== text) readout.textContent = text; stage.setAttribute("aria-valuetext", text); };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const follow = (cur, to, dt, s) => still.matches ? to : cur + (to - cur) * (1 - Math.exp(-dt / s));
let visible = false, frame = 0, last = 0;
function loop(tick) {
  const step = (now) => { const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now; tick(dt); frame = visible ? requestAnimationFrame(step) : 0; };
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible && !frame) { last = 0; frame = requestAnimationFrame(step); } }, { rootMargin: "120px 0px" }).observe(stage);
}
`;

export function writePage(dir, name, { width, height, label, body, fig, title, hint, readout, keys, caption, aria, live }) {
  const svg = k.figureSvg({ width, height, label, body });
  const plate = k.plateHtml({ fig, title, hint, readout, keys, caption, body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="${aria}">${svg}</div>` });
  const section = `<section id="${name}">${plate}</section>`;
  const script = kitScript() + liveBase(name) + live;
  const file = `${name}${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(dir, file), k.pageHtml({ title, theme, body: section, script }));
  writeFileSync(join(dir, `${name}${theme === "light" ? "-light" : ""}.part.json`), JSON.stringify({ section, script }));
  process.stdout.write(`wrote ${file}\n`);
}
