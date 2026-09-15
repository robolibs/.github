# the site

`site/` is the only source. `docs/` is generated from it and committed:

```sh
node site/build.mjs     # write docs/
sh site/deploy.sh        # publish docs/ to robolibs.github.io
```

robolibs.github.io is served by GitHub Pages from
[robolibs/robolibs.github.io](https://github.com/robolibs/robolibs.github.io) — GitHub Pages on an
organisation's own `.github` repository is more limited (no custom domain, and Pages has to stay
off so the profile README keeps rendering as the org page), so the built site lives in the sibling
repo instead. That repository holds nothing but what `deploy.sh` puts there: a build of this
directory, replaced wholesale, one commit naming the source it came from. Nothing there is edited
by hand. `docs/.nojekyll` stops Jekyll touching anything; there's no `docs/CNAME` because there's
no custom domain yet — add one there and to `DOMAIN` in `build.mjs` if that changes.

## why a generator

Four pages today, more later, all sharing a masthead, a sidebar and a footer. The navigation is
the part that rots when a site is kept by hand, and it's also the first thing a reader notices.
One file decides the shape of the whole thing.

## where the graph comes from

`site/graph.mjs` holds the dependency graph — which crate depends on which sibling — copied out of
each crate's own `Cargo.toml` by hand. It isn't read from the manifests at build time, so a crate
that gains or drops a sibling dependency needs this file updated separately; `architecture/index.html`
is only as accurate as the last time someone checked. The layout (who sits in which layer, left to
right) is computed from that graph, not hand-placed — the graph is real data, so an algorithm
laying it out is more honest than art would be.

`docs/assets/style.css` and `docs/assets/logo.svg` are the parts of `docs/` kept by hand rather
than generated; `logo.svg` is a copy of `profile/logo.svg`, the org's own mark.
