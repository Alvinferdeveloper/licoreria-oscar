import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const tsc = require.resolve("typescript/bin/tsc");

rmSync(dist, { recursive: true, force: true });

for (const config of ["tsconfig.esm.json", "tsconfig.cjs.json"]) {
  const result = spawnSync(process.execPath, [tsc, "-p", config], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Marca el formato de cada carpeta para que Node interprete .js correctamente
mkdirSync(join(dist, "esm"), { recursive: true });
mkdirSync(join(dist, "cjs"), { recursive: true });
writeFileSync(join(dist, "esm", "package.json"), '{"type":"module"}\n');
writeFileSync(join(dist, "cjs", "package.json"), '{"type":"commonjs"}\n');
