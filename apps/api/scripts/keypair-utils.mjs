import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import { apiDir } from "./env-utils.mjs";

export async function readKeypair(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(apiDir, filePath);
  const content = await readFile(absolutePath, "utf8");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(content)));
}

export async function writeKeypair(filePath, keypair) {
  await writeFile(filePath, `${JSON.stringify(Array.from(keypair.secretKey))}\n`, "utf8");
}

export async function loadKeypairFromEnv(env, ...names) {
  for (const name of names) {
    const value = env[name];
    if (!value) {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
    }

    return readKeypair(trimmed);
  }

  throw new Error(`Missing keypair. Set one of: ${names.join(", ")}.`);
}

export function readPublicKeyFromEnv(env, ...names) {
  for (const name of names) {
    const value = env[name];
    if (value?.trim()) {
      return new PublicKey(value.trim());
    }
  }

  return undefined;
}
