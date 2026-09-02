import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

const [,, inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node process-image.mjs <input> <output>");
  process.exit(1);
}

// Resize to exactly 800x1067, jpeg format, 82% quality to ensure under 200KB
execFileSync("sips", [
  "-z", "1067", "800",
  "-s", "format", "jpeg",
  "-s", "formatOptions", "82",
  inputPath,
  "--out", outputPath
]);

const size = statSync(outputPath).size;
console.log(`Saved ${outputPath}: ${(size / 1024).toFixed(1)} KB`);
