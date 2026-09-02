#!/usr/bin/env node
// ============================================================
// Catch swapped saree images before they reach the demo.
// ============================================================
// Run from anywhere:  node public/products/verify-images.mjs
//
// Generating nineteen images in a batch is exactly where a green cotton saree
// gets saved as bridal-paithani-heavy-zari.jpg. Nobody notices until it is on
// camera beside the wrong price.
//
// This does not trust the filename. It reads each image's actual dominant
// colour and asks: of all sixteen catalog colours, which one is this closest
// to? If the answer is not the product whose name it was saved under, the
// image is probably in the wrong slot.
//
// Comparison is RELATIVE, not absolute — a photo never matches a flat hex, but
// a green saree is reliably closer to "green" than to "red". Only ranking
// matters here.
//
// Zero dependencies. Uses `sips`, which ships with macOS.
// ============================================================

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "../../src/lib/catalog/data.ts");

/* Same vocabulary the UI's placeholder swatches use, so a verified image and
   its fallback agree on what colour the saree is. */
const COLORS = {
  "navy blue": [42, 58, 92], maroon: [109, 34, 48], indigo: [49, 64, 122],
  purple: [85, 50, 114], golden: [201, 162, 39], green: [63, 125, 78],
  brown: [107, 74, 47], white: [230, 227, 220], black: [38, 38, 46],
  wine: [93, 35, 51], gold: [201, 162, 39], blue: [49, 85, 138],
  pink: [168, 68, 106], red: [163, 43, 52], grey: [106, 106, 118],
  cream: [222, 213, 196], teal: [47, 111, 112], yellow: [217, 165, 32],
  orange: [196, 106, 42], silver: [168, 173, 184], beige: [203, 191, 168],
};
const KEYS = Object.keys(COLORS).sort((a, b) => b.length - a.length);
const resolve = (phrase) => {
  const h = String(phrase ?? "").toLowerCase();
  for (const k of KEYS) if (h.includes(k)) return { name: k, rgb: COLORS[k] };
  return null;
};

/* ---- Read the catalog ------------------------------------- */

const src = readFileSync(DATA, "utf8");
const products = [];
const re = /id: '(prod_\d+)'[\s\S]*?name: '([^']+)'[\s\S]*?colors: \[([^\]]+)\][\s\S]*?image_url: '\/products\/([^']+)'/g;
let m;
while ((m = re.exec(src))) {
  const colors = m[3].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
  products.push({ id: m[1], name: m[2], body: resolve(colors[0]), file: m[4] });
}

/* ---- Sample each image's dominant colour ------------------- */

const saturation = (r, g, b) => {
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
};

/**
 * The saree's colour — not the photograph's average.
 *
 * A flat average fails badly on these images and did so on the first seven:
 * the pale studio background and the model's skin swamp the frame, so a green
 * cotton saree and a maroon Chanderi both come back "white". Two corrections,
 * both necessary:
 *
 *   1. Skip the top 40% of rows. That is face, hair and empty background —
 *      the saree body and its border live in the lower frame.
 *   2. Keep only saturated pixels. The seamless grey and skin are washed out;
 *      dyed cloth is not. If almost nothing is saturated the saree genuinely
 *      is white or cream, so fall back to the plain average.
 */
function sareeRgb(path, work) {
  /* 32×32 gives enough pixels to filter and still costs nothing. BMP because
     it is uncompressed and needs no decoder. */
  const bmp = join(work, "s.bmp");
  execFileSync("sips", ["-z", "32", "32", "-s", "format", "bmp", path, "--out", bmp], {
    stdio: "ignore",
  });
  const buf = readFileSync(bmp);
  const offset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const height = Math.abs(buf.readInt32LE(22));
  const topDown = buf.readInt32LE(22) < 0;
  const step = buf.readUInt16LE(28) / 8;
  const stride = Math.ceil((width * step) / 4) * 4;

  /* The dominant colour, not the mean.
     Averaging fails on two-tone sarees, and nearly every saree is two-tone: a
     blue Gadwal body with a maroon border averages to purple, and a golden
     tussar with a brown border averages to red. Both were flagged as swaps
     when they were perfectly correct.
     Bucketing and taking the most populated bucket returns the body colour,
     which is what colors[0] in the catalog actually names. */
  const BUCKET = 48;
  const buckets = new Map();
  let ar = 0, ag = 0, ab = 0, an = 0;

  for (let row = 0; row < height; row++) {
    /* Which source row this is, accounting for BMP's bottom-up default. */
    const y = topDown ? row : height - 1 - row;
    if (y < height * 0.4) continue; // skip face, hair, upper background

    for (let x = 0; x < width; x++) {
      const i = offset + row * stride + x * step;
      if (i + 2 >= buf.length) break;
      const b = buf[i], g = buf[i + 1], r = buf[i + 2];
      ar += r; ag += g; ab += b; an++;
      if (saturation(r, g, b) <= 0.18) continue; // background, skin, neutrals

      const key =
        `${Math.round(r / BUCKET)}|${Math.round(g / BUCKET)}|${Math.round(b / BUCKET)}`;
      const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      e.r += r; e.g += g; e.b += b; e.n++;
      buckets.set(key, e);
    }
  }

  if (!an) return null;

  const top = [...buckets.values()].sort((p, q) => q.n - p.n)[0];
  /* Fewer than ~8% saturated means the cloth really is white, cream or
     silver — there is no dominant hue to find. */
  if (top && top.n / an > 0.08) return [top.r / top.n, top.g / top.n, top.b / top.n];
  return [ar / an, ag / an, ab / an];
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * How far down its own colour can rank before a file is worth opening.
 *
 * Set from measurement, not taste. Deliberately swapping two images put their
 * own colours at rank #15 of 16. Correct-but-awkward images — a golden tussar
 * with a wide brown border, a blue Gadwal with a maroon one — landed at #11
 * and #4. So the honest line sits above 12: it catches a real crossing and
 * stops crying wolf at two-tone sarees, which is most of them.
 *
 * This is a coarse net, not a proof. It exists to catch the gross mistake of
 * a whole file under the wrong name. Looking at the images is still the real
 * check, and it is the one that has never been wrong.
 */
const NEAR_RANK = 12;

/* ---- Check ------------------------------------------------- */

const work = mkdtempSync(join(tmpdir(), "sareecheck-"));
const present = products.filter((p) => existsSync(join(HERE, p.file)));
const missing = products.filter((p) => !existsSync(join(HERE, p.file)));
const problems = [];

console.log(`\nChecking ${present.length} of ${products.length} catalog images.\n`);

try {
  for (const p of present) {
    if (!p.body) continue;
    const avg = sareeRgb(join(HERE, p.file), work);
    if (!avg) continue;

    /* Which catalog colour is this image actually closest to? */
    const ranked = products
      .filter((q) => q.body)
      .map((q) => ({ file: q.file, name: q.body.name, d: dist(avg, q.body.rgb) }))
      .sort((a, b) => a.d - b.d);

    const own = ranked.find((r) => r.file === p.file);
    const best = ranked[0];
    const rank = ranked.indexOf(own) + 1;

    /* Rank, not the top match, decides this.
       Adjacent hues are not errors: indigo and navy blue are nearly the same
       colour, a green saree with a wide gold border averages toward gold, and
       navy sits next to purple in RGB. All three happened on the real set and
       all three images were correct.
       A genuine swap does not land nearby — when a green saree was saved under
       the bridal-red filename, its own colour ranked #10 and #13 of 16. So a
       top-3 rank passes, and only a distant one is treated as a swap. */
    const state = rank === 1 ? "ok" : rank <= NEAR_RANK ? "near" : "swap";
    const label = { ok: "ok   ", near: "ok   ", swap: "LOOK " }[state];

    console.log(
      `  ${label} ${p.file.padEnd(34)} expected ${p.body.name.padEnd(10)}` +
        ` reads as ${best.name}${state === "near" ? ` (own colour #${rank})` : ""}`,
    );

    if (state === "swap") {
      problems.push(
        `${p.file}: expected ${p.body.name}, but reads as ${best.name} —` +
          ` its own colour ranks #${rank} of ${ranked.length}`,
      );
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

/* ---- Report ------------------------------------------------ */

console.log("");
if (missing.length) {
  console.log(`${missing.length} not yet generated:`);
  for (const p of missing) console.log(`   · ${p.file}`);
  console.log("");
}

if (problems.length) {
  console.log(`WORTH OPENING — ${problems.length}:\n`);
  for (const t of problems) console.log("   ✖ " + t);
  console.log(
    "\nA flag is not proof, but it is worth a look: these are files whose own\n" +
      "colour did not even place near the top. Open them before regenerating.\n",
  );
  process.exit(1);
}

if (present.length) {
  console.log("No swaps detected. `near` rows are adjacent hues, not errors.\n");
}
