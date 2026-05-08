import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { apiDir, loadEnvFiles } from "./env-utils.mjs";
import { loadKeypairFromEnv, readPublicKeyFromEnv, writeKeypair } from "./keypair-utils.mjs";

const testnetDir = path.join(apiDir, ".testnet");
const keysDir = path.join(testnetDir, "keys");
const statePath = path.join(testnetDir, "state.json");
const envPath = path.join(apiDir, ".env.testnet");

const defaults = {
  rpcUrl: "https://api.testnet.solana.com",
  decimals: 6,
  initialCompanyUsdc: 50000,
  minimumDeployerSol: 1,
};

await mkdir(keysDir, { recursive: true });

const env = {
  ...(await loadEnvFiles(".env", ".env.testnet")),
  ...process.env,
};

const rpcUrl = env.SOLANA_RPC_URL ?? defaults.rpcUrl;
const connection = new Connection(rpcUrl, "confirmed");
const deployer = await loadKeypairFromEnv(env, "TESTNET_DEPLOYER_KEYPAIR", "SOLANA_DEPLOYER_KEYPAIR", "SOLANA_PRIVATE_KEY");
const treasury = await loadOrCreateKeypair("treasury", env.TESTNET_TREASURY_KEYPAIR);
const configuredCompanyWallet = readPublicKeyFromEnv(env, "TESTNET_COMPANY_WALLET", "SOLANA_COMPANY_WALLET");
const generatedCompany = configuredCompanyWallet ? undefined : await loadOrCreateKeypair("company", env.TESTNET_COMPANY_KEYPAIR);
const companyWallet = configuredCompanyWallet ?? generatedCompany.publicKey;

await ensureSolBalance(connection, deployer, defaults.minimumDeployerSol);

let state = await readState();
if (!state.usdcMint && env.SOLANA_USDC_MINT) {
  state.usdcMint = env.SOLANA_USDC_MINT;
}

if (!state.usdcMint) {
  state.usdcMint = (
    await createMint(connection, deployer, deployer.publicKey, null, defaults.decimals)
  ).toBase58();
}

const usdcMint = new PublicKey(state.usdcMint);
const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(connection, deployer, usdcMint, treasury.publicKey);
const companyTokenAccount = await getOrCreateAssociatedTokenAccount(connection, deployer, usdcMint, companyWallet);

await mintTo(
  connection,
  deployer,
  usdcMint,
  companyTokenAccount.address,
  deployer,
  BigInt(Math.round(defaults.initialCompanyUsdc * 10 ** defaults.decimals)),
);

state = {
  usdcMint: state.usdcMint,
  decimals: defaults.decimals,
  treasuryWallet: treasury.publicKey.toBase58(),
  treasuryTokenAccount: treasuryTokenAccount.address.toBase58(),
  companyWallet: companyWallet.toBase58(),
  companyTokenAccount: companyTokenAccount.address.toBase58(),
  deployerWallet: deployer.publicKey.toBase58(),
  rpcUrl,
};

await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
await writeFile(
  envPath,
  [
    'SOLANA_CLUSTER="testnet"',
    `SOLANA_RPC_URL="${rpcUrl}"`,
    `SOLANA_USDC_MINT="${state.usdcMint}"`,
    `SOLANA_TREASURY_WALLET="${state.treasuryWallet}"`,
    `DEFAULT_AUTHORIZED_WALLETS="${state.companyWallet}"`,
    'FUNDING_WATCH_ENABLED="true"',
    'FUNDING_WATCH_INTERVAL_MS="3000"',
    'FUNDING_PERSISTENCE_MODE="memory"',
    `TESTNET_DEPLOYER_WALLET="${state.deployerWallet}"`,
    `TESTNET_TREASURY_KEYPAIR="${path.join(keysDir, "treasury.json")}"`,
    generatedCompany ? `TESTNET_COMPANY_KEYPAIR="${path.join(keysDir, "company.json")}"` : `TESTNET_COMPANY_WALLET="${state.companyWallet}"`,
    `TESTNET_COMPANY_TOKEN_ACCOUNT="${state.companyTokenAccount}"`,
    `TESTNET_TREASURY_TOKEN_ACCOUNT="${state.treasuryTokenAccount}"`,
    `TESTNET_USDC_MINT="${state.usdcMint}"`,
    'TESTNET_USDC_DECIMALS="6"',
    'TESTNET_API_URL="http://localhost:4000"',
    "",
  ].join("\n"),
  "utf8",
);

console.log("Testnet bootstrap completed.");
console.log(`RPC URL: ${rpcUrl}`);
console.log(`Mock USDC mint: ${state.usdcMint}`);
console.log(`Treasury wallet: ${state.treasuryWallet}`);
console.log(`Treasury ATA: ${state.treasuryTokenAccount}`);
console.log(`Authorized company wallet: ${state.companyWallet}`);
console.log(`Company ATA: ${state.companyTokenAccount}`);
console.log(`Wrote env file: ${envPath}`);

async function loadOrCreateKeypair(name, configuredPath) {
  if (configuredPath) {
    return loadKeypairFromEnv({ [`${name.toUpperCase()}_KEYPAIR`]: configuredPath }, `${name.toUpperCase()}_KEYPAIR`);
  }

  const keypairPath = path.join(keysDir, `${name}.json`);
  try {
    const content = await readFile(keypairPath, "utf8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(content)));
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }

    const keypair = Keypair.generate();
    await writeKeypair(keypairPath, keypair);
    return keypair;
  }
}

async function ensureSolBalance(connection, keypair, minimumSol) {
  const balance = await connection.getBalance(keypair.publicKey, "confirmed");
  const minimumLamports = minimumSol * LAMPORTS_PER_SOL;
  if (balance >= minimumLamports || env.TESTNET_SKIP_AIRDROP === "true") {
    return;
  }

  try {
    const signature = await connection.requestAirdrop(keypair.publicKey, minimumLamports - balance);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  } catch (error) {
    console.warn("Testnet airdrop failed. Fund the deployer wallet with testnet SOL and run this script again.");
    throw error;
  }
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
