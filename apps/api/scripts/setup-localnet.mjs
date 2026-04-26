import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { apiDir, loadEnvFiles } from "./env-utils.mjs";

const localnetDir = path.join(apiDir, ".localnet");
const keysDir = path.join(localnetDir, "keys");
const statePath = path.join(localnetDir, "state.json");
const envPath = path.join(apiDir, ".env.localnet");

const defaults = {
  rpcUrl: "http://127.0.0.1:8899",
  decimals: 6,
  initialCompanyUsdc: 50000,
  payerSol: 20,
  companySol: 5,
  treasurySol: 5,
};

await mkdir(keysDir, { recursive: true });

const baseEnv = await loadEnvFiles(".env", ".env.localnet");
const rpcUrl = process.env.SOLANA_RPC_URL ?? baseEnv.SOLANA_RPC_URL ?? defaults.rpcUrl;
const connection = new Connection(rpcUrl, "confirmed");

const payer = await loadOrCreateKeypair("payer");
const treasury = await loadOrCreateKeypair("treasury");
const company = await loadOrCreateKeypair("company");

await ensureSolBalance(connection, payer, defaults.payerSol);
await ensureSolBalance(connection, company, defaults.companySol);
await ensureSolBalance(connection, treasury, defaults.treasurySol);

let state = await readState();
let mintAuthority = payer;

if (!state.usdcMint) {
  state.usdcMint = (
    await createMint(connection, payer, mintAuthority.publicKey, null, defaults.decimals)
  ).toBase58();
}

const usdcMint = new PublicKey(state.usdcMint);

const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  usdcMint,
  treasury.publicKey,
);
const companyTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  usdcMint,
  company.publicKey,
);

await mintTo(
  connection,
  payer,
  usdcMint,
  companyTokenAccount.address,
  mintAuthority,
  BigInt(Math.round(defaults.initialCompanyUsdc * 10 ** defaults.decimals)),
);

state = {
  usdcMint: state.usdcMint,
  decimals: defaults.decimals,
  treasuryWallet: treasury.publicKey.toBase58(),
  treasuryTokenAccount: treasuryTokenAccount.address.toBase58(),
  companyWallet: company.publicKey.toBase58(),
  companyTokenAccount: companyTokenAccount.address.toBase58(),
  payerWallet: payer.publicKey.toBase58(),
  rpcUrl,
};

await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
await writeFile(
  envPath,
  [
    'SOLANA_CLUSTER="localnet"',
    `SOLANA_RPC_URL="${rpcUrl}"`,
    `SOLANA_USDC_MINT="${state.usdcMint}"`,
    `SOLANA_TREASURY_WALLET="${state.treasuryWallet}"`,
    `DEFAULT_AUTHORIZED_WALLETS="${state.companyWallet}"`,
    'FUNDING_WATCH_ENABLED="true"',
    'FUNDING_WATCH_INTERVAL_MS="3000"',
    'FUNDING_PERSISTENCE_MODE="memory"',
    `LOCALNET_PAYER_KEYPAIR="${path.join(keysDir, "payer.json")}"`,
    `LOCALNET_TREASURY_KEYPAIR="${path.join(keysDir, "treasury.json")}"`,
    `LOCALNET_COMPANY_KEYPAIR="${path.join(keysDir, "company.json")}"`,
    `LOCALNET_COMPANY_TOKEN_ACCOUNT="${state.companyTokenAccount}"`,
    `LOCALNET_TREASURY_TOKEN_ACCOUNT="${state.treasuryTokenAccount}"`,
    `LOCALNET_USDC_MINT="${state.usdcMint}"`,
    'LOCALNET_USDC_DECIMALS="6"',
    'LOCALNET_API_URL="http://localhost:4000"',
    "",
  ].join("\n"),
  "utf8",
);

console.log("Localnet bootstrap completed.");
console.log(`RPC URL: ${rpcUrl}`);
console.log(`USDC mint: ${state.usdcMint}`);
console.log(`Treasury wallet: ${state.treasuryWallet}`);
console.log(`Treasury ATA: ${state.treasuryTokenAccount}`);
console.log(`Authorized company wallet: ${state.companyWallet}`);
console.log(`Company ATA: ${state.companyTokenAccount}`);
console.log(`Wrote env file: ${envPath}`);

async function loadOrCreateKeypair(name) {
  const keypairPath = path.join(keysDir, `${name}.json`);

  try {
    const content = await readFile(keypairPath, "utf8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(content)));
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }

    const keypair = Keypair.generate();
    await writeFile(keypairPath, JSON.stringify(Array.from(keypair.secretKey)), "utf8");
    return keypair;
  }
}

async function ensureSolBalance(connection, keypair, minimumSol) {
  const balance = await connection.getBalance(keypair.publicKey, "confirmed");
  const minimumLamports = minimumSol * LAMPORTS_PER_SOL;

  if (balance >= minimumLamports) {
    return;
  }

  const signature = await connection.requestAirdrop(keypair.publicKey, minimumLamports - balance);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
}

async function readState() {
  try {
    const content = await readFile(statePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}
