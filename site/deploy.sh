#!/bin/sh
# Publish docs/ to robolibs/robolibs.github.io, the repository GitHub serves the site from. That
# repository holds only this output: a fresh clone, replaced wholesale, one commit naming its source.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
target=${SITE_REPO:-https://github.com/robolibs/robolibs.github.io.git}

if [ -n "$(git -C "$root" status --porcelain -- site docs)" ]; then
  echo "deploy: commit site/ and docs/ first, so the deploy names a source that exists" >&2
  exit 1
fi

node "$root/site/build.mjs"
if [ -n "$(git -C "$root" status --porcelain -- docs)" ]; then
  echo "deploy: docs/ is not what site/ builds; build and commit it first" >&2
  exit 1
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM
git clone -q --depth 1 "$target" "$work/out" 2>/dev/null || git -C "$work" init -q out

# Everything but the history goes, so a page removed from site/ is removed from the site.
find "$work/out" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$root/docs/." "$work/out/"
printf '%s\n' '# robolibs.github.io' '' \
  'Generated. The source is `site/` in [robolibs/.github](https://github.com/robolibs/.github);' \
  'edit it there and run `site/deploy.sh`. Nothing here is edited by hand.' >"$work/out/README.md"

source=$(git -C "$root" rev-parse --short HEAD)
cd "$work/out"
git add -A
if git diff --cached --quiet 2>/dev/null; then
  echo "deploy: nothing changed"
  exit 0
fi
git commit -q -m "chore(site): deploy $source"
git branch -M main
git remote add origin "$target" 2>/dev/null || git remote set-url origin "$target"
git push -q origin HEAD:main
echo "deploy: $source published"
