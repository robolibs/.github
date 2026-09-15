// Every page of the site, and what is on it.
//
// One file so the shape of the whole thing is readable at once. `at` is where a page is written,
// `nav` is what the sidebar calls it, and `body` is everything under the lede.

import { graphSvg, LAYERS, DEPS } from "./graph.mjs";

export const SECTIONS = [
  { key: "home", name: "overview", home: "index.html" },
  { key: "crates", name: "the eighteen", home: "crates/index.html" },
  { key: "arch", name: "architecture", home: "architecture/index.html" },
  { key: "guide", name: "guides", home: "guides/install.html" },
];

// name -> one-line description, from each crate's own Cargo.toml (or its README, where the
// manifest carries none).
export const CRATES = {
  agentio: "Agent IO interface and agent composition on top of peerbus",
  authbox: "Pure Rust PKI and DID toolkit",
  concord: "Coordinate transformation library for robotics",
  datapod: "Robotics data types and POD-oriented containers",
  gearbox: "USD simulator and Bevy renderer for ground robots and farm implements",
  graphix: "Graph library combining vertex graphs and factor graphs",
  keylock: "Pure Rust cryptographic keylock primitives",
  machbus: "ISO 11783 (ISOBUS) + J1939 + NMEA2000 networking stack",
  maptrax: "Agricultural field planning library",
  ondrive: "Motion-control / path-tracking library for mobile robots",
  peerbus: "Typed zero-copy messaging: shared memory and QUIC, one API",
  rastera: "GeoTIFF and raster library",
  stateup: "Behavior trees and hierarchical state machines",
  syncbot: "Multi-robot navigation, claims, and scheduling",
  tagdata: "Embedded, single-file, memory-mapped key/value database",
  vectory: "GeoJSON vector library for robotics",
  wirebit: "Simulated hardware comms — serial, CAN, ethernet — over shared memory",
  zoneout: "Hierarchical agricultural zone / workspace library",
};

const repo = (name) => `https://github.com/robolibs/${name}`;

/** A table from rows of [left, right]. */
const table = (head, rows) => `      <div class="tw"><table>
        <thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
${rows.map((r) => `          <tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n")}
        </tbody>
      </table></div>`;

export const PAGES = [];

// ------------------------------------------------------------------------------- overview ----
PAGES.push({
  at: "index.html",
  section: "home",
  nav: "overview",
  title: "Eighteen crates, one convention",
  blurb:
    "robolibs is a set of independently-versioned Rust robotics crates — each its own repository, " +
    "each usable alone, wired together here as git submodules for the ones building on each other.",
  body: `
      <div class="cards">
        <div class="card">
          <h4>own repo, own version</h4>
          <p>Every crate is published from its own GitHub repository, tagged and versioned on its
          own schedule. Nothing here is a Cargo workspace member of anything else.</p>
        </div>
        <div class="card">
          <h4>submodules, not a monorepo</h4>
          <p>This root pins each crate to a commit via <code>.gitmodules</code> — a known-good
          combination, not a shared build. Clone a crate by itself and it still builds.</p>
        </div>
        <div class="card">
          <h4>a real dependency graph</h4>
          <p>Some crates build on others — <a href="architecture/index.html">datapod</a> underpins
          most of them, <a href="crates/index.html#syncbot">syncbot</a> sits on top of seven. See
          <a href="architecture/index.html">the map</a>.</p>
        </div>
      </div>

      <h2 id="start">Start here</h2>
${table(["", ""], [
  ['<a href="crates/index.html">the eighteen</a>', "what each crate does, one line each"],
  ['<a href="architecture/index.html">the map</a>', "who depends on whom, laid out foundation-first"],
  ['<a href="guides/install.html">install</a>', "clone the whole set, or one crate on its own"],
])}

      <h2 id="rules">What holds it together</h2>
      <ul class="plain">
        <li><b>No crate reaches into another's internals.</b> A dependency here is an ordinary
        Cargo dependency on a tagged release, the same as any crates.io dependency would be — the
        only difference is where it's hosted.</li>
        <li><b>Foundation crates stay foundation crates.</b> <code>datapod</code>,
        <code>keylock</code>, <code>stateup</code>, <code>tagdata</code> and <code>wirebit</code>
        depend on nothing else here — see the bottom of <a href="architecture/index.html">the
        map</a>. Everything else is built in terms of them.</li>
        <li><b>One build convention, not one build.</b> Every crate uses the same
        <code>.env.lua</code> / <code>.make.lua</code> shape (<a href="guides/install.html">install
        guide</a>), so moving between crates costs nothing to relearn — but each still builds and
        tests on its own.</li>
      </ul>`,
});

// -------------------------------------------------------------------------------- crates -----
{
  const rows = Object.keys(CRATES)
    .sort()
    .map((name) => {
      const deps = DEPS[name] ?? [];
      const on = deps.length
        ? deps.map((d) => `<a href="index.html#${d}">${d}</a>`).join(", ")
        : `<span class="dim">— foundation</span>`;
      return [
        `<b id="${name}"><a href="${repo(name)}">${name}</a></b>`,
        CRATES[name],
        `<span class="wrap-ok">${on}</span>`,
      ];
    });

  PAGES.push({
    at: "crates/index.html",
    section: "crates",
    nav: "the eighteen",
    title: "The eighteen",
    blurb: "What each crate does, and what it builds on. Foundation crates depend on nothing here.",
    body: table(["crate", "what it does", "builds on"], rows),
  });
}

// --------------------------------------------------------------------------- architecture ----
{
  const layerRows = [...LAYERS.entries()]
    .sort(([a], [b]) => a - b)
    .map(([n, names]) => [
      n === 0 ? "foundation" : `layer ${n}`,
      names.map((name) => `<a href="../crates/index.html#${name}">${name}</a>`).join(", "),
    ]);

  PAGES.push({
    at: "architecture/index.html",
    section: "arch",
    nav: "the map",
    title: "The map",
    blurb:
      "Every arrow below is an ordinary Cargo dependency, read straight out of each crate's own " +
      "Cargo.toml — foundation crates on the left, everything built on them running right.",
    body: `
      <div class="plate">
        <header><b>dependency graph</b><span>foundation left, dependents right</span></header>
        <div class="body">${graphSvg()}</div>
      </div>

      <h2 id="layers">By layer</h2>
      <p>A crate's layer is one more than the deepest layer it depends on. Layer 0 depends on
      nothing else in robolibs.</p>
${table(["layer", "crates"], layerRows)}

      <h2 id="reading">Reading it</h2>
      <ul class="plain">
        <li><b>datapod</b> is the one nearly everything shares — POD types and containers that
        cross process and language boundaries the same way everywhere.</li>
        <li><b>keylock</b>, <b>stateup</b>, <b>tagdata</b> and <b>wirebit</b> are the other
        foundation crates: each solves one problem (crypto primitives, state machines, an embedded
        KV store, simulated hardware comms) with nothing here underneath it.</li>
        <li><b>syncbot</b> sits at the top, seven crates deep — multi-robot scheduling is where
        navigation, messaging, identity and geometry actually meet.</li>
      </ul>`,
  });
}

// -------------------------------------------------------------------------------- guides -----
PAGES.push({
  at: "guides/install.html",
  section: "guide",
  nav: "install",
  title: "Install",
  blurb: "Clone the whole set as submodules, or take one crate on its own — both are first-class.",
  body: `
      <h2 id="one">One crate</h2>
      <p>Every crate is a normal Cargo dependency on a tagged release:</p>
      <pre><code>[dependencies]
datapod = { git = "https://github.com/robolibs/datapod.git", tag = "0.4.1" }</code></pre>
      <p>Or clone it directly — it builds standalone, with no sibling checkouts required.</p>

      <h2 id="all">The whole set</h2>
      <pre><code>git clone --recursive https://github.com/robolibs/.github.git robolibs
cd robolibs</code></pre>
      <p>Cloned without <code>--recursive</code>? Fill the submodules in after the fact:</p>
      <pre><code>git submodule update --init</code></pre>

      <h2 id="build">Building</h2>
      <p>Every crate — root included — uses the same two files instead of
      <code>.envrc</code>/<code>Makefile</code>: <code>.env.lua</code> loads the dev shell and
      <code>.make.lua</code> holds the recipes, both read by
      <a href="https://github.com/robolibs">oslo</a>.</p>
${table(["", ""], [
  ["<code>oslo make</code>", "list this crate's recipes, with what each one does"],
  ["<code>oslo make build</code>", "the library"],
  ["<code>oslo make test</code>", "the suite"],
])}
      <p>From the root, the same recipes fan out to every submodule in turn:
      <code>oslo make status</code> shows where each checkout stands — its branch, what's ahead,
      what's uncommitted.</p>`,
});
