import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditLog, ExceptionCase, FundingInstruction, FundingTransaction, LedgerEntry, SessionUser } from "@latam-payouts/contracts";
import { FundingService } from "./funding.service.js";

class FakeFundingPersistence {
  instruction: FundingInstruction;
  transactions: FundingTransaction[] = [];
  exceptions: ExceptionCase[] = [];
  ledgerEntries: LedgerEntry[] = [];
  auditLogs: AuditLog[] = [];
  scanMarks: string[] = [];

  constructor(instruction: FundingInstruction) {
    this.instruction = instruction;
  }

  async getFundingInstructionByBatchId() {
    return this.instruction;
  }

  async getFundingInstructionById() {
    return this.instruction;
  }

  async createFundingInstruction() {
    return this.instruction;
  }

  async updateFundingInstructionStatus(
    _instructionId: string,
    input: { status: FundingInstruction["status"]; lastScanAt?: string; latestSignature?: string },
  ) {
    this.instruction = {
      ...this.instruction,
      status: input.status,
      lastScanAt: input.lastScanAt ?? this.instruction.lastScanAt,
      latestSignature: input.latestSignature ?? this.instruction.latestSignature,
    };

    return this.instruction;
  }

  async markFundingInstructionScanned(_instructionId: string, lastScanAt: string) {
    this.scanMarks.push(lastScanAt);
    this.instruction = { ...this.instruction, lastScanAt };
  }

  async listPendingFundingInstructions() {
    return [this.instruction];
  }

  async listFundingTransactionsForInstruction() {
    return this.transactions;
  }

  async getFundingTransactionBySignature(signature: string) {
    return this.transactions.find((transaction) => transaction.signature === signature);
  }

  async createFundingTransaction(input: Omit<FundingTransaction, "id" | "createdAt">) {
    const transaction: FundingTransaction = {
      ...input,
      id: `tx-${this.transactions.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    this.transactions.push(transaction);
    return transaction;
  }

  async getCreditedFundingAmount() {
    return this.transactions.reduce((sum, transaction) => sum + transaction.reconciledAmount, 0);
  }

  async createLedgerEntry(input: Omit<LedgerEntry, "id" | "createdAt">) {
    const ledgerEntry: LedgerEntry = {
      ...input,
      id: `ledger-${this.ledgerEntries.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    this.ledgerEntries.push(ledgerEntry);
    return ledgerEntry;
  }

  async createAuditLog(input: Omit<AuditLog, "id" | "createdAt"> & { batchId?: string }) {
    const auditLog: AuditLog = {
      ...input,
      metadata: input.metadata,
      id: `audit-${this.auditLogs.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.push(auditLog);
    return auditLog;
  }

  async listAuditLogs() {
    return this.auditLogs;
  }

  async createOrRefreshException(input: Omit<ExceptionCase, "id" | "status" | "createdAt">) {
    const exception: ExceptionCase = {
      ...input,
      id: `exception-${this.exceptions.length + 1}`,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    this.exceptions.push(exception);
    return exception;
  }

  async resolveFundingExceptions(batchId: string, type: ExceptionCase["type"]) {
    this.exceptions = this.exceptions.map((exception) =>
      exception.batchId === batchId && exception.type === type
        ? { ...exception, status: "resolved", resolvedAt: new Date().toISOString() }
        : exception,
    );
  }

  async listExceptions() {
    return this.exceptions;
  }

  async resolveException() {
    return undefined;
  }

  async recordWebhookEvent() {
    return;
  }
}

describe("FundingService", () => {
  const actor: SessionUser = {
    id: "user_finance",
    companyId: "company_acme",
    email: "finance@example.com",
    name: "Finance Ops",
    role: "finance_operator",
  };

  let persistence: FakeFundingPersistence;
  let domain: any;
  let gateway: any;

  beforeEach(() => {
    const instruction: FundingInstruction = {
      id: "instruction-1",
      batchId: "batch-1",
      chain: "solana",
      cluster: "devnet",
      asset: "USDC",
      walletAddress: "treasury-wallet",
      recipientAddress: "treasury-wallet",
      recipientTokenAccount: "treasury-ata",
      tokenMint: "usdc-mint",
      reference: "ref-1",
      expectedAmount: 100,
      memo: "batch:batch-1",
      status: "pending",
    };

    persistence = new FakeFundingPersistence(instruction);
    domain = {
      getCompany: vi.fn(() => ({ authorizedWallets: ["wallet-1"] })),
      getDefaultUser: vi.fn(() => actor),
      applyFundingStatus: vi.fn(),
      autoDispatchFundedPayouts: vi.fn(),
      getBatch: vi.fn(() => ({ id: "batch-1", totalFundingUsdc: 100, status: "approved" })),
      markBatchAwaitingFunding: vi.fn(),
    };
    gateway = {
      findFundingObservations: vi.fn(),
      logWatcherError: vi.fn(),
      buildFundingInstruction: vi.fn(),
    };
  });

  it("reconciles a valid rpc funding observation", async () => {
    gateway.findFundingObservations.mockResolvedValue([
      {
        signature: "sig-valid",
        reference: "ref-1",
        mint: "usdc-mint",
        fromAddress: "wallet-1",
        toAddress: "treasury-ata",
        amountReceived: 100,
        rawAmount: "100000000",
        slot: 10,
        confirmedAt: new Date().toISOString(),
      },
    ]);

    const service = new FundingService(persistence as never, gateway as never, domain as never);
    await service.rescanFundingInstruction(actor, "instruction-1");

    expect(persistence.transactions).toHaveLength(1);
    expect(persistence.transactions[0]?.reconciledAmount).toBe(100);
    expect(persistence.instruction.status).toBe("reconciled");
    expect(persistence.instruction.latestSignature).toBe("sig-valid");
    expect(domain.applyFundingStatus).toHaveBeenCalledWith("batch-1", "reconciled");
    expect(domain.autoDispatchFundedPayouts).toHaveBeenCalledWith(actor, "batch-1");
  });

  it("opens an exception when funding comes from an unauthorized wallet", async () => {
    gateway.findFundingObservations.mockResolvedValue([
      {
        signature: "sig-bad-wallet",
        reference: "ref-1",
        mint: "usdc-mint",
        fromAddress: "wallet-2",
        toAddress: "treasury-ata",
        amountReceived: 100,
        rawAmount: "100000000",
      },
    ]);

    const service = new FundingService(persistence as never, gateway as never, domain as never);
    await service.rescanFundingInstruction(actor, "instruction-1");

    expect(persistence.instruction.status).toBe("pending");
    expect(persistence.transactions[0]?.reconciledAmount).toBe(0);
    expect(persistence.exceptions[0]?.type).toBe("funding_wallet_unauthorized");
  });

  it("opens an exception when the reference does not match", async () => {
    gateway.findFundingObservations.mockResolvedValue([
      {
        signature: "sig-bad-reference",
        reference: "ref-other",
        mint: "usdc-mint",
        fromAddress: "wallet-1",
        toAddress: "treasury-ata",
        amountReceived: 100,
        rawAmount: "100000000",
      },
    ]);

    const service = new FundingService(persistence as never, gateway as never, domain as never);
    await service.rescanFundingInstruction(actor, "instruction-1");

    expect(persistence.exceptions[0]?.type).toBe("funding_reference_missing");
  });

  it("opens an exception when the destination token account does not match", async () => {
    gateway.findFundingObservations.mockResolvedValue([
      {
        signature: "sig-bad-destination",
        reference: "ref-1",
        mint: "usdc-mint",
        fromAddress: "wallet-1",
        toAddress: "different-ata",
        amountReceived: 100,
        rawAmount: "100000000",
      },
    ]);

    const service = new FundingService(persistence as never, gateway as never, domain as never);
    await service.rescanFundingInstruction(actor, "instruction-1");

    expect(persistence.exceptions[0]?.type).toBe("funding_invalid_destination");
  });

  it("marks underfunding as partial and keeps the batch awaiting funding", async () => {
    gateway.findFundingObservations.mockResolvedValue([
      {
        signature: "sig-partial",
        reference: "ref-1",
        mint: "usdc-mint",
        fromAddress: "wallet-1",
        toAddress: "treasury-ata",
        amountReceived: 40,
        rawAmount: "40000000",
      },
    ]);

    const service = new FundingService(persistence as never, gateway as never, domain as never);
    await service.rescanFundingInstruction(actor, "instruction-1");

    expect(persistence.instruction.status).toBe("partial");
    expect(persistence.exceptions[0]?.type).toBe("funding_incomplete");
    expect(domain.applyFundingStatus).toHaveBeenCalledWith("batch-1", "partial");
    expect(domain.autoDispatchFundedPayouts).not.toHaveBeenCalled();
  });

  it("ignores duplicate signatures during rescans", async () => {
    gateway.findFundingObservations.mockResolvedValue([
      {
        signature: "sig-valid",
        reference: "ref-1",
        mint: "usdc-mint",
        fromAddress: "wallet-1",
        toAddress: "treasury-ata",
        amountReceived: 100,
        rawAmount: "100000000",
      },
    ]);

    const service = new FundingService(persistence as never, gateway as never, domain as never);
    await service.rescanFundingInstruction(actor, "instruction-1");
    await service.rescanFundingInstruction(actor, "instruction-1");

    expect(persistence.transactions).toHaveLength(1);
    expect(domain.autoDispatchFundedPayouts).toHaveBeenCalledTimes(1);
  });

  it("auto-dispatches when manual funding completes the expected amount", async () => {
    const service = new FundingService(persistence as never, gateway as never, domain as never);
    await service.recordManualFunding(actor, {
      fundingInstructionId: "instruction-1",
      txHash: "manual-complete",
      amountReceived: 100,
    });

    expect(persistence.instruction.status).toBe("reconciled");
    expect(domain.applyFundingStatus).toHaveBeenCalledWith("batch-1", "reconciled");
    expect(domain.autoDispatchFundedPayouts).toHaveBeenCalledWith(actor, "batch-1");
  });
});
