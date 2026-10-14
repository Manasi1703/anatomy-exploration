# Vintage Machines

Five old machines drawn as working isometric figures. Each one moves the way the real thing does, and each number on screen comes from a small physical model.

| | Machine | What you see | Try it |
|---|---|---|---|
| Fig 1 | Cash register | Keys drop, numbered flags rise into the window, the bell shakes and the drawer slides out | Click to ring up a sale |
| Fig 2 | Rotary dial | The finger wheel turns to the stop and spins back at 10 pulses a second | Type a digit |
| Fig 3 | Cuckoo clock | A one-second pendulum, two falling weights, and the bird calling once per hour | Click to skip to the hour |
| Fig 4 | Gramophone | A 78 rpm record, with the tonearm moving along the groove | Hover left to right |
| Fig 5 | Metronome | A two-weight pendulum; slide the weight to set 40–208 beats a minute | Hover up or down |

## Open it

Open `vintage/index.html` (dark) or `vintage/index-light.html` (light) in a browser. No server and no install are needed.

All five machines sit on one scrolling page, with pills on the left to jump between them. Each machine runs on its own when it is on screen, and holds still if your system asks for reduced motion.

Each machine also has its own page: `vintage/<name>/<name>.html`.

## The physics behind them

- **Metronome.** A double-weighted pendulum: ω² = g(A − s)/(B + s²). A and B are solved so the weight 40 mm above the pivot gives 208 bpm and 100 mm gives 40 bpm. It ticks at both ends of each swing.
- **Cuckoo clock.** A 248 mm pendulum has a period of 1.00 s (T = 2π√(L/g)).
- **Gramophone.** A 10-inch 78: the grooves run from 117 mm in to 55 mm over about three minutes, at a constant pitch. On screen, time runs ten times fast.
- **Rotary dial.** The holes are 30° apart. The dial sends one pulse per 30° on the way back, so 1 sends one pulse and 0 sends ten.

## Build from source

The figures are made with the **[Anatomy](https://github.com/wheresryan22/anatomy)** skill by [@wheresryan22](https://github.com/wheresryan22). A copy of the skill is included in this repo at `.claude/skills/anatomy`, so you need only Node.js. To add the skill to another project, run `npx skills add wheresryan22/anatomy`.

Rebuild every figure and both combined pages:

```sh
node vintage/build-all.mjs
```

To rebuild one figure: `node vintage/<name>/build.mjs`, with `--light` for the light theme.

```
vintage/
  common.mjs        shared parts: base plate, label plate, pyramid frustum, page writer
  build-all.mjs     builds all five and writes index.html and index-light.html
  <name>/build.mjs  one figure: its geometry, its model and its live code
```

## Credits

Built with **[Anatomy](https://github.com/wheresryan22/anatomy)** by **[@wheresryan22](https://github.com/wheresryan22)**. Anatomy is a skill for AI coding agents that builds detailed, interactive isometric SVG figures; it is MIT licensed. The camera, solids, shading, card layout and line style all come from its kit; the machines and their models are this project's own.
