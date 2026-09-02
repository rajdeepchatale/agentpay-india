/* Resolve the project's "@/*" path alias for Node's test runner.
   Next.js and tsc understand it via tsconfig `paths`; plain Node does not.
   This keeps production code idiomatic instead of forcing relative imports
   just to make tests run. */

import { statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, next) {
  /* `server-only` is a build-time guard that throws outside a server bundle.
     It carries no runtime behaviour, so tests stub it out rather than lose
     the protection it gives production code. */
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export{}", shortCircuit: true };
  }

  if (!specifier.startsWith("@/")) return next(specifier, context);

  const base = path.join(SRC, specifier.slice(2));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (isFile(candidate)) {
      return next(pathToFileURL(candidate).href, context);
    }
  }

  return next(specifier, context);
}
