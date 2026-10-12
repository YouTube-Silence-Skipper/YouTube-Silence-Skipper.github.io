// Parity gate: built _site/<page> must render identically to the original page
// on `main` (pre-migration), ignoring only insignificant whitespace.
// Whitespace is collapsed the same way an HTML renderer collapses it, so a pass
// means the rendered DOM/content/attributes are identical.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PAGES = [
  "index.html",
  "pro-success.html",
  "privacy-policy.html",
  "terms-and-conditions.html",
  "404.html",
  "activate-pro.html",
  "manage-subscription.html",
];

const BASE = process.env.PARITY_BASE || "main";
const norm = (s) => s.replace(/\s+/g, " ").trim();

let fail = 0;
for (const page of PAGES) {
  let orig, built;
  try {
    orig = execSync(`git show ${BASE}:${page}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    console.log(`SKIP  ${page} (no ${BASE}:${page})`);
    continue;
  }
  try {
    built = readFileSync(`_site/${page}`, "utf8");
  } catch {
    console.log(`MISS  ${page} (not in _site/ — build it first)`);
    fail++;
    continue;
  }
  const a = norm(orig);
  const b = norm(built);
  if (a === b) {
    console.log(`OK    ${page}`);
    continue;
  }
  fail++;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  console.log(`DIFF  ${page}  (first difference at char ${i})`);
  console.log(`  orig : …${JSON.stringify(a.slice(Math.max(0, i - 50), i + 70))}`);
  console.log(`  built: …${JSON.stringify(b.slice(Math.max(0, i - 50), i + 70))}`);
}

console.log("");
if (fail) {
  console.log(`✗ ${fail} page(s) differ from ${BASE}`);
  process.exit(1);
} else {
  console.log(`✓ ALL PAGES RENDER IDENTICALLY to ${BASE}`);
}
