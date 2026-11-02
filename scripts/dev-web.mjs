import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = new URL("../", import.meta.url);
const args = process.argv.slice(2);
// Some PowerShell npm shims drop the flag and forward only its port value.
if (args.length === 1 && /^\d{2,5}$/.test(args[0])) args.unshift("--port");
// Existing shell values win, followed by web overrides and harness defaults.
for (const name of ["web/.env.local", ".env.local", ".env"]) {
  const path = fileURLToPath(new URL(name, root));
  if (existsSync(path)) process.loadEnvFile(path);
}
const child = spawn(process.execPath, [
  fileURLToPath(new URL("web/node_modules/next/dist/bin/next", root)),
  "dev", ...args,
], { cwd: fileURLToPath(new URL("web/", root)), env: process.env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
