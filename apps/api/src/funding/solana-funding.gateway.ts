import { Injectable, Logger } from "@nestjs/common";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, type ParsedMessageAccount, type ParsedTransactionWithMeta } from "@solana/web3.js";
import type { FundingCluster } from "@latam-payouts/contracts";
import { generateFundingReference, type FundingObservation, USDC_DECIMALS } from "./funding.utils.js";

type AccountKeyLike = ParsedMessageAccount | PublicKey | string;

@Injectable()
export class SolanaFundingGateway {
  private readonly logger = new Logger(SolanaFundingGateway.name);
  private readonly connection = new Connection(this.getRpcUrl(), "confirmed");

  getCluster(): FundingCluster {
    const configuredCluster = (process.env.SOLANA_CLUSTER ?? "testnet") as FundingCluster;
    return configuredCluster;
  }

  getRpcUrl(): string {
    return process.env.SOLANA_RPC_URL ?? "https://api.testnet.solana.com";
  }

  getTokenMint(): string {
    return process.env.SOLANA_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
  }

  getTreasuryWalletAddress(): string {
    return process.env.SOLANA_TREASURY_WALLET ?? "89gXyfcgXF4WUmz88W9dqdQbRbgCXTFtcE2USBHvmwAL";
  }

  getTreasuryTokenAccount(): string {
    const mint = new PublicKey(this.getTokenMint());
    const owner = new PublicKey(this.getTreasuryWalletAddress());
    return getAssociatedTokenAddressSync(mint, owner, true).toBase58();
  }

  buildFundingInstruction(batchId: string, expectedAmount: number) {
    const reference = generateFundingReference();
    const walletAddress = this.getTreasuryWalletAddress();
    const recipientTokenAccount = this.getTreasuryTokenAccount();

    return {
      batchId,
      chain: "solana" as const,
      cluster: this.getCluster(),
      asset: "USDC" as const,
      walletAddress,
      recipientAddress: walletAddress,
      recipientTokenAccount,
      tokenMint: this.getTokenMint(),
      reference,
      expectedAmount,
      memo: `batch:${batchId.slice(0, 8)}`,
      status: "pending" as const,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async findFundingObservations(reference: string, tokenMint: string, recipientTokenAccount: string): Promise<FundingObservation[]> {
    const referenceKey = new PublicKey(reference);
    const signatures = await this.connection.getSignaturesForAddress(referenceKey, { limit: 25 }, "confirmed");
    const observations: FundingObservation[] = [];

    for (const entry of signatures) {
      const transaction = await this.connection.getParsedTransaction(entry.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      const observation = this.extractObservation(transaction, entry.signature, reference, tokenMint, recipientTokenAccount);
      if (observation) {
        observations.push(observation);
      }
    }

    return observations.sort((left, right) => (left.slot ?? 0) - (right.slot ?? 0));
  }

  private extractObservation(
    transaction: ParsedTransactionWithMeta | null,
    signature: string,
    reference: string,
    tokenMint: string,
    recipientTokenAccount: string,
  ): FundingObservation | null {
    if (!transaction?.meta) {
      return null;
    }

    const preTokenBalances = transaction.meta.preTokenBalances ?? [];
    const postTokenBalances = transaction.meta.postTokenBalances ?? [];
    const recipientPost = postTokenBalances.find(
      (balance) => this.resolveAccountKey(transaction, balance.accountIndex) === recipientTokenAccount && balance.mint === tokenMint,
    );
    const recipientPre = preTokenBalances.find(
      (balance) => this.resolveAccountKey(transaction, balance.accountIndex) === recipientTokenAccount && balance.mint === tokenMint,
    );

    if (!recipientPost && !recipientPre) {
      return null;
    }

    const decimals = recipientPost?.uiTokenAmount.decimals ?? recipientPre?.uiTokenAmount.decimals ?? USDC_DECIMALS;
    const rawPostAmount = BigInt(recipientPost?.uiTokenAmount.amount ?? "0");
    const rawPreAmount = BigInt(recipientPre?.uiTokenAmount.amount ?? "0");
    const rawAmount = rawPostAmount - rawPreAmount;

    if (rawAmount <= 0n) {
      return null;
    }

    const sourceBalance = this.findSourceBalance(transaction, tokenMint);
    const confirmedAt = transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : undefined;

    return {
      signature,
      reference,
      mint: tokenMint,
      fromAddress: sourceBalance?.owner ?? this.findFeePayer(transaction),
      toAddress: recipientTokenAccount,
      amountReceived: Number(rawAmount) / 10 ** decimals,
      rawAmount: rawAmount.toString(),
      slot: transaction.slot,
      confirmedAt,
    };
  }

  private findSourceBalance(transaction: ParsedTransactionWithMeta, tokenMint: string) {
    const preTokenBalances = transaction.meta?.preTokenBalances ?? [];
    const postTokenBalances = transaction.meta?.postTokenBalances ?? [];
    const negativeBalances = preTokenBalances
      .map((preBalance) => {
        const postBalance = postTokenBalances.find(
          (candidate) => candidate.accountIndex === preBalance.accountIndex && candidate.mint === preBalance.mint,
        );
        const rawPre = BigInt(preBalance.uiTokenAmount.amount);
        const rawPost = BigInt(postBalance?.uiTokenAmount.amount ?? "0");
        return {
          mint: preBalance.mint,
          owner: preBalance.owner,
          rawDelta: rawPost - rawPre,
        };
      })
      .filter((balance) => balance.mint === tokenMint && balance.rawDelta < 0n);

    return negativeBalances[0];
  }

  private findFeePayer(transaction: ParsedTransactionWithMeta): string | undefined {
    const signer = transaction.transaction.message.accountKeys.find((accountKey) => this.isSignerAccount(accountKey));
    return signer ? this.accountKeyToString(signer) : undefined;
  }

  private resolveAccountKey(transaction: ParsedTransactionWithMeta, index: number): string {
    return this.accountKeyToString(transaction.transaction.message.accountKeys[index]);
  }

  private isSignerAccount(accountKey: AccountKeyLike): boolean {
    return typeof accountKey === "object" && accountKey !== null && "signer" in accountKey && Boolean(accountKey.signer);
  }

  private accountKeyToString(accountKey: AccountKeyLike): string {
    if (typeof accountKey === "string") {
      return accountKey;
    }

    if ("pubkey" in accountKey) {
      return typeof accountKey.pubkey === "string" ? accountKey.pubkey : accountKey.pubkey.toBase58();
    }

    return accountKey.toBase58();
  }

  logWatcherError(error: unknown, instructionId: string) {
    const message = error instanceof Error ? error.message : "Unknown Solana funding watcher error.";
    this.logger.error(`Failed to scan funding instruction ${instructionId}: ${message}`);
  }
}
