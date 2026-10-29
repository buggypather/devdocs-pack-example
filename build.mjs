// Builds the doc pack from the HTML pages in src/.
//
//   node build.mjs
//
// Each folder in src/ is one doc:
//
//   src/<slug>/doc.json     {"name": "...", "version": "...", "links": {"home": "...", "code": "..."}}
//   src/<slug>/index.html   the doc's home page
//   src/<slug>/**/*.html    the other pages
//
// A page's <h1> becomes a search entry, and so does every <h2 id="...">. Pages
// in a subfolder are grouped under that folder's name in the sidebar.
//
// The output is what DevDocs reads: docs.json at the top, and one folder per doc
// with index.json (the entries), db.json (every page, for offline use) and the
// pages themselves. No dependencies; needs Node 20 or newer.

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = "src";
const SLUG_RGX = /^[a-z0-9_.]+(?:~[a-z0-9_.]+)?$/;

const docs = [];

for (const slug of readdirSync(SRC)) {
  if (!SLUG_RGX.test(slug)) {
    fail(`src/${slug}: folder names must be lower case letters, digits, "_" or ".", e.g. my_notes or my_notes~2.`);
  }
  const dir = join(SRC, slug);
  const meta = JSON.parse(readFileSync(join(dir, "doc.json"), "utf8"));
  if (!meta.name) {
    fail(`src/${slug}/doc.json needs a "name".`);
  }

  const pages = {};
  const entries = [];
  for (const file of htmlFiles(dir)) {
    const path = relative(dir, file).split(sep).join("/").replace(/\.html$/, "");
    const html = readFileSync(file, "utf8").trim();
    pages[path] = html;
    if (path === "index") {
      continue; // The doc itself stands for its home page.
    }

    const folder = path.includes("/") ? path.split("/")[0] : "";
    const type = folder ? titleCase(folder) : meta.name;
    const title = text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) || titleCase(path.split("/").pop());
    entries.push({ name: title, path, type });
    for (const [, id, heading] of html.matchAll(/<h2[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi)) {
      entries.push({ name: `${title}: ${text(heading)}`, path: `${path}#${id}`, type });
    }
  }
  if (!pages.index) {
    fail(`src/${slug}/index.html is missing: every doc needs a home page.`);
  }

  const types = [];
  for (const entry of entries) {
    const type = types.find((t) => t.name === entry.type);
    if (type) {
      type.count++;
    } else {
      types.push({ name: entry.type, slug: entry.type.toLowerCase().replace(/[^a-z0-9]+/g, "-"), count: 1 });
    }
  }

  const out = slug;
  rmSync(out, { recursive: true, force: true });
  for (const [path, html] of Object.entries(pages)) {
    const file = join(out, `${path}.html`);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, html);
  }
  const index = JSON.stringify({ entries, types });
  const db = JSON.stringify(pages);
  writeFileSync(join(out, "index.json"), index);
  writeFileSync(join(out, "db.json"), db);

  docs.push({
    name: meta.name,
    slug,
    ...(meta.version !== undefined && { version: String(meta.version) }),
    ...(meta.release && { release: String(meta.release) }),
    ...(meta.links && { links: meta.links }),
    ...(meta.attribution && { attribution: meta.attribution }),
    mtime: Math.floor(Date.now() / 1000),
    db_size: Buffer.byteLength(db),
  });
  console.log(`${slug}: ${Object.keys(pages).length} pages, ${entries.length} entries`);
}

writeFileSync("docs.json", JSON.stringify(docs, null, 2) + "\n");
console.log(`docs.json: ${docs.length} doc(s)`);

function* htmlFiles(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      yield* htmlFiles(path);
    } else if (item.name.endsWith(".html")) {
      yield path;
    }
  }
}

function text(html) {
  return (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function titleCase(name) {
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
