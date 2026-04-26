import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const apiDir = path.resolve(scriptsDir, "..");

export function parseEnvContent(content) {
  const variables = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    variables[key] = value;
  }

  return variables;
}

export async function loadEnvFiles(...relativePaths) {
  const loaded = {};

  for (const relativePath of relativePaths) {
    const absolutePath = path.resolve(apiDir, relativePath);

    try {
      const content = await readFile(absolutePath, "utf8");
      Object.assign(loaded, parseEnvContent(content));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  return loaded;
}
