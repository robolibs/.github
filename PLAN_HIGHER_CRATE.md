# PLAN — the robot/composition crate on top of peerbus

## Purpose

Please chek `/home/bresilla/data/code/robolibs/peerbus/`: identity/key management,
`did:key`, friendly names, topic namespacing, the robot/computer/node model, and
**topic → id resolution by referral**. This crate depends on peerbus and talks to
it **purely by `EndpointId`**. peerbus stays dumb (hold a key, talk to any id over
shm-or-iroh); this crate holds the brains (who's who, who belongs to which robot,
where a topic lives).

---

## Vocabulary (fix it, because "node" is overloaded)

- **Machine** — one peerbus `Node`: one ed25519 key = one iroh `EndpointId` = one
  shm arena, on one host. A robot with three computers = **three Machines =
  three ids**.
- **Robot** — a logical set of Machines that belong together. Just a grouping
  plus a directory. (This is what the abandoned `system_did` was groping toward —
  now a first-class, upstairs concept.)
- **Participant** ("node" in casual speech) — a *logical* name like `camera` or
  `planner`. **Not** a peerbus `Node`, **not** its own id. A label that owns some
  topics and is hosted on a Machine.
- **Topic** — a `/`-namespaced path. Exact-match in peerbus today; prefix /
  wildcard matching is a future peerbus feature (see Open questions).

---

## Model

- Each Machine holds its own key (persisted or derived here) and its own peerbus
  `Node`.
- Each Machine keeps a **directory**: `topic → (type_hash, id)` for what it hosts
  (seeded from `peerbus::Node::hosted_topics()`), plus what it has learned about
  its robot-mates.
- A **Robot** is the union of its Machines plus a way to *be asked* — either a
  **front-door** Machine that answers resolution, or the directory **replicated**
  on every Machine so any of them can answer.
- **No global coordinator.** Each Robot is the authority for *its own* topics.
  You address a Robot directly (by a known id / `did:key`) and it refers you
  inward.

---

## Resolution = referral (decided)

Flow when Machine A wants topic `T` from Robot B:

1. A dials one of Robot B's askable ids over iroh — a peerbus **req/res** on a
   reserved topic (e.g. `__resolve`).
2. B looks up `T` in its directory and returns `(type_hash, id = Y)`.
3. A calls `peerbus.subscriber(Y, T)` (or `req`/…). peerbus probes shm (are we
   co-located with `Y`?) and otherwise dials iroh `Y`.

Referral, **not** relay: no proxy, no per-message copy. The cost is that `Y` must
be directly dialable by A (iroh holepunch/relay normally covers this). If `T`
happens to be hosted on the very Machine A asked, resolution and data collapse
onto that Machine — and peerbus serves it (shm if A is co-located, else iroh)
with no special case.

Note the lazy-promotion property inherited from peerbus: a topic's shm ring is
always present, and its **iroh face is created on demand** (a stream per remote
subscriber). So "if it's shm, expose it over iroh under the same id" is already
how a Machine serves a remote asker — this crate does not re-implement it.

---

## Responsibilities

1. **Identity & keys** (lifted out of peerbus):
   - `IdentitySource`, `resolve_identity`, `derive_secret_from_name` (blake3
     name→key), `load_or_generate_key` (file, `0600`), the impersonation
     warnings, and the `did_key` module (`EndpointId ⇄ "did:key:z…"`).
   - Produce a `SecretKey`, hand it to `peerbus::Node::builder().secret_key(..)`.
2. **Naming**:
   - `did:key` as the canonical text form of an id (configs, CLI, logs).
   - a `name → id` table (friendly names resolved to `EndpointId`).
   - topic namespacing conventions: relative vs absolute paths, and the
     namespace-prefix rules for a Participant.
3. **Directory**:
   - data model `topic → (type_hash, id)`; built from `hosted_topics()`.
   - serve resolution over peerbus req/res; register/announce on start and on
     every publisher/server creation or change.
4. **Robot membership**:
   - config of member ids / `did:key`s and bootstrap entry(s).
   - optional gossip/announce for dynamic membership and liveness.
5. **Ergonomic API**:
   - publish/subscribe by *name*, resolved within the robot, with a `by_id`
     escape hatch to address peerbus directly.

---

## API sketch (Rust, illustrative)

```rust
let robot = Robot::builder()
    .name("r2d2")
    .machine_key_file("/etc/r2d2/head.key")   // persistence lives HERE now
    .directory(Directory::Replicated)          // or ::FrontDoor("did:key:z…")
    .bootstrap(["did:key:z…base", "did:key:z…arm"])
    .build()?;                                  // internally: peerbus Node + resolver

// publish: registers "/perception/pose" (type Pose, this machine's id) in the directory
robot.publish::<Pose>("/perception/pose")?;

// subscribe by name: resolve "perception/lidar" within the robot → id → peerbus
let sub = robot.subscribe::<Pose>("perception/lidar", "scan")?;

// escape hatch: talk straight to peerbus by id
let sub = robot.by_id(some_endpoint_id).subscribe::<Pose>("scan")?;
```

---

## Phases

1. **Identity module** — lift identity + `did_key` out of peerbus; `SecretKey`
   production + persistence; unit tests. (Pairs with `PLAN.md` Phases 2–3.)
2. **Directory + resolution** — data model; resolution endpoint over peerbus
   req/res; feed it from `peerbus::Node::hosted_topics()`.
3. **Registration/announce** — push on start and on each publisher/server
   creation; keep the directory current.
4. **Robot membership + bootstrap** — member/bootstrap config; front-door vs
   replicated directory (start replicated: simplest, no SPOF).
5. **Namespacing + name-based API** — relative/absolute topic rules; friendly
   `name → id`; the ergonomic `Robot` surface.
6. **Discovery/replication** — gossip membership, liveness, resolution caching.

---

## Open questions

- **Front-door vs replicated directory.** Lean replicated per Machine to start
  (any Machine can answer, no single point of resolution).
- **Security / authz.** Who may register, who may resolve. Reuse peerbus's
  deny-by-default inbound allowlist at the Machine level; robot membership is the
  source of the allowlist.
- **Type advertisement.** Carry `type_hash` in the directory so a caller can
  pre-check before peerbus's handshake also checks it (belt and suspenders).
- **Wildcard / prefix topics.** Subscribing to `perception/*` or "everything
  under `perception/`" needs a **peerbus** feature (prefix subscribe); peerbus is
  exact-match today. Cross-crate dependency — schedule the peerbus side before
  building the namespace-wildcard API here.
