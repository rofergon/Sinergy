import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  AuditLog,
  ExceptionCase,
  FundingDetectionSource,
  FundingInstruction,
  FundingStatus,
  FundingTransaction,
  LedgerEntry,
} from "@latam-payouts/contracts";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class MemoryFundingPersistenceService {
  private fundingInstructions: FundingInstruction[] = [];
  private fundingTransactions: FundingTransaction[] = [];
  private ledgerEntries: LedgerEntry[] = [];
  private auditLogs: AuditLog[] = [];
  private exceptions: ExceptionCase[] = [];
  private webhookEvents = new Map<string, JsonRecord>();

  async getFundingInstructionByBatchId(batchId: string): Promise<FundingInstruction | undefined> {
    return this.fundingInstructions.find((record) => record.batchId === batchId);
  }

  async getFundingInstructionById(id: string): Promise<FundingInstruction | undefined> {
    return this.fundingInstructions.find((record) => record.id === id);
  }

  async createFundingInstruction(input: Omit<FundingInstruction, "id" | "lastScanAt" | "latestSignature">): Promise<FundingInstruction> {
    const instruction: FundingInstruction = {
      ...input,
      id: randomUUID(),
    };

    this.fundingInstructions = [instruction, ...this.fundingInstructions];
    return instruction;
  }

  async updateFundingInstructionStatus(
    instructionId: string,
    input: { status: FundingStatus; lastScanAt?: string; latestSignature?: string },
  ): Promise<FundingInstruction> {
    const existing = await this.getFundingInstructionById(instructionId);
    if (!existing) {
      throw new Error(`Funding instruction ${instructionId} not found.`);
    }

    const updated: FundingInstruction = {
      ...existing,
      status: input.status,
      lastScanAt: input.lastScanAt ?? existing.lastScanAt,
      latestSignature: input.latestSignature ?? existing.latestSignature,
    };

    this.fundingInstructions = this.fundingInstructions.map((record) => (record.id === instructionId ? updated : record));
    return updated;
  }

  async markFundingInstructionScanned(instructionId: string, lastScanAt: string): Promise<void> {
    await this.updateFundingInstructionStatus(instructionId, {
      status: (await this.getFundingInstructionById(instructionId))?.status ?? "pending",
      lastScanAt,
    });
  }

  async listPendingFundingInstructions(): Promise<FundingInstruction[]> {
    return this.fundingInstructions.filter((record) => ["pending", "partial"].includes(record.status));
  }

  async listFundingTransactionsForInstruction(fundingInstructionId: string): Promise<FundingTransaction[]> {
    return this.fundingTransactions
      .filter((record) => record.fundingInstructionId === fundingInstructionId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async getFundingTransactionBySignature(signature: string): Promise<FundingTransaction | undefined> {
    return this.fundingTransactions.find((record) => record.signature === signature);
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
    const transaction: FundingTransaction = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.fundingTransactions = [transaction, ...this.fundingTransactions];
    return transaction;
  }

  async getCreditedFundingAmount(fundingInstructionId: string): Promise<number> {
    return this.fundingTransactions
      .filter((record) => record.fundingInstructionId === fundingInstructionId)
      .reduce((sum, record) => sum + record.reconciledAmount, 0);
  }

  async createLedgerEntry(input: Omit<LedgerEntry, "id" | "createdAt">): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.ledgerEntries = [entry, ...this.ledgerEntries];
    return entry;
  }

  async createAuditLog(input: Omit<AuditLog, "id" | "createdAt"> & { batchId?: string }): Promise<AuditLog> {
    const auditLog: AuditLog = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.auditLogs = [auditLog, ...this.auditLogs];
    return auditLog;
  }

  async listAuditLogs(filter?: { entityType?: string; entityId?: string; batchId?: string }): Promise<AuditLog[]> {
    return this.auditLogs.filter((record) => {
      if (filter?.entityType && record.entityType !== filter.entityType) {
        return false;
      }

      if (
        filter?.entityId &&
        record.entityId !== filter.entityId &&
        record.metadata?.batchId !== filter.entityId
      ) {
        return false;
      }

      if (filter?.batchId && record.metadata?.batchId !== filter.batchId) {
        return false;
      }

      return true;
    });
  }

  async createOrRefreshException(input: Omit<ExceptionCase, "id" | "status" | "createdAt">): Promise<ExceptionCase> {
    const existing = this.exceptions.find(
      (record) =>
        record.batchId === input.batchId &&
        record.payoutId === input.payoutId &&
        record.type === input.type &&
        record.status === "open",
    );

    if (existing) {
      const updated: ExceptionCase = {
        ...existing,
        summary: input.summary,
        country: input.country,
        resolvedAt: undefined,
      };
      this.exceptions = this.exceptions.map((record) => (record.id === existing.id ? updated : record));
      return updated;
    }

    const exception: ExceptionCase = {
      ...input,
      id: randomUUID(),
      status: "open",
      createdAt: new Date().toISOString(),
    };

    this.exceptions = [exception, ...this.exceptions];
    return exception;
  }

  async resolveFundingExceptions(batchId: string, type: ExceptionCase["type"]): Promise<void> {
    this.exceptions = this.exceptions.map((record) =>
      record.batchId === batchId && record.type === type && record.status === "open"
        ? { ...record, status: "resolved", resolvedAt: new Date().toISOString() }
        : record,
    );
  }

  async listExceptions(): Promise<ExceptionCase[]> {
    return this.exceptions;
  }

  async resolveException(id: string): Promise<ExceptionCase | undefined> {
    const existing = this.exceptions.find((record) => record.id === id);
    if (!existing) {
      return undefined;
    }

    const updated: ExceptionCase = {
      ...existing,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
    };
    this.exceptions = this.exceptions.map((record) => (record.id === id ? updated : record));
    return updated;
  }

  async recordWebhookEvent(input: {
    direction: "inbound" | "outbound";
    source: "funding" | "partner" | "client";
    eventId: string;
    payload: JsonRecord;
  }) {
    this.webhookEvents.set(input.eventId, input.payload);
  }
}
