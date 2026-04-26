import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AuditLog,
  ExceptionCase,
  FundingDetectionSource,
  FundingInstruction,
  FundingStatus,
  FundingTransaction,
  LedgerEntry,
} from "@latam-payouts/contracts";
import { PrismaService } from "../prisma/prisma.service.js";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class FundingPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getFundingInstructionByBatchId(batchId: string): Promise<FundingInstruction | undefined> {
    const record = await this.prisma.fundingInstruction.findFirst({
      where: { batchId },
      orderBy: { createdAt: "desc" },
    });
    return record ? this.mapFundingInstruction(record) : undefined;
  }

  async getFundingInstructionById(id: string): Promise<FundingInstruction | undefined> {
    const record = await this.prisma.fundingInstruction.findUnique({ where: { id } });
    return record ? this.mapFundingInstruction(record) : undefined;
  }

  async createFundingInstruction(input: Omit<FundingInstruction, "id" | "lastScanAt" | "latestSignature">): Promise<FundingInstruction> {
    const record = await this.prisma.fundingInstruction.create({
      data: {
        batchId: input.batchId,
        chain: input.chain,
        cluster: input.cluster,
        asset: input.asset,
        walletAddress: input.walletAddress,
        recipientAddress: input.recipientAddress,
        recipientTokenAccount: input.recipientTokenAccount,
        tokenMint: input.tokenMint,
        reference: input.reference,
        expectedAmount: new Prisma.Decimal(input.expectedAmount),
        memo: input.memo,
        status: input.status,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    return this.mapFundingInstruction(record);
  }

  async updateFundingInstructionStatus(
    instructionId: string,
    input: { status: FundingStatus; lastScanAt?: string; latestSignature?: string },
  ): Promise<FundingInstruction> {
    const record = await this.prisma.fundingInstruction.update({
      where: { id: instructionId },
      data: {
        status: input.status,
        lastScanAt: input.lastScanAt ? new Date(input.lastScanAt) : undefined,
        latestSignature: input.latestSignature,
      },
    });

    return this.mapFundingInstruction(record);
  }

  async markFundingInstructionScanned(instructionId: string, lastScanAt: string): Promise<void> {
    await this.prisma.fundingInstruction.update({
      where: { id: instructionId },
      data: { lastScanAt: new Date(lastScanAt) },
    });
  }

  async listPendingFundingInstructions(): Promise<FundingInstruction[]> {
    const records = await this.prisma.fundingInstruction.findMany({
      where: { status: { in: ["pending", "partial"] } },
      orderBy: { createdAt: "asc" },
    });

    return records.map((record) => this.mapFundingInstruction(record));
  }

  async listFundingTransactionsForInstruction(fundingInstructionId: string): Promise<FundingTransaction[]> {
    const records = await this.prisma.fundingTransaction.findMany({
      where: { fundingInstructionId },
      orderBy: { createdAt: "asc" },
    });

    return records.map((record) => this.mapFundingTransaction(record));
  }

  async getFundingTransactionBySignature(signature: string): Promise<FundingTransaction | undefined> {
    const record = await this.prisma.fundingTransaction.findUnique({ where: { signature } });
    return record ? this.mapFundingTransaction(record) : undefined;
  }

  async createFundingTransaction(input: {
    fundingInstructionId: string;
    txHash: string;
    signature: string;
    amountReceived: number;
    status: FundingStatus;
    fromAddress?: string;
    toAddress: string;
    rawAmount: string;
    reconciledAmount: number;
    slot?: number;
    confirmedAt?: string;
    detectionSource: FundingDetectionSource;
    eventId?: string;
  }): Promise<FundingTransaction> {
    const record = await this.prisma.fundingTransaction.create({
      data: {
        fundingInstructionId: input.fundingInstructionId,
        txHash: input.txHash,
        signature: input.signature,
        amountReceived: new Prisma.Decimal(input.amountReceived),
        status: input.status,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        rawAmount: input.rawAmount,
        reconciledAmount: new Prisma.Decimal(input.reconciledAmount),
        slot: input.slot ? BigInt(input.slot) : null,
        confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : null,
        detectionSource: input.detectionSource,
        eventId: input.eventId,
      },
    });

    return this.mapFundingTransaction(record);
  }

  async getCreditedFundingAmount(fundingInstructionId: string): Promise<number> {
    const aggregate = await this.prisma.fundingTransaction.aggregate({
      where: { fundingInstructionId },
      _sum: { reconciledAmount: true },
    });

    return Number(aggregate._sum.reconciledAmount ?? 0);
  }

  async createLedgerEntry(input: Omit<LedgerEntry, "id" | "createdAt">): Promise<LedgerEntry> {
    const record = await this.prisma.ledgerEntry.create({
      data: {
        batchId: input.batchId,
        payoutId: input.payoutId,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        note: input.note,
      },
    });

    return {
      id: record.id,
      batchId: record.batchId ?? undefined,
      payoutId: record.payoutId ?? undefined,
      type: input.type,
      amount: Number(record.amount),
      currency: input.currency,
      note: record.note,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async createAuditLog(input: Omit<AuditLog, "id" | "createdAt"> & { batchId?: string }): Promise<AuditLog> {
    const record = await this.prisma.auditLog.create({
      data: {
        batchId: input.batchId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorType: input.actorType,
        actorId: input.actorId,
        actorName: input.actorName,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return this.mapAuditLog(record);
  }

  async listAuditLogs(filter?: { entityType?: string; entityId?: string; batchId?: string }): Promise<AuditLog[]> {
    const records = await this.prisma.auditLog.findMany({
      where: {
        ...(filter?.entityType ? { entityType: filter.entityType } : {}),
        ...(filter?.entityId
          ? {
              OR: [{ entityId: filter.entityId }, { batchId: filter.entityId }],
            }
          : {}),
        ...(filter?.batchId ? { batchId: filter.batchId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => this.mapAuditLog(record));
  }

  async createOrRefreshException(input: Omit<ExceptionCase, "id" | "status" | "createdAt">): Promise<ExceptionCase> {
    const existing = await this.prisma.exceptionCase.findFirst({
      where: {
        batchId: input.batchId,
        payoutId: input.payoutId,
        type: input.type,
        status: "open",
      },
    });

    if (existing) {
      const record = await this.prisma.exceptionCase.update({
        where: { id: existing.id },
        data: {
          summary: input.summary,
          country: input.country,
          resolvedAt: null,
        },
      });
      return this.mapExceptionCase(record);
    }

    const record = await this.prisma.exceptionCase.create({
      data: {
        batchId: input.batchId,
        payoutId: input.payoutId,
        type: input.type,
        country: input.country,
        status: "open",
        summary: input.summary,
      },
    });

    return this.mapExceptionCase(record);
  }

  async resolveFundingExceptions(batchId: string, type: ExceptionCase["type"]): Promise<void> {
    await this.prisma.exceptionCase.updateMany({
      where: { batchId, type, status: "open" },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
      },
    });
  }

  async listExceptions(): Promise<ExceptionCase[]> {
    const records = await this.prisma.exceptionCase.findMany({ orderBy: { createdAt: "desc" } });
    return records.map((record) => this.mapExceptionCase(record));
  }

  async resolveException(id: string): Promise<ExceptionCase | undefined> {
    const record = await this.prisma.exceptionCase.findUnique({ where: { id } });
    if (!record) {
      return undefined;
    }

    const updated = await this.prisma.exceptionCase.update({
      where: { id },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
      },
    });

    return this.mapExceptionCase(updated);
  }

  async recordWebhookEvent(input: { direction: "inbound" | "outbound"; source: "funding" | "partner" | "client"; eventId: string; payload: JsonRecord }) {
    await this.prisma.webhookEvent.upsert({
      where: { eventId: input.eventId },
      update: { payload: input.payload as Prisma.InputJsonValue },
      create: {
        direction: input.direction,
        source: input.source,
        eventId: input.eventId,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
  }

  private mapFundingInstruction(record: {
    id: string;
    batchId: string;
    chain: string;
    cluster: string;
    asset: string;
    walletAddress: string;
    recipientAddress: string;
    recipientTokenAccount: string;
    tokenMint: string;
    reference: string;
    expectedAmount: Prisma.Decimal;
    memo: string | null;
    status: string;
    expiresAt: Date | null;
    lastScanAt: Date | null;
    latestSignature: string | null;
  }): FundingInstruction {
    return {
      id: record.id,
      batchId: record.batchId,
      chain: "solana",
      cluster: record.cluster as FundingInstruction["cluster"],
      asset: "USDC",
      walletAddress: record.walletAddress,
      recipientAddress: record.recipientAddress,
      recipientTokenAccount: record.recipientTokenAccount,
      tokenMint: record.tokenMint,
      reference: record.reference,
      expectedAmount: Number(record.expectedAmount),
      memo: record.memo ?? undefined,
      status: record.status as FundingStatus,
      expiresAt: record.expiresAt?.toISOString(),
      lastScanAt: record.lastScanAt?.toISOString(),
      latestSignature: record.latestSignature ?? undefined,
    };
  }

  private mapFundingTransaction(record: {
    id: string;
    fundingInstructionId: string;
    txHash: string;
    signature: string;
    amountReceived: Prisma.Decimal;
    status: string;
    fromAddress: string | null;
    toAddress: string;
    rawAmount: string;
    reconciledAmount: Prisma.Decimal;
    slot: bigint | null;
    confirmedAt: Date | null;
    detectionSource: string;
    createdAt: Date;
  }): FundingTransaction {
    return {
      id: record.id,
      fundingInstructionId: record.fundingInstructionId,
      txHash: record.txHash,
      signature: record.signature,
      amountReceived: Number(record.amountReceived),
      status: record.status as FundingStatus,
      fromAddress: record.fromAddress ?? undefined,
      toAddress: record.toAddress,
      rawAmount: record.rawAmount,
      reconciledAmount: Number(record.reconciledAmount),
      slot: record.slot ? Number(record.slot) : undefined,
      confirmedAt: record.confirmedAt?.toISOString(),
      detectionSource: record.detectionSource as FundingDetectionSource,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private mapAuditLog(record: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    actorType: string;
    actorId: string;
    actorName: string;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }): AuditLog {
    return {
      id: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      action: record.action,
      actorType: record.actorType as AuditLog["actorType"],
      actorId: record.actorId,
      actorName: record.actorName,
      metadata: (record.metadata as JsonRecord | null) ?? undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private mapExceptionCase(record: {
    id: string;
    batchId: string | null;
    payoutId: string | null;
    type: string;
    country: string | null;
    status: string;
    summary: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }): ExceptionCase {
    return {
      id: record.id,
      batchId: record.batchId ?? undefined,
      payoutId: record.payoutId ?? undefined,
      type: record.type as ExceptionCase["type"],
      country: record.country as ExceptionCase["country"],
      status: record.status as ExceptionCase["status"],
      summary: record.summary,
      createdAt: record.createdAt.toISOString(),
      resolvedAt: record.resolvedAt?.toISOString(),
    };
  }
}
