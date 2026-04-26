import { spawn } from "node:child_process";
import process from "node:process";
import { loadEnvFiles } from "./env-utils.mjs";

const separatorIndex = process.argv.indexOf("--");
if (separatorIndex < 0 || separatorIndex === process.argv.length - 1) {
  console.error("Usage: node scripts/run-with-env.mjs <envFile...> -- <command> [args...]");
  process.exit(1);
}

const envFiles = process.argv.slice(2, separatorIndex);
const command = process.argv[separatorIndex + 1];
const args = process.argv.slice(separatorIndex + 2);

const loadedEnv = await loadEnvFiles(...envFiles);
const resolvedCommand =
  process.platform === "win32" && ["pnpm", "npm", "npx"].includes(command)
    ? `${command}.cmd`
    : command;

const child = spawn(resolvedCommand, args, {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    ...loadedEnv,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
