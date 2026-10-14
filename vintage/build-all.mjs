// Builds every figure, then stacks all five on one scrolling page: index.html (dark) and index-light.html.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./common.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NAMES = ["cash-register", "rotary-dial", "cuckoo-clock", "gramophone", "metronome"];
const TITLES = ["Cash register", "Rotary dial", "Cuckoo clock", "Gramophone", "Metronome"];

// Pills fixed on the left: plain anchor links, the active one follows the scroll.
const NAV = `<style>
html{scroll-behavior:smooth}
.vm-nav{position:fixed;left:24px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:8px;z-index:10}
.vm-nav a{font:12px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:inherit;text-decoration:none;padding:8px 14px;border:1px solid currentColor;border-radius:999px;opacity:.4;transition:opacity .2s}
.vm-nav a:hover,.vm-nav a[aria-current="true"]{opacity:1}
@media (max-width:1000px){.vm-nav{display:none}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style><nav class="vm-nav" aria-label="Machines">${NAMES.map((name, i) => `<a href="#${name}">${TITLES[i]}</a>`).join("")}</nav>
<script>
const links = [...document.querySelectorAll(".vm-nav a")];
const spy = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", String(a.hash === "#" + e.target.id))); }), { rootMargin: "-45% 0px -45% 0px" });
document.querySelectorAll("section[id]").forEach((section) => spy.observe(section));
</script>`;

for (const theme of ["dark", "light"]) {
  const suffix = theme === "light" ? "-light" : "";
  const parts = NAMES.map((name) => {
    execFileSync(process.execPath, [join(HERE, name, "build.mjs"), ...(suffix ? ["--light"] : [])], { cwd: join(HERE, name) });
    return JSON.parse(readFileSync(join(HERE, name, `${name}${suffix}.part.json`), "utf8"));
  });
  // Each figure keeps its own module script, so the kit's top-level names never collide.
  const scripts = parts.map(({ script }) => `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>`).join("");
  const body = `<div style="display:grid;gap:96px;padding:64px 0">${parts.map(({ section }) => section).join("")}</div>`;
  const page = k.pageHtml({ title: "Vintage Machines", theme, body }).replace("</body>", `${NAV}${scripts}</body>`);
  writeFileSync(join(HERE, `index${suffix}.html`), page);
  process.stdout.write(`wrote index${suffix}.html\n`);
}
