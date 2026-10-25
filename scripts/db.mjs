#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONTAINER = "licoreria-postgres";
const MACHINE = "podman-machine-default";
const VOLUME = "licoreria_pgdata";
const IMAGE = "postgres:15-alpine";

function loadEnv() {
  const env = {};
  const file = join(ROOT, ".env");
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (line.trimStart().startsWith("#")) continue;
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function available(cmd, args = []) {
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: "ignore" });
  return !result.error && result.status === 0;
}

function detectEngine() {
  const forced = (process.env.DB_ENGINE || "").toLowerCase();
  if (forced === "docker" || forced === "podman") {
    if (!available(forced, ["--version"])) {
      console.error(`DB_ENGINE=${forced} pero el comando "${forced}" no está disponible.`);
      process.exit(1);
    }
    return forced;
  }
  if (available("docker", ["info"])) return "docker";
  if (available("podman", ["--version"])) return "podman";
  if (available("docker", ["--version"])) {
    console.error(
      [
        "Docker está instalado pero el daemon no responde.",
        "Inicia Docker Desktop (o el servicio docker) y vuelve a intentar.",
        "También puedes forzar Podman con DB_ENGINE=podman.",
      ].join("\n"),
    );
    process.exit(1);
  }
  console.error(
    [
      "No encontré Docker ni Podman.",
      "",
      "Opciones:",
      "  - Docker: instala Docker Desktop",
      "  - Podman: instala Podman (winget install RedHat.Podman)",
    ].join("\n"),
  );
  process.exit(1);
}

const ENGINE = detectEngine();
const env = loadEnv();
const cfg = {
  user: env.POSTGRES_USER || "licoreria",
  password: env.POSTGRES_PASSWORD || "licoreria_dev",
  db: env.POSTGRES_DB || "licoreria_db",
  port: env.POSTGRES_PORT || "5432",
};

function run(args, { capture = false, allowFail = false } = {}) {
  const result = spawnSync(ENGINE, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (!allowFail && result.status !== 0) {
    if (capture) process.stderr.write(result.stderr || "");
    process.exit(result.status ?? 1);
  }
  return result;
}

function machineExists() {
  const { stdout } = run(["machine", "list", "--format", "json"], { capture: true });
  try {
    return JSON.parse(stdout).some((machine) => machine.Name === MACHINE);
  } catch {
    return false;
  }
}

function ensureMachine() {
  if (ENGINE !== "podman") return;

  const listed = run(["machine", "list", "--format", "json"], { capture: true, allowFail: true });
  if (listed.status !== 0) return;

  if (!machineExists()) {
    console.log(`Creando máquina Podman "${MACHINE}" (solo la primera vez)...`);
    run(["machine", "init", "--cpus", "2", "--memory", "2048"]);
  }

  const started = run(["machine", "start"], { capture: true, allowFail: true });
  if (started.status !== 0 && !/already running/i.test(started.stderr || "")) {
    process.stderr.write(started.stderr || "");
    process.exit(started.status ?? 1);
  }
  console.log(`Máquina "${MACHINE}" en ejecución.`);
}

function containerExists() {
  return run(["container", "inspect", CONTAINER], { capture: true, allowFail: true }).status === 0;
}

function containerRunning() {
  const { stdout } = run(["ps", "--filter", `name=^${CONTAINER}$`, "--format", "{{.Names}}"], {
    capture: true,
  });
  return stdout.split(/\r?\n/).some((name) => name.trim() === CONTAINER);
}

async function waitReady() {
  for (let i = 0; i < 60; i += 1) {
    const check = run(["exec", CONTAINER, "pg_isready", "-U", cfg.user, "-d", cfg.db], {
      capture: true,
      allowFail: true,
    });
    if (check.status === 0) {
      console.log(`PostgreSQL listo en localhost:${cfg.port} (db: ${cfg.db}, user: ${cfg.user}).`);
      return;
    }
    await sleep(1000);
  }
  console.error("PostgreSQL no respondió a tiempo; revisa `npm run db:logs`.");
  process.exit(1);
}

const actions = {
  async up() {
    console.log(`Usando ${ENGINE}.`);
    ensureMachine();
    if (!containerExists()) {
      console.log(`Creando contenedor "${CONTAINER}"...`);
      run([
        "run",
        "-d",
        "--name",
        CONTAINER,
        "-e",
        `POSTGRES_USER=${cfg.user}`,
        "-e",
        `POSTGRES_PASSWORD=${cfg.password}`,
        "-e",
        `POSTGRES_DB=${cfg.db}`,
        "-e",
        "TZ=UTC",
        "-p",
        `${cfg.port}:5432`,
        "-v",
        `${VOLUME}:/var/lib/postgresql/data`,
        "--restart",
        "unless-stopped",
        IMAGE,
      ]);
    } else if (containerRunning()) {
      console.log(`Contenedor "${CONTAINER}" ya estaba en ejecución.`);
    } else {
      run(["start", CONTAINER], { capture: true });
      console.log(`Contenedor "${CONTAINER}" iniciado.`);
    }
    await waitReady();
  },
  async down() {
    if (!containerExists()) {
      console.log(`El contenedor "${CONTAINER}" no existe.`);
      return;
    }
    run(["stop", CONTAINER], { capture: true, allowFail: true });
    console.log(`Contenedor "${CONTAINER}" detenido.`);
  },
  async status() {
    run(["ps", "-a", "--filter", `name=${CONTAINER}`]);
  },
  async logs() {
    run(["logs", "-f", CONTAINER]);
  },
};

const action = process.argv[2];
if (!actions[action]) {
  console.error("Uso: node scripts/db.mjs <up|down|status|logs>");
  process.exit(1);
}

try {
  await actions[action]();
} catch (error) {
  console.error(error);
  process.exit(1);
}
