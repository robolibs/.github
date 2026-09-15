// Builds docs/ from the page sources beside this file.
//
// A generator rather than a handful of hand-kept copies of the same masthead: the navigation is
// the part that rots when a site is kept by hand, and it's also the first thing a reader notices.
// Run it with `node site/build.mjs`; the output is committed, so GitHub Pages needs no build step.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { SECTIONS, PAGES } from "./content.mjs";

const OUT = "docs";
const DOMAIN = "https://robolibs.github.io";

/** Where a page sits, relative to another page. */
function href(from, to) {
  const up = relative(dirname(from || "index.html"), dirname(to)) || ".";
  const path = `${up}/${to.split("/").pop()}`.replace(/^\.\//, "");
  return path === "index.html" && dirname(from) === dirname(to) ? "index.html" : path;
}

/** The path back to the site root from a page. */
function root(at) {
  const depth = at.split("/").length - 1;
  return depth === 0 ? "." : "..".concat("/..".repeat(depth - 1));
}

/** The top bar, with the current section marked. */
function topbar(page) {
  const r = root(page.at);
  const links = SECTIONS.map((s) => {
    const here = s.key === page.section ? " aria-current=\"page\"" : "";
    return `<a href="${r}/${s.home}"${here}>${s.name}</a>`;
  }).join("\n        ");
  return `  <header class="top">
    <div class="bar">
      <a class="brand" href="${r}/index.html" aria-label="robolibs, home">
        <img class="mark" src="${r}/assets/logo.svg" alt="" width="28" height="28">
        <span>robolibs</span>
      </a>
      <nav>
        ${links}
      </nav>
      <div class="ghost">
        <a href="https://github.com/robolibs">github</a>
      </div>
    </div>
  </header>`;
}

/** The section's own page list. */
function sidebar(page) {
  const section = SECTIONS.find((s) => s.key === page.section);
  if (!section || section.key === "home") return "";
  const mine = PAGES.filter((p) => p.section === page.section);
  if (mine.length < 2) return "";
  const items = mine
    .map((p) => {
      const here = p.at === page.at ? " aria-current=\"page\"" : "";
      return `      <li><a href="${href(page.at, p.at)}"${here}>${p.nav}</a></li>`;
    })
    .join("\n");
  return `  <aside>
    <h5>${section.name}</h5>
    <ul>
${items}
    </ul>
  </aside>`;
}

function html(page) {
  const r = root(page.at);
  const aside = sidebar(page);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title} — robolibs</title>
<meta name="description" content="${page.blurb}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="${r}/assets/style.css">
</head>
<body>
${topbar(page)}
  <div class="wrap${aside ? "" : " wide"}">
${aside}
    <main>
      <h1>${page.title}</h1>
      <p class="lede">${page.blurb}</p>
${page.body}
    </main>
  </div>
  <footer class="foot">
    <div class="in">
      <span>eighteen crates, no shared code</span>
      <span>git submodules, not a monorepo</span>
      <a href="https://github.com/robolibs/.github">.github</a>
      <a href="${r}/architecture/index.html">the map</a>
    </div>
  </footer>
</body>
</html>
`;
}

let written = 0;
for (const page of PAGES) {
  const path = join(OUT, page.at);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html(page));
  written += 1;
}

// A sitemap and a robots.txt, because this is a real site on a real domain.
const urls = PAGES.map((p) => `  <url><loc>${DOMAIN}/${p.at}</loc></url>`).join("\n");
writeFileSync(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${DOMAIN}/sitemap.xml\n`);

// GitHub Pages serves this for anything that is not there.
writeFileSync(
  join(OUT, "404.html"),
  html({
    at: "404.html",
    section: "home",
    title: "Not here",
    blurb: "That page does not exist. The overview is a good place to start again.",
    body: `      <ul class="plain">
        <li><a href="index.html">the overview</a> — what robolibs is</li>
        <li><a href="crates/index.html">the eighteen</a> — every crate, one line each</li>
        <li><a href="architecture/index.html">the map</a> — who depends on whom</li>
        <li><a href="guides/install.html">install</a> — clone one crate, or all of them</li>
      </ul>`,
  }),
);

writeFileSync(join(OUT, ".nojekyll"), "");

console.log(`${written} pages, a sitemap and a 404 written to ${OUT}/`);
