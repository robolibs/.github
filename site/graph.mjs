// The dependency graph among the eighteen crates, and how to lay it out and draw it.
//
// Nodes and edges come straight from what's declared in each crate's own Cargo.toml — this file
// doesn't invent a shape, it draws the one that's already there. Re-run `node site/graph.mjs` by
// hand after `grep` if a crate's dependencies change; nothing here reads Cargo.toml itself, so a
// drift between this list and the real manifests is possible and worth checking occasionally.

// name -> the sibling crates it depends on (from crates.io-style git deps in Cargo.toml)
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

/** Layer 0 = depends on nothing here; layer N = one more than the deepest dependency. */
function layers() {
  const layer = {};
  const at = (name, trail = []) => {
    if (name in layer) return layer[name];
    if (trail.includes(name)) throw new Error(`cycle: ${trail.join(" -> ")} -> ${name}`);
    const deps = DEPS[name] ?? [];
    layer[name] = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => at(d, [...trail, name])));
    return layer[name];
  };
  for (const name of Object.keys(DEPS)) at(name);
  return layer;
}

/**
 * Lay the graph out left to right, foundation crates on the left, and draw it as an inline SVG.
 *
 * Rows within a layer are ordered alphabetically -- there's no meaning in row order beyond that,
 * so alphabetical is the one order a reader doesn't have to learn.
 */
export function graphSvg() {
  const layer = layers();
  const byLayer = new Map();
  for (const [name, l] of Object.entries(layer)) {
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l).push(name);
  }
  for (const names of byLayer.values()) names.sort();

  const COLW = 168;
  const ROWH = 52;
  const BOXW = 132;
  const BOXH = 34;
  const PAD = 24;
  const maxLayer = Math.max(...byLayer.keys());
  const maxRows = Math.max(...[...byLayer.values()].map((v) => v.length));
  const width = PAD * 2 + (maxLayer + 1) * COLW - (COLW - BOXW);
  const height = PAD * 2 + maxRows * ROWH - (ROWH - BOXH);

  const pos = {};
  for (const [l, names] of byLayer) {
    names.forEach((name, i) => {
      const rows = names.length;
      const yOffset = (maxRows - rows) * ROWH / 2;
      pos[name] = {
        x: PAD + l * COLW,
        y: PAD + yOffset + i * ROWH,
      };
    });
  }

  const edges = [];
  for (const [name, deps] of Object.entries(DEPS)) {
    for (const dep of deps) edges.push([name, dep]);
  }

  const edgeLines = edges
    .map(([from, to]) => {
      const a = pos[from];
      const b = pos[to];
      const x1 = a.x, y1 = a.y + BOXH / 2;
      const x2 = b.x + BOXW, y2 = b.y + BOXH / 2;
      const midx = (x1 + x2) / 2;
      return `<path class="edge" d="M${x1} ${y1} C ${midx} ${y1}, ${midx} ${y2}, ${x2} ${y2}" />`;
    })
    .join("\n    ");

  const nodeBoxes = Object.entries(pos)
    .map(([name, p]) => {
      const l = layer[name];
      return `<a class="node" href="../crates/index.html#${name}" transform="translate(${p.x},${p.y})" data-layer="${l}">
      <rect width="${BOXW}" height="${BOXH}" rx="4" />
      <text x="${BOXW / 2}" y="${BOXH / 2 + 5}">${name}</text>
    </a>`;
    })
    .join("\n    ");

  return `<svg class="graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="dependency graph, foundation crates on the left">
    ${edgeLines}
    ${nodeBoxes}
  </svg>`;
}

export const LAYERS = (() => {
  const l = layers();
  const out = new Map();
  for (const [name, n] of Object.entries(l)) {
    if (!out.has(n)) out.set(n, []);
    out.get(n).push(name);
  }
  for (const names of out.values()) names.sort();
  return out;
})();
