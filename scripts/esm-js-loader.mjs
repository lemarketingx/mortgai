/**
 * Minimal Node ESM loader for test scripts (scripts/verify-qa-fixes.mjs).
 *
 * The lib/ modules are written as ESM with extensionless relative imports
 * (bundled by Next.js in production). This loader lets plain Node import the
 * REAL source files for regression tests — no mocks, no copies:
 *   1. appends ".js" to extensionless relative specifiers
 *   2. forces .js files inside this project to parse as ESM
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file://")) {
    const filePath = fileURLToPath(url);
    if (filePath.startsWith(PROJECT_ROOT) && filePath.endsWith(".js") && !filePath.includes("node_modules")) {
      return nextLoad(url, { ...context, format: "module" });
    }
  }
  return nextLoad(url, context);
}
