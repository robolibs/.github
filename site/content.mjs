// Every page of the site, and what is on it.
//
// One file so the shape of the whole thing is readable at once. `at` is where a page is written,
// `nav` is what the sidebar calls it, and `body` is everything under the lede.

export const SECTIONS = [
  { key: "home", name: "overview", home: "index.html" },
  { key: "crates", name: "crates", home: "crates/index.html" },
  { key: "guide", name: "install", home: "guides/install.html" },
];

// name -> { blurb, body, deps }. Blurb is the one-liner used on the index and as the page's
// lede; body is the fuller description, drawn from what each crate's own README already says.
// deps are the sibling crates it builds on — plain text, not a diagram, because a name someone
// can click is more useful here than a picture of the same information.
export const CRATES = {
  agentio: {
    blurb: "Composes authenticated peerbus endpoints by topic name.",
    body: `<p>One <code>Agent</code> owns one <code>peerbus::Node</code>, one Ed25519 identity, and
    a local directory of who's publishing what. Machines exchange signed directory records to find
    each other, so there's no central registry to keep alive or point at.</p>
    <p>Every hosted exchange carries its topic, its request and response type hashes, an owner
    signature, and a lease. Records get renewed on a schedule; dropping the handle sends a signed
    withdrawal. A stale record, an invalid signature, or a competing live owner all get rejected
    rather than merged.</p>`,
    deps: ["authbox", "datapod", "peerbus"],
  },
  authbox: {
    blurb: "X.509 certificates, CSRs, CRLs, and a DID resolver, in pure Rust.",
    body: `<p>Builds and verifies certificates and CSRs, and resolves five DID methods —
    <code>did:key</code>, <code>did:jwk</code>, <code>did:dns</code>, <code>did:peer</code>,
    <code>did:pkh</code>, <code>did:web</code>. Ported from a C++ library of the same name.</p>
    <p>The cryptography itself isn't here. Keygen, signing, hashing, all of it lives in keylock;
    authbox only handles the PKI and DID framing on top. It doesn't re-export keylock either —
    callers add it as their own dependency and import primitives directly.</p>`,
    deps: ["keylock"],
  },
  concord: {
    blurb: "Coordinate and frame transforms for robotics.",
    body: `<p>WGS84, ECF, and UTM conversions; ENU and NED local tangent frames; a runtime
    <code>TransformTree</code> for looking up how one frame relates to another. A timed variant
    interpolates across a robot's motion history instead of just returning the latest value.</p>`,
    deps: ["datapod", "graphix"],
  },
  datapod: {
    blurb: "The wire-contract crate — the data types everything else here shares.",
    body: `<p>Geometry, motion, raster, and identifier types with a byte layout stable enough to
    cross a language boundary: the same bytes read back correctly from Rust, from C, and from
    Python. It isn't a transport — shared memory or a network socket carries the bytes; datapod is
    the schema and the validation underneath whatever does the carrying.</p>
    <p>Archive, View, and Owned APIs separate the zero-copy fast path from the version that
    copies, and a canonical-name registry gives every type a stable hash so a receiver can tell
    what it's holding without a shared header file.</p>`,
    deps: [],
  },
  gearbox: {
    blurb: "A USD robot simulator with a Bevy renderer.",
    body: `<p>Load a USD scene, click to select something, watch it move. Tractors, harvesters, and
    a handful of other machines run in it today, driven by a <code>gearbox</code> CLI that can
    launch, list, and inspect running instances.</p>
    <p>Python scripts drive the simulator over the network rather than through Rust — spawn a
    machine, claim it, send it a velocity command, watch it go. The same control path works
    whether there's a GPU in the room or not: without one, the scripts talk to a fake host that
    reports poses and harvest events without rendering anything.</p>`,
    deps: ["agentio", "datapod", "peerbus"],
  },
  graphix: {
    blurb: "Vertex graphs and factor graphs, built for spatial work.",
    body: `<p>Shortest paths, spanning trees, and centrality sit next to SE2 pose-graph
    optimization with robust loss functions and a choice of Gauss-Newton, Levenberg-Marquardt, or
    gradient descent. Nearest-neighbor queries and k-NN graph construction are built in rather than
    left to a separate crate, because most of what calls into graphix needs both a graph and a
    spatial index at once.</p>`,
    deps: ["datapod"],
  },
  keylock: {
    blurb: "One crypto surface for everything else here.",
    body: `<p>AEADs, signatures, hashes, KDFs, and the secp256k1 helpers an Ethereum-style system
    needs. Every primitive is delegated to an existing, reviewed Rust crate — RustCrypto,
    dalek-cryptography — so keylock itself is a thin shell holding the API stable while whatever's
    underneath can be swapped.</p>
    <p>It's a port of a C++ library, and mirrors that library's module layout, enum names, and
    error shapes on purpose: the same call produces the same bytes in both.</p>`,
    deps: [],
  },
  machbus: {
    blurb: "ISO 11783 (ISOBUS), J1939, and NMEA 2000 over CAN.",
    body: `<p>The wire formats tractors, implements, virtual terminals, and task controllers speak
    to each other: single-frame and multi-frame transport, address claim with NAME arbitration,
    NMEA 2000 fast-packet. A <code>Stack</code> facade hides PGN routing and event fan-out behind
    one handle, with typed builders for the common ECU roles — tractor, implement, virtual
    terminal, file server, task controller server.</p>
    <p>A virtual-bus simulator ships with it, so the software side can be built and tested without
    a CAN transceiver on the desk.</p>`,
    deps: ["concord", "wirebit"],
  },
  maptrax: {
    blurb: "Plans agricultural fields — headlands, swaths, and turns.",
    body: `<p>Generates headlands and swaths for a field, decides how to split the work between
    machines, routes around obstacles, and plans the turns at the row ends with Dubins or
    Reeds-Shepp curves. The planner runs in stages — generate, decompose, avoid, route, tour — and
    each stage works on its own, not only as part of the whole pipeline.</p>`,
    deps: ["concord", "datapod", "graphix", "vectory"],
  },
  ondrive: {
    blurb: "Twenty motion controllers behind one interface.",
    body: `<p>PID, pure pursuit, and Stanley for the straightforward cases; LQR, MPC, iLQR, and
    MPPI for the ones that need to look ahead. All twenty take the same pose and velocity types and
    emit the same body-frame twist, so swapping a controller for another one doesn't touch whatever
    code is calling it.</p>`,
    deps: ["datapod", "stateup"],
  },
  peerbus: {
    blurb: "One messaging API, two transports.",
    body: `<p>Shared memory when both ends are on the same host, no copy and no serialization.
    iroh's QUIC when they're not, with NAT traversal and TLS 1.3. The choice is made once, at
    subscribe time, and is invisible after that.</p>
    <p>Five modes cover request/response, a query that can draw many answers, many puts
    acknowledged once, a fully bidirectional pipe, and plain pub/sub fan-out — one <code>Node</code>
    API for all five.</p>`,
    deps: ["authbox", "datapod", "wirebit"],
  },
  rastera: {
    blurb: "Reads and writes GeoTIFF, including BigTIFF and multi-layer rasters.",
    body: `<p>Classic TIFF and BigTIFF, single- and multi-strip layouts, palette and RGBA images,
    and the GeoTIFF georeferencing tags that make a raster line up with a real coordinate system —
    pixel scale, tie points, the full geo-key directory. Built to read elevation and imagery data
    back accurately, not just to render a preview.</p>`,
    deps: ["concord", "datapod"],
  },
  stateup: {
    blurb: "Behavior trees and hierarchical state machines, sharing one blackboard.",
    body: `<p>Composite, decorator, and leaf nodes for tick-driven behavior trees; guarded, timed,
    and probabilistic transitions for state machines with nested regions and history. Both read and
    write the same typed blackboard, so a tree and a state machine in the same system can watch the
    same data without a translation layer between them.</p>
    <p>All of it runs from Rust, from C through a callback-based ABI, and from Python — the same
    tree behaves the same way regardless of which side is driving it.</p>`,
    deps: [],
  },
  syncbot: {
    blurb: "Routing, claims, and scheduling for a fleet sharing one workspace.",
    body: `<p>Answers four questions robots ask when they're not alone in a space: where can I go
    (policy-aware Dijkstra over the workspace graph), can I claim it (exclusive or shared claims on
    zones and edges, with capacity limits), when can I go (time-windowed reservations, with
    proceed/queue/replan as the answer), and who goes first (right-of-way arbitration when two
    robots want the same spot at once).</p>`,
    deps: ["authbox", "concord", "datapod", "graphix", "keylock", "peerbus", "zoneout"],
  },
  tagdata: {
    blurb: "An embedded key-value database in one memory-mapped file.",
    body: `<p>No server, no separate process — just a file, opened and mapped into memory. ACID
    transactions with automatic rollback on drop, concurrent readers across threads and processes,
    B+ tree storage, nested buckets, and a checksummed format that can be verified offline.</p>
    <p>Space from deleted data is tracked and reused rather than left to grow the file forever, and
    a snapshot can be taken without stopping the writers that are still running.</p>`,
    deps: [],
  },
  vectory: {
    blurb: "Reads and writes GeoJSON, normalized into a local ENU frame.",
    body: `<p>Feature collections in, a typed <code>Vector</code> out — field boundaries and vector
    elements normalized against concord's coordinate transforms so they line up with everything
    else built on the same frame. Self-contained: it doesn't need a local checkout of anything else
    to build or run.</p>`,
    deps: ["concord", "datapod", "graphix"],
  },
  wirebit: {
    blurb: "Simulates serial, CAN, and ethernet links over shared memory.",
    body: `<p>Timed frames move over a shared-memory ring rather than real hardware, with optional
    bridges out to a real Linux interface — PTY/TTY, SocketCAN, TAP, TUN — when something on the
    other end needs to be real. A CAN bus hub sits in the middle with a choice of arbiter: FIFO,
    CAN priority, CSMA-CD, TDMA, or master-slave.</p>`,
    deps: [],
  },
  zoneout: {
    blurb: "Hierarchical zones and workspaces for agricultural robotics.",
    body: `<p>Nested plots a fleet can reason about — a field divided into zones, zones divided
    further, each one addressable on its own. Built on datapod for the geometry, concord for the
    coordinate transforms, and graphix for the graph connecting zones to their neighbors.</p>`,
    deps: ["concord", "datapod", "graphix", "rastera", "vectory"],
  },
};

const repo = (name) => `https://github.com/robolibs/${name}`;

export const PAGES = [];

// ------------------------------------------------------------------------------- overview ----
PAGES.push({
  at: "index.html",
  section: "home",
  nav: "overview",
  title: "Eighteen Rust crates for robotics",
  blurb:
    "Each one is its own repository, tagged and versioned on its own — usable alone, or " +
    "combined the way the ones on this page already combine each other.",
  body: `
      <h2 id="start">Start here</h2>
      <ul class="plain">
        <li><a href="crates/index.html">Every crate</a> — what each one does, and what it
        depends on.</li>
        <li><a href="guides/install.html">Install</a> — one crate as a normal Cargo dependency,
        or the whole set as submodules.</li>
      </ul>

      <h2 id="rules">How it's put together</h2>
      <ul class="plain">
        <li>Every crate is published from its own repository. None of them is a Cargo workspace
        member of any other — a dependency between two of them is an ordinary Cargo dependency
        on a tagged release, the same as a crates.io dependency would be.</li>
        <li>This root pins each one to a commit as a git submodule. That's a known-good
        combination, not a shared build — clone a crate on its own and it still builds.</li>
        <li>Five crates depend on nothing else here: <a href="crates/datapod.html">datapod</a>,
        <a href="crates/keylock.html">keylock</a>, <a href="crates/stateup.html">stateup</a>,
        <a href="crates/tagdata.html">tagdata</a>, and <a href="crates/wirebit.html">wirebit</a>.
        Most of what else is here builds on <a href="crates/datapod.html">datapod</a> in
        particular — it's the data types the rest agree on.</li>
      </ul>`,
});

// -------------------------------------------------------------------------------- crates -----
{
  const names = Object.keys(CRATES).sort();
  const rows = names.map((name) => {
    const c = CRATES[name];
    const on = c.deps.length
      ? c.deps.map((d) => `<a href="${d}.html">${d}</a>`).join(", ")
      : `<span class="dim">nothing here</span>`;
    return [`<a href="${name}.html"><b>${name}</b></a>`, c.blurb, `<span class="wrap-ok">${on}</span>`];
  });
  const table = `      <div class="tw"><table>
        <thead><tr><th>crate</th><th>what it does</th><th>builds on</th></tr></thead>
        <tbody>
${rows.map((r) => `          <tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n")}
        </tbody>
      </table></div>`;

  PAGES.push({
    at: "crates/index.html",
    section: "crates",
    nav: "every crate",
    title: "Every crate",
    blurb: "What each one does, and which of the others it builds on.",
    body: table,
  });

  for (const name of names) {
    const c = CRATES[name];
    const deps = c.deps.length
      ? `<ul class="plain">${c.deps.map((d) => `<li><a href="${d}.html">${d}</a></li>`).join("")}</ul>`
      : `<p class="dim">Nothing else here. This is one of the five foundation crates.</p>`;
    const usedBy = names.filter((n) => CRATES[n].deps.includes(name));
    const usedByList = usedBy.length
      ? `<ul class="plain">${usedBy.map((n) => `<li><a href="${n}.html">${n}</a></li>`).join("")}</ul>`
      : `<p class="dim">Nothing else here depends on it yet.</p>`;

    PAGES.push({
      at: `crates/${name}.html`,
      section: "crates",
      nav: name,
      title: name,
      blurb: c.blurb,
      body: `
${c.body}
      <h2 id="on">Builds on</h2>
      ${deps}
      <h2 id="by">Used by</h2>
      ${usedByList}
      <h2 id="repo">Repository</h2>
      <p><a href="${repo(name)}">github.com/robolibs/${name}</a></p>`,
    });
  }
}

// -------------------------------------------------------------------------------- guides -----
PAGES.push({
  at: "guides/install.html",
  section: "guide",
  nav: "install",
  title: "Install",
  blurb: "One crate as a normal Cargo dependency, or the whole set as submodules.",
  body: `
      <h2 id="one">One crate</h2>
      <p>Every crate is a normal Cargo dependency on a tagged release:</p>
      <pre><code>[dependencies]
datapod = { git = "https://github.com/robolibs/datapod.git", tag = "0.4.1" }</code></pre>
      <p>Or clone it directly. It builds on its own, with no sibling checkouts required.</p>

      <h2 id="all">The whole set</h2>
      <pre><code>git clone --recursive https://github.com/robolibs/.github.git robolibs
cd robolibs</code></pre>
      <p>Cloned without <code>--recursive</code>? Fill the submodules in after the fact:</p>
      <pre><code>git submodule update --init</code></pre>

      <h2 id="build">Building</h2>
      <p>Every crate is an ordinary Cargo project — nothing site-specific to learn:</p>
      <pre><code>cargo build
cargo test</code></pre>`,
});
