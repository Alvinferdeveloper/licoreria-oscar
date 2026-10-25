#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MACHINE = "podman-machine-default";

function run(cmd, args, { capture = false, allowFail = false } = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (!allowFail && result.status !== 0) {
    if (capture) process.stderr.write(result.stderr || "");
    process.exit(result.status ?? 1);
  }
  return result;
}

function available(cmd, args) {
  const result = spawnSync(cmd, [...args, "version"], { cwd: ROOT, stdio: "ignore" });
  return !result.error && result.status === 0;
}

function detectEngine() {
  if (available("docker", ["compose"])) return { cmd: "docker", prefix: ["compose"] };
  if (available("podman", ["compose"])) return { cmd: "podman", prefix: ["compose"] };
  console.error(
    [
      "No encontré Docker Compose ni Podman Compose.",
      "",
      "Opciones:",
      "  - Docker:  instala Docker Desktop (incluye `docker compose`)",
      "  - Podman:  instala Podman + el proveedor `docker-compose` (winget install Docker.DockerCompose)",
    ].join("\n"),
  );
  process.exit(1);
}

function ensurePodmanMachine() {
  const list = run("podman", ["machine", "list", "--format", "json"], { capture: true });
  let exists = false;
  try {
    exists = JSON.parse(list.stdout || "[]").some((m) => m.Name === MACHINE);
  } catch {
    exists = false;
  }
  if (!exists) {
    console.log(`Creando máquina Podman "${MACHINE}" (solo la primera vez)...`);
    run("podman", ["machine", "init", "--cpus", "2", "--memory", "2048"]);
  }
  const started = run("podman", ["machine", "start"], { capture: true, allowFail: true });
  if (started.status !== 0 && !/already running/i.test(started.stderr || "")) {
    process.stderr.write(started.stderr || "");
    process.exit(started.status ?? 1);
  }
}

const engine = detectEngine();
if (engine.cmd === "podman") ensurePodmanMachine();

const compose = (...args) => run(engine.cmd, [...engine.prefix, ...args]);
const extra = process.argv.slice(3);

const actions = {
  up() {
    compose("up", "-d", "--build", ...extra);
    console.log("\nListo. Web: http://localhost:5173 — API: http://localhost:3000/api/v1 — Swagger: http://localhost:3000/api/docs");
  },
  down() {
    compose("down", ...extra);
  },
  ps() {
    compose("ps", ...extra);
  },
  logs() {
    compose("logs", "-f", ...extra);
  },
  restart() {
    compose("restart", ...extra);
  },
};

const action = process.argv[2];
if (!actions[action]) {
  console.error("Uso: node scripts/stack.mjs <up|down|ps|logs|restart> [servicio...]");
  process.exit(1);
}
actions[action]();
