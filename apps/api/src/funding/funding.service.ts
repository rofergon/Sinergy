import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { FundingDetectionSource, FundingInstruction, FundingStatus, FundingTransaction, SessionUser } from "@latam-payouts/contracts";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { FundingPersistenceService } from "./funding.persistence.service.js";
import { decimalToRawAmount, determineFundingStatus, evaluateFundingObservation, roundUsdcAmount, type FundingObservation } from "./funding.utils.js";
import { SolanaFundingGateway } from "./solana-funding.gateway.js";

@Injectable()
export class FundingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FundingService.name);
  private readonly pollIntervalMs = Number(process.env.FUNDING_WATCH_INTERVAL_MS ?? 15000);
  private watcher?: NodeJS.Timeout;

  constructor(
    private readonly persistence: FundingPersistenceService,
    private readonly gateway: SolanaFundingGateway,
    private readonly domain: DemoDomainService,
  ) {}

  onModuleInit() {
    if (process.env.FUNDING_WATCH_ENABLED === "false") {
      return;
    }

    this.watcher = setInterval(() => {
      void this.scanPendingInstructions();
    }, this.pollIntervalMs);
    this.watcher.unref?.();
  }

  onModuleDestroy() {
    if (this.watcher) {
      clearInterval(this.watcher);
    }
  }

  async ensureFundingInstruction(user: SessionUser, batchId: string): Promise<FundingInstruction> {
    const existing = await this.persistence.getFundingInstructionByBatchId(batchId);
    if (existing) {
      return existing;
    }

    const batch = this.domain.getBatch(batchId);
    if (!["approved", "awaiting_funding", "funded"].includes(batch.status)) {
      throw new NotFoundException("Batch must be approved before funding instructions can be generated.");
    }

    const draft = this.gateway.buildFundingInstruction(batchId, batch.totalFundingUsdc);
    const instruction = await this.persistence.createFundingInstruction(draft);
    this.domain.markBatchAwaitingFunding(batchId);

    await this.persistence.createAuditLog({
      batchId,
      entityType: "batch",
      entityId: batchId,
      action: "funding.instructions_generated",
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      metadata: {
        fundingInstructionId: instruction.id,
        walletAddress: instruction.walletAddress,
        recipientTokenAccount: instruction.recipientTokenAccount,
        tokenMint: instruction.tokenMint,
        reference: instruction.reference,
        expectedAmount: instruction.expectedAmount,
        cluster: instruction.cluster,
      },
    });

    return instruction;
  }

  async getFundingView(batchId: string): Promise<{ instruction?: FundingInstruction; transactions: FundingTransaction[] }> {
    const instruction = await this.persistence.getFundingInstructionByBatchId(batchId);
    if (!instruction) {
      return { transactions: [] };
    }

    const transactions = await this.persistence.listFundingTransactionsForInstruction(instruction.id);
    return { instruction, transactions };
  }

  async rescanFundingInstruction(user: SessionUser, instructionId: string): Promise<FundingInstruction> {
    const instruction = await this.requireFundingInstruction(instructionId);

    await this.persistence.createAuditLog({
      batchId: instruction.batchId,
      entityType: "funding_instruction",
      entityId: instruction.id,
      action: "funding.rescan_requested",
      actorType: "user",
      actorId: user.id,
      actorName: user.name,
      metadata: { batchId: instruction.batchId, reference: instruction.reference },
    });

    await this.scanInstruction(instruction);
    return (await this.requireFundingInstruction(instructionId)) ?? instruction;
  }

  async recordManualFunding(
    user: SessionUser,
    payload: { fundingInstructionId: string; txHash: string; amountReceived: number; eventId?: string },
    detectionSource: FundingDetectionSource = "manual",
  ): Promise<FundingTransaction> {
    const instruction = await this.requireFundingInstruction(payload.fundingInstructionId);
    const observation: FundingObservation = {
      signature: payload.txHash,
      reference: instruction.reference,
      mint: instruction.tokenMint,
      fromAddress: this.domain.getCompany().authorizedWallets[0],
      toAddress: instruction.recipientTokenAccount,
      amountReceived: payload.amountReceived,
      rawAmount: decimalToRawAmount(payload.amountReceived),
      confirmedAt: new Date().toISOString(),
    };

    return this.applyObservation(instruction, observation, detectionSource, user, payload.eventId);
  }

  async scanPendingInstructions(): Promise<void> {
    const instructions = await this.persistence.listPendingFundingInstructions();
    for (const instruction of instructions) {
      try {
        await this.scanInstruction(instruction);
      } catch (error) {
        this.gateway.logWatcherError(error, instruction.id);
      }
    }
  }

  private async scanInstruction(instruction: FundingInstruction): Promise<void> {
    await this.persistence.markFundingInstructionScanned(instruction.id, new Date().toISOString());
    const observations = await this.gateway.findFundingObservations(
      instruction.reference,
      instruction.tokenMint,
      instruction.recipientTokenAccount,
    );

    for (const observation of observations) {
      await this.applyObservation(instruction, observation, "rpc", this.domain.getDefaultUser(), `solana:${observation.signature}`);
    }
  }

  private async applyObservation(
    instruction: FundingInstruction,
    observation: FundingObservation,
    detectionSource: FundingDetectionSource,
    actor: SessionUser,
    eventId?: string,
  ): Promise<FundingTransaction> {
    const existingTransaction = await this.persistence.getFundingTransactionBySignature(observation.signature);
    if (existingTransaction) {
      return existingTransaction;
    }

    const currentCreditedAmount = await this.persistence.getCreditedFundingAmount(instruction.id);
    const previousStatus = determineFundingStatus(currentCreditedAmount, instruction.expectedAmount);
    const previousSurplus = Math.max(0, roundUsdcAmount(currentCreditedAmount - instruction.expectedAmount));
    const company = this.domain.getCompany();
    const validation = evaluateFundingObservation({
      observation,
      authorizedWallets: company.authorizedWallets,
      expectedReference: instruction.reference,
      expectedMint: instruction.tokenMint,
      expectedDestination: instruction.recipientTokenAccount,
      expectedAmount: instruction.expectedAmount,
      currentCreditedAmount,
    });

    const transaction = await this.persistence.createFundingTransaction({
      fundingInstructionId: instruction.id,
      txHash: observation.signature,
      signature: observation.signature,
      amountReceived: observation.amountReceived,
      status: validation.nextStatus,
      fromAddress: observation.fromAddress,
      toAddress: observation.toAddress,
      rawAmount: observation.rawAmount,
      reconciledAmount: validation.creditedAmount,
      slot: observation.slot,
      confirmedAt: observation.confirmedAt,
      detectionSource,
      eventId,
    });

    await this.persistence.recordWebhookEvent({
      direction: "inbound",
      source: "funding",
      eventId: eventId ?? `funding:${observation.signature}`,
      payload: {
        batchId: instruction.batchId,
        fundingInstructionId: instruction.id,
        signature: observation.signature,
        fromAddress: observation.fromAddress,
        toAddress: observation.toAddress,
        amountReceived: observation.amountReceived,
        status: validation.nextStatus,
        detectionSource,
      },
    });

    if (!validation.accepted) {
      await this.persistence.createOrRefreshException({
        batchId: instruction.batchId,
        type: validation.exceptionType ?? "manual_review",
        summary: validation.summary ?? "Funding validation failed.",
      });

      await this.persistence.createAuditLog({
        batchId: instruction.batchId,
        entityType: "funding_instruction",
        entityId: instruction.id,
        action: "funding.validation_failed",
        actorType: "system",
        actorId: "system",
        actorName: "Funding Watcher",
        metadata: {
          batchId: instruction.batchId,
          signature: observation.signature,
          reason: validation.exceptionType,
          summary: validation.summary,
        },
      });

      return transaction;
    }

    await this.persistence.createLedgerEntry({
      batchId: instruction.batchId,
      type: "funding_received",
      amount: validation.creditedAmount,
      currency: "USDC",
      note: `Funding received via ${observation.signature}`,
    });

    const updatedInstruction = await this.persistence.updateFundingInstructionStatus(instruction.id, {
      status: validation.nextStatus,
      lastScanAt: new Date().toISOString(),
      latestSignature: observation.signature,
    });

    this.domain.applyFundingStatus(instruction.batchId, validation.nextStatus);

    if (validation.nextStatus === "partial") {
      await this.persistence.createOrRefreshException({
        batchId: instruction.batchId,
        type: "funding_incomplete",
        summary: "Funding received is still below the expected batch amount.",
      });
    } else {
      await this.persistence.resolveFundingExceptions(instruction.batchId, "funding_incomplete");
      if (previousStatus !== "reconciled") {
        await this.persistence.createLedgerEntry({
          batchId: instruction.batchId,
          type: "funding_reserved",
          amount: instruction.expectedAmount,
          currency: "USDC",
          note: "Funds reserved for approved batch execution.",
        });
      }
    }

    const surplusDelta = Math.max(0, roundUsdcAmount(validation.surplusAmount - previousSurplus));
    if (surplusDelta > 0) {
      await this.persistence.createLedgerEntry({
        batchId: instruction.batchId,
        type: "funding_surplus",
        amount: surplusDelta,
        currency: "USDC",
        note: "Funding received exceeded the expected amount for this batch.",
      });
    }

    await this.persistence.createAuditLog({
      batchId: instruction.batchId,
      entityType: "funding_instruction",
      entityId: instruction.id,
      action: validation.nextStatus === "reconciled" ? "funding.reconciled" : "funding.partial",
      actorType: detectionSource === "rpc" ? "system" : "user",
      actorId: detectionSource === "rpc" ? "system" : actor.id,
      actorName: detectionSource === "rpc" ? "Funding Watcher" : actor.name,
      metadata: {
        batchId: instruction.batchId,
        signature: observation.signature,
        amountReceived: observation.amountReceived,
        creditedAmount: validation.creditedAmount,
        totalCreditedAmount: validation.nextCreditedAmount,
        expectedAmount: instruction.expectedAmount,
        status: updatedInstruction.status,
      },
    });

    return transaction;
  }

  private async requireFundingInstruction(instructionId: string): Promise<FundingInstruction> {
    const instruction = await this.persistence.getFundingInstructionById(instructionId);
    if (!instruction) {
      throw new NotFoundException(`Funding instruction ${instructionId} not found.`);
    }
    return instruction;
  }
}
