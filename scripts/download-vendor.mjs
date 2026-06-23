// Downloads Handsontable + HyperFormula from jsDelivr CDN for offline use.
// Run: npm run vendor:update
// Files are written to public/vendor/ and tracked in git.

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { get } from "node:https";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = join(__dirname, "..", "public", "vendor");

const files = {
  "handsontable.full.min.css":
    "https://cdn.jsdelivr.net/npm/handsontable@14.6.2/dist/handsontable.full.min.css",
  "handsontable.full.min.js":
    "https://cdn.jsdelivr.net/npm/handsontable@14.6.2/dist/handsontable.full.min.js",
  "hyperformula.full.min.js":
    "https://cdn.jsdelivr.net/npm/hyperformula@2.7.1/dist/hyperformula.full.min.js",
};

await mkdir(dest, { recursive: true });

for (const [name, url] of Object.entries(files)) {
  const path = join(dest, name);
  console.log(`Downloading ${name}...`);
  await new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const stream = createWriteStream(path);
      res.pipe(stream);
      stream.on("finish", () => {
        console.log(`  → ${path}`);
        resolve();
      });
      stream.on("error", reject);
    }).on("error", reject);
  });
}

console.log("\nDone! Vendor files ready for offline use.");
