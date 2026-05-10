import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const stateFilePath = resolve(process.env.DEMO_STATE_FILE ?? ".demo-state/operations-state.json");

if (existsSync(stateFilePath)) {
  rmSync(stateFilePath, { force: true });
  console.log(`Deleted demo operations state: ${stateFilePath}`);
} else {
  console.log(`Demo operations state is already clean: ${stateFilePath}`);
}

console.log("Restart the API to re-create the default seed state.");
