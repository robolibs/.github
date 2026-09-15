// The dependency graph among the eighteen crates, laid out by force rather than by hand.
//
// Nodes and edges come straight from what's declared in each crate's own Cargo.toml — copied by
// hand below, so a crate that gains or drops a sibling dependency needs this file updated
// separately. Re-run the grep in the repo root if that's ever in doubt:
//
//   for d in */; do grep -E '^[a-z-]+ = \{.*(git|path)' "$d/Cargo.toml"; done
//
// The layout is a plain force-directed simulation (repulsion between every pair, attraction along
// edges, cooled down over a fixed number of steps) rather than a hand-picked hierarchy — nothing
// here decides which crate is "more foundational" or asserts a layer number. The graph places
// itself; the arrows say which way a dependency points.

export const DEPS = {
  agentio: ["authbox", "datapod", "peerbus"],
  authbox: ["keylock"],
  concord: ["datapod", "graphix"],
  datapod: [],
  gearbox: ["agentio", "datapod", "peerbus"],
  graphix: ["datapod"],
  keylock: [],
  machbus: ["concord", "wirebit"],
  maptrax: ["concord", "datapod", "graphix", "vectory"],
  ondrive: ["datapod", "stateup"],
  peerbus: ["authbox", "datapod", "wirebit"],
  rastera: ["concord", "datapod"],
  stateup: [],
  syncbot: ["authbox", "concord", "datapod", "graphix", "keylock", "peerbus", "zoneout"],
  tagdata: [],
  vectory: ["concord", "datapod", "graphix"],
  wirebit: [],
  zoneout: ["concord", "datapod", "graphix", "rastera", "vectory"],
};

const NAMES = Object.keys(DEPS).sort();
const EDGES = NAMES.flatMap((n) => DEPS[n].map((d) => [n, d]));

/** A small, seeded PRNG so the layout is the same on every build. */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Fruchterman-Reingold: every node repels every other node, an edge pulls its two ends together,
 * and the whole thing cools down over a fixed number of steps until it stops moving much.
 */
function layout(width, height) {
  const rand = rng(7);
  const pos = {};
  for (const n of NAMES) {
    pos[n] = { x: width / 2 + (rand() - 0.5) * width * 0.6, y: height / 2 + (rand() - 0.5) * height * 0.6 };
  }

  const area = width * height;
  const k = Math.sqrt(area / NAMES.length);
  const iterations = 400;
  let temp = width / 8;

  for (let it = 0; it < iterations; it++) {
    const disp = {};
    for (const n of NAMES) disp[n] = { x: 0, y: 0 };

    // Repulsion, every pair.
    for (let i = 0; i < NAMES.length; i++) {
      for (let j = i + 1; j < NAMES.length; j++) {
        const a = NAMES[i], b = NAMES[j];
        let dx = pos[a].x - pos[b].x;
        let dy = pos[a].y - pos[b].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (k * k) / dist;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        disp[a].x += dx; disp[a].y += dy;
        disp[b].x -= dx; disp[b].y -= dy;
      }
    }

    // Attraction, along each edge.
    for (const [a, b] of EDGES) {
      let dx = pos[a].x - pos[b].x;
      let dy = pos[a].y - pos[b].y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist * dist) / k;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      disp[a].x -= dx; disp[a].y -= dy;
      disp[b].x += dx; disp[b].y += dy;
    }

    // Apply, capped by the cooling temperature, and keep everything on the canvas.
    for (const n of NAMES) {
      const d = disp[n];
      const len = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01;
      pos[n].x += (d.x / len) * Math.min(len, temp);
      pos[n].y += (d.y / len) * Math.min(len, temp);
      pos[n].x = Math.min(width - 40, Math.max(40, pos[n].x));
      pos[n].y = Math.min(height - 40, Math.max(40, pos[n].y));
    }
    temp *= 0.99;
  }

  return pos;
}

export function graphSvg() {
  const width = 760;
  const height = 560;
  const pos = layout(width, height);
  const R = 30;

  const edgeLines = EDGES.map(([a, b]) => {
    const p1 = pos[a], p2 = pos[b];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Stop short of the target node's circle so the arrowhead sits on its edge, not its center.
    const x2 = p2.x - (dx / len) * (R + 8);
    const y2 = p2.y - (dy / len) * (R + 8);
    return `<line class="edge" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" marker-end="url(#arrow)" />`;
  }).join("\n    ");

  const nodes = NAMES.map((name) => {
    const p = pos[name];
    const foundation = DEPS[name].length === 0;
    return `<a class="node" href="${name}.html" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">
      <circle r="${R}" class="${foundation ? "foundation" : ""}" />
      <text>${name}</text>
    </a>`;
  }).join("\n    ");

  return `<svg class="graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="dependency graph among the eighteen crates">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" />
      </marker>
    </defs>
    ${edgeLines}
    ${nodes}
  </svg>`;
}
