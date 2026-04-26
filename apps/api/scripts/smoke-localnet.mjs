import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createTransferCheckedInstruction } from "@solana/spl-token";
import { apiDir, loadEnvFiles } from "./env-utils.mjs";

const env = {
  ...(await loadEnvFiles(".env", ".env.localnet")),
  ...process.env,
};

const apiUrl = env.LOCALNET_API_URL ?? "http://localhost:4000";
const rpcUrl = env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
const companyKeypairPath = env.LOCALNET_COMPANY_KEYPAIR;
const companyTokenAccount = env.LOCALNET_COMPANY_TOKEN_ACCOUNT;
const treasuryTokenAccount = env.LOCALNET_TREASURY_TOKEN_ACCOUNT;
const mintAddress = env.LOCALNET_USDC_MINT ?? env.SOLANA_USDC_MINT;
const decimals = Number(env.LOCALNET_USDC_DECIMALS ?? 6);

if (!companyKeypairPath || !companyTokenAccount || !treasuryTokenAccount || !mintAddress) {
  console.error("Missing localnet bootstrap variables. Run `pnpm --filter @latam-payouts/api localnet:setup` first.");
  process.exit(1);
}

const companyKeypair = await readKeypair(companyKeypairPath);
const connection = new Connection(rpcUrl, "confirmed");
const mint = new PublicKey(mintAddress);

const session = await request("/auth/login", {
  method: "POST",
  body: { email: "approver@acme-pay.com", password: "demo123" },
});
const financeSession = await request("/auth/login", {
  method: "POST",
  body: { email: "finance@acme-pay.com", password: "demo123" },
});

const beneficiaries = await request("/beneficiaries", {
  token: financeSession.accessToken,
});

const batchDetail = await request("/batches", {
  method: "POST",
  token: financeSession.accessToken,
  body: {
    name: `Localnet smoke ${new Date().toISOString()}`,
    payouts: [
      {
        beneficiaryId: beneficiaries[0].id,
        amountLocal: 1800000,
      },
    ],
  },
});

await request(`/batches/${batchDetail.batch.id}/quote`, {
  method: "POST",
  token: financeSession.accessToken,
});

await request(`/batches/${batchDetail.batch.id}/approve`, {
  method: "POST",
  token: session.accessToken,
  body: { comment: "Approved by localnet smoke test" },
});

const instruction = await request(`/batches/${batchDetail.batch.id}/funding-instructions`, {
  token: financeSession.accessToken,
});

const signature = await sendUsdcWithReference({
  connection,
  companyKeypair,
  sourceTokenAccount: new PublicKey(companyTokenAccount),
  destinationTokenAccount: new PublicKey(treasuryTokenAccount),
  mint,
  amount: instruction.expectedAmount,
  decimals,
  reference: new PublicKey(instruction.reference),
});

await request(`/funding/instructions/${instruction.id}/rescan`, {
  method: "POST",
  token: financeSession.accessToken,
});

const reconciledBatch = await request(`/batches/${batchDetail.batch.id}`, {
  token: financeSession.accessToken,
});

if (reconciledBatch.batch.status !== "funded" || reconciledBatch.fundingInstruction?.status !== "reconciled") {
  console.error("Smoke test failed: batch was not reconciled.");
  console.error(JSON.stringify(reconciledBatch, null, 2));
  process.exit(1);
}

console.log("Localnet smoke test passed.");
console.log(`Batch ID: ${reconciledBatch.batch.id}`);
console.log(`Funding instruction: ${instruction.id}`);
console.log(`Transfer signature: ${signature}`);

async function sendUsdcWithReference({
  connection,
  companyKeypair,
  sourceTokenAccount,
  destinationTokenAccount,
  mint,
  amount,
  decimals,
  reference,
}) {
  const rawAmount = BigInt(Math.round(amount * 10 ** decimals));
  const transferInstruction = createTransferCheckedInstruction(
    sourceTokenAccount,
    mint,
    destinationTokenAccount,
    companyKeypair.publicKey,
    rawAmount,
    decimals,
  );
  transferInstruction.keys.push({
    pubkey: reference,
    isSigner: false,
    isWritable: false,
  });

  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: companyKeypair.publicKey,
    recentBlockhash: blockhash,
  }).add(transferInstruction);

  return sendAndConfirmTransaction(connection, transaction, [companyKeypair], {
    commitment: "confirmed",
  });
}

async function readKeypair(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(apiDir, filePath);
  const content = await readFile(absolutePath, "utf8");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(content)));
}

async function request(route, options = {}) {
  const response = await fetch(`${apiUrl}${route}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed for ${route}: ${body}`);
  }

  return response.json();
}
