import { Injectable, NotFoundException } from "@nestjs/common";
import {
  type ApprovalDecision,
  type AuditLog,
  type AuthResponse,
  type Batch,
  type BatchDetail,
  type BatchReportRow,
  type Beneficiary,
  type Company,
  type ComplianceCase,
  type Corridor,
  type CountryCode,
  type CreateBatchDto,
  type CreateBeneficiaryDto,
  type ExceptionCase,
  type FundingInstruction,
  type FundingTransaction,
  type ImportBatchDto,
  type LedgerEntry,
  type Payout,
  type Quote,
  type SessionUser,
  type WebhookEvent,
} from "@latam-payouts/contracts";
import { randomUUID } from "node:crypto";

type DemoUserRecord = SessionUser & { password: string };

@Injectable()
export class DemoDomainService {
  private readonly company: Company = {
    id: "company_acme",
    legalName: "Acme Global Payroll Inc.",
    displayName: "Acme Payroll",
    country: "US",
    onboardingStatus: "active",
    authorizedWallets: ["ACME-FUNDING-WALLET-001"],
    webhookUrl: "https://client.example.com/webhooks/payouts",
  };

  private readonly users: DemoUserRecord[] = [
    {
      id: "user_finance",
      companyId: "company_acme",
      email: "finance@acme-pay.com",
      name: "Finance Ops",
      role: "finance_operator",
      password: "demo123",
    },
    {
      id: "user_approver",
      companyId: "company_acme",
      email: "approver@acme-pay.com",
      name: "Treasury Approver",
      role: "approver",
      password: "demo123",
    },
    {
      id: "user_compliance",
      companyId: "company_acme",
      email: "compliance@acme-pay.com",
      name: "Compliance Reviewer",
      role: "compliance_reviewer",
      password: "demo123",
    },
    {
      id: "user_admin",
      companyId: "company_acme",
      email: "admin@acme-pay.com",
      name: "Workspace Admin",
      role: "admin",
      password: "demo123",
    },
  ];

  private readonly corridors: Corridor[] = [
    {
      code: "CO",
      currency: "COP",
      payoutMethod: "bank_transfer",
      quoteTtlMinutes: 20,
      requiredFields: ["bankName", "accountNumber", "accountType", "documentNumber"],
      limits: { minLocal: 50000, maxLocal: 25000000 },
    },
    {
      code: "MX",
      currency: "MXN",
      payoutMethod: "bank_transfer",
      quoteTtlMinutes: 20,
      requiredFields: ["bankName", "clabe"],
      limits: { minLocal: 500, maxLocal: 350000 },
    },
  ];

  private beneficiaries: Beneficiary[] = [
    {
      id: "ben_co_001",
      companyId: "company_acme",
      name: "Camila Rojas",
      email: "camila@example.co",
      country: "CO",
      currency: "COP",
      kind: "contractor",
      bankName: "Bancolombia",
      accountHolderName: "Camila Rojas",
      accountNumber: "1029384756",
      accountType: "savings",
      documentNumber: "1032456789",
      validationStatus: "valid",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ben_mx_001",
      companyId: "company_acme",
      name: "Luis Herrera",
      email: "luis@example.mx",
      country: "MX",
      currency: "MXN",
      kind: "contractor",
      bankName: "BBVA Mexico",
      accountHolderName: "Luis Herrera",
      clabe: "012345678901234567",
      validationStatus: "valid",
      createdAt: new Date().toISOString(),
    },
  ];

  private batches: Batch[] = [];
  private payouts: Payout[] = [];
  private quotes: Quote[] = [];
  private fundingInstructions: FundingInstruction[] = [];
  private fundingTransactions: FundingTransaction[] = [];
  private approvalDecisions: ApprovalDecision[] = [];
  private complianceCases: ComplianceCase[] = [];
  private ledgerEntries: LedgerEntry[] = [];
  private webhookEvents: WebhookEvent[] = [];
  private auditLogs: AuditLog[] = [];
  private exceptions: ExceptionCase[] = [];

  constructor() {
    this.seedDemoBatch();
  }

  login(email: string, password: string): AuthResponse {
    const user = this.users.find((candidate) => candidate.email === email && candidate.password === password);

    if (!user) {
      throw new NotFoundException("Invalid email or password.");
    }

    return {
      accessToken: `demo-token:${user.id}`,
      refreshToken: `demo-refresh:${user.id}`,
      user: this.stripPassword(user),
    };
  }

  refresh(refreshToken: string): AuthResponse {
    const userId = refreshToken.replace("demo-refresh:", "");
    const user = this.users.find((candidate) => candidate.id === userId);

    if (!user) {
      throw new NotFoundException("Invalid refresh token.");
    }

    return {
      accessToken: `demo-token:${user.id}`,
      refreshToken: `demo-refresh:${user.id}`,
      user: this.stripPassword(user),
    };
  }

  getDefaultUser(): SessionUser {
    return this.stripPassword(this.users[0]);
  }

  findUserById(userId: string): SessionUser | undefined {
    const user = this.users.find((candidate) => candidate.id === userId);
    return user ? this.stripPassword(user) : undefined;
  }

  listUsers(): SessionUser[] {
    return this.users.map((user) => this.stripPassword(user));
  }

  getCompany(): Company {
    return this.company;
  }

  updateCompany(user: SessionUser, payload: Partial<Company>): Company {
    if (payload.displayName) {
      this.company.displayName = payload.displayName;
    }
    if (payload.webhookUrl !== undefined) {
      this.company.webhookUrl = payload.webhookUrl;
    }
    if (payload.authorizedWallets?.length) {
      this.company.authorizedWallets = payload.authorizedWallets;
    }

    this.logAudit("company", this.company.id, "company.updated", user, payload);
    return this.company;
  }

  listCorridors(): Corridor[] {
    return this.corridors;
  }

  listBeneficiaries(): Beneficiary[] {
    return this.beneficiaries;
  }

  createBeneficiary(user: SessionUser, dto: CreateBeneficiaryDto): Beneficiary {
    const currency = dto.country === "CO" ? "COP" : "MXN";
    const validationErrors = this.validateBeneficiaryFields(dto.country, dto);

    const beneficiary: Beneficiary = {
      id: randomUUID(),
      companyId: user.companyId,
      name: dto.name,
      email: dto.email,
      country: dto.country,
      currency,
      kind: dto.kind,
      bankName: dto.bankName,
      accountHolderName: dto.accountHolderName,
      accountNumber: dto.accountNumber,
      accountType: dto.accountType,
      clabe: dto.clabe,
      documentNumber: dto.documentNumber,
      validationStatus: validationErrors.length ? "invalid" : "valid",
      createdAt: new Date().toISOString(),
    };

    this.beneficiaries = [beneficiary, ...this.beneficiaries];
    this.logAudit("beneficiary", beneficiary.id, "beneficiary.created", user, { validationErrors });
    return beneficiary;
  }

  updateBeneficiary(user: SessionUser, id: string, dto: Partial<CreateBeneficiaryDto>): Beneficiary {
    const beneficiary = this.requireBeneficiary(id);
    Object.assign(beneficiary, dto);
    const validationErrors = this.validateBeneficiaryFields(beneficiary.country, beneficiary);
    beneficiary.validationStatus = validationErrors.length ? "invalid" : "valid";
    this.logAudit("beneficiary", beneficiary.id, "beneficiary.updated", user, { validationErrors });
    return beneficiary;
  }

  listBatches(): Batch[] {
    return this.batches;
  }

  createBatch(user: SessionUser, dto: CreateBatchDto): BatchDetail {
    const batchId = randomUUID();
    const payouts: Payout[] = dto.payouts.map((line) => {
      const beneficiary = this.requireBeneficiary(line.beneficiaryId);
      const validationErrors = this.validatePayout(beneficiary.country, line.amountLocal, beneficiary);

      return {
        id: randomUUID(),
        batchId,
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.name,
        country: beneficiary.country,
        currency: beneficiary.currency,
        amountLocal: line.amountLocal,
        feeLocal: 0,
        fxRate: 0,
        fundingAmountUsdc: 0,
        status: validationErrors.length ? "draft" : "validated",
        partnerRoute: beneficiary.country === "CO" ? "mock-colombia-bank" : "mock-mexico-bank",
        validationErrors,
      };
    });

    const batch: Batch = {
      id: batchId,
      companyId: user.companyId,
      name: dto.name,
      createdByUserId: user.id,
      status: payouts.some((item) => item.validationErrors.length) ? "draft" : "validated",
      payoutIds: payouts.map((item) => item.id),
      totalLocal: payouts.reduce((total, item) => total + item.amountLocal, 0),
      totalFundingUsdc: 0,
      createdAt: new Date().toISOString(),
    };

    this.payouts = [...payouts, ...this.payouts];
    this.batches = [batch, ...this.batches];
    this.logAudit("batch", batch.id, "batch.created", user, { payoutCount: payouts.length });
    return this.getBatchDetail(batch.id);
  }

  importBatch(user: SessionUser, dto: ImportBatchDto): BatchDetail {
    const lines = dto.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const payouts = lines.slice(1).map((line) => {
      const [beneficiaryId, amountRaw] = line.split(",");
      return {
        beneficiaryId: beneficiaryId.trim(),
        amountLocal: Number(amountRaw),
      };
    });

    return this.createBatch(user, { name: dto.name, payouts });
  }

  getBatchDetail(batchId: string): BatchDetail {
    const batch = this.requireBatch(batchId);
    return {
      batch,
      company: this.company,
      payouts: this.payouts.filter((item) => item.batchId === batchId),
      quote: this.quotes.find((item) => item.batchId === batchId),
      fundingInstruction: this.fundingInstructions.find((item) => item.batchId === batchId),
      approvalDecisions: this.approvalDecisions.filter((item) => item.batchId === batchId),
      auditTrail: this.auditLogs.filter((item) => item.entityId === batchId || item.metadata?.batchId === batchId),
    };
  }

  createQuote(user: SessionUser, batchId: string): Quote {
    const batch = this.requireBatch(batchId);
    const payouts = this.payouts.filter((item) => item.batchId === batchId);

    if (payouts.some((item) => item.validationErrors.length)) {
      this.raiseException({
        type: "manual_review",
        batchId,
        summary: "Batch contains invalid payouts and cannot be quoted.",
      });
      throw new NotFoundException("Batch contains invalid payouts.");
    }

    const quote: Quote = {
      id: randomUUID(),
      batchId,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      totalFundingUsdc: 0,
      totalFeesLocal: 0,
      payouts: payouts.map((payout) => {
        const feeLocal = Math.round(payout.amountLocal * 0.015 * 100) / 100;
        const fxRate = payout.country === "CO" ? 4100 : 17.2;
        const fundingAmountUsdc = Number(((payout.amountLocal + feeLocal) / fxRate).toFixed(2));

        payout.feeLocal = feeLocal;
        payout.fxRate = fxRate;
        payout.fundingAmountUsdc = fundingAmountUsdc;
        payout.status = "quoted";

        return {
          payoutId: payout.id,
          feeLocal,
          fxRate,
          fundingAmountUsdc,
        };
      }),
    };

    quote.totalFeesLocal = Number(quote.payouts.reduce((sum, item) => sum + item.feeLocal, 0).toFixed(2));
    quote.totalFundingUsdc = Number(quote.payouts.reduce((sum, item) => sum + item.fundingAmountUsdc, 0).toFixed(2));

    batch.quoteId = quote.id;
    batch.totalFundingUsdc = quote.totalFundingUsdc;
    batch.status = "awaiting_approval";

    this.quotes = [quote, ...this.quotes.filter((item) => item.batchId !== batchId)];
    this.logAudit("batch", batchId, "batch.quoted", user, {
      totalFundingUsdc: quote.totalFundingUsdc,
      totalFeesLocal: quote.totalFeesLocal,
    });
    return quote;
  }

  approveBatch(user: SessionUser, batchId: string, outcome: "approved" | "rejected", comment?: string): BatchDetail {
    const batch = this.requireBatch(batchId);
    const quote = this.quotes.find((item) => item.batchId === batchId);

    if (!quote) {
      throw new NotFoundException("Quote not found for batch.");
    }
    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      this.raiseException({
        type: "quote_expired",
        batchId,
        summary: "Quote expired before batch approval.",
      });
      throw new NotFoundException("Quote expired.");
    }

    const decision: ApprovalDecision = {
      id: randomUUID(),
      batchId,
      actorId: user.id,
      actorName: user.name,
      outcome,
      comment,
      createdAt: new Date().toISOString(),
    };
    this.approvalDecisions = [decision, ...this.approvalDecisions];

    batch.status = outcome === "approved" ? "approved" : "failed";
    this.payouts
      .filter((item) => item.batchId === batchId)
      .forEach((payout) => {
        payout.status = outcome === "approved" ? "approved" : "failed";
      });

    this.logAudit("batch", batchId, `batch.${outcome}`, user, { comment });
    return this.getBatchDetail(batchId);
  }

  getFundingInstruction(user: SessionUser, batchId: string): FundingInstruction {
    const batch = this.requireBatch(batchId);
    if (batch.status !== "approved" && batch.status !== "awaiting_funding" && batch.status !== "funded") {
      throw new NotFoundException("Batch must be approved before funding instructions can be generated.");
    }

    const existing = this.fundingInstructions.find((item) => item.batchId === batchId);
    if (existing) {
      return existing;
    }

    const instruction: FundingInstruction = {
      id: randomUUID(),
      batchId,
      chain: "solana",
      asset: "USDC",
      walletAddress: `SOLANA-${batchId.slice(0, 8)}`,
      expectedAmount: batch.totalFundingUsdc,
      memo: batch.id.slice(0, 10),
      status: "pending",
    };
    this.fundingInstructions = [instruction, ...this.fundingInstructions];
    batch.status = "awaiting_funding";
    this.payouts.filter((item) => item.batchId === batchId).forEach((payout) => {
      payout.status = "awaiting_funding";
    });
    this.logAudit("batch", batchId, "funding.instructions_generated", user, {
      fundingInstructionId: instruction.id,
      walletAddress: instruction.walletAddress,
      expectedAmount: instruction.expectedAmount,
      chain: instruction.chain,
      asset: instruction.asset,
    });
    return instruction;
  }

  recordFundingTransaction(
    user: SessionUser,
    payload: { fundingInstructionId: string; txHash: string; amountReceived: number; eventId?: string },
  ): FundingTransaction {
    const instruction = this.requireFundingInstruction(payload.fundingInstructionId);
    const batch = this.requireBatch(instruction.batchId);

    if (payload.eventId && this.webhookEvents.some((event) => event.eventId === payload.eventId)) {
      throw new NotFoundException("Duplicate funding event.");
    }

    const status = payload.amountReceived >= instruction.expectedAmount ? "reconciled" : "partial";
    const transaction: FundingTransaction = {
      id: randomUUID(),
      fundingInstructionId: instruction.id,
      txHash: payload.txHash,
      amountReceived: payload.amountReceived,
      status,
      createdAt: new Date().toISOString(),
    };

    this.fundingTransactions = [transaction, ...this.fundingTransactions];
    instruction.status = status;
    this.ledgerEntries = [
      {
        id: randomUUID(),
        batchId: batch.id,
        type: "funding_received",
        amount: payload.amountReceived,
        currency: "USDC",
        createdAt: new Date().toISOString(),
        note: `Funding received via ${payload.txHash}`,
      },
      ...this.ledgerEntries,
    ];

    if (status === "partial") {
      batch.status = "awaiting_funding";
      this.raiseException({
        type: "funding_incomplete",
        batchId: batch.id,
        summary: "Funding received was below the expected amount.",
      });
    } else {
      batch.status = "funded";
      this.payouts.filter((item) => item.batchId === batch.id).forEach((payout) => {
        payout.status = "funded";
      });
      this.ledgerEntries = [
        {
          id: randomUUID(),
          batchId: batch.id,
          type: "funding_reserved",
          amount: batch.totalFundingUsdc,
          currency: "USDC",
          createdAt: new Date().toISOString(),
          note: "Funds reserved for approved batch execution.",
        },
        ...this.ledgerEntries,
      ];
    }

    if (payload.eventId) {
      this.recordWebhook("inbound", "funding", payload.eventId, payload);
    }

    this.logAudit("batch", batch.id, "funding.recorded", user, {
      txHash: payload.txHash,
      amountReceived: payload.amountReceived,
      status,
    });
    return transaction;
  }

  dispatchPayout(user: SessionUser, payoutId: string): Payout {
    const payout = this.requirePayout(payoutId);
    const batch = this.requireBatch(payout.batchId);

    if (batch.status !== "funded") {
      throw new NotFoundException("Batch must be funded before payout dispatch.");
    }

    if (payout.amountLocal > (payout.country === "MX" ? 50000 : 5000000)) {
      payout.status = "in_review";
      batch.status = "in_review";
      this.complianceCases = [
        {
          id: randomUUID(),
          batchId: batch.id,
          payoutId: payout.id,
          reason: "Amount exceeded auto-clear threshold.",
          status: "open",
          createdAt: new Date().toISOString(),
        },
        ...this.complianceCases,
      ];
      this.raiseException({
        type: "manual_review",
        batchId: batch.id,
        payoutId: payout.id,
        country: payout.country,
        summary: "Payout routed to compliance review before dispatch.",
      });
      this.logAudit("payout", payout.id, "payout.sent_to_review", user, { batchId: batch.id });
      return payout;
    }

    payout.status = "dispatching";
    this.ledgerEntries = [
      {
        id: randomUUID(),
        batchId: batch.id,
        payoutId: payout.id,
        type: "payout_dispatched",
        amount: payout.fundingAmountUsdc,
        currency: "USDC",
        createdAt: new Date().toISOString(),
        note: `Dispatched through ${payout.partnerRoute}`,
      },
      ...this.ledgerEntries,
    ];

    const shouldFail = payout.beneficiaryName.toLowerCase().includes("luis");
    payout.status = shouldFail ? "failed" : "paid";
    batch.status = this.resolveBatchStatus(batch.id);

    this.ledgerEntries = [
      {
        id: randomUUID(),
        batchId: batch.id,
        payoutId: payout.id,
        type: shouldFail ? "payout_failed" : "payout_settled",
        amount: payout.fundingAmountUsdc,
        currency: "USDC",
        createdAt: new Date().toISOString(),
        note: shouldFail ? "Partner returned payout failure." : "Payout settled successfully.",
      },
      ...this.ledgerEntries,
    ];

    if (shouldFail) {
      this.raiseException({
        type: "payout_failed",
        batchId: batch.id,
        payoutId: payout.id,
        country: payout.country,
        summary: "Partner mock returned a payout failure for this beneficiary.",
      });
    }

    this.logAudit("payout", payout.id, "payout.dispatched", user, {
      batchId: batch.id,
      result: payout.status,
    });
    return payout;
  }

  listPayouts(): Payout[] {
    return this.payouts;
  }

  resolveComplianceCase(user: SessionUser, caseId: string): ComplianceCase {
    const entry = this.complianceCases.find((item) => item.id === caseId);
    if (!entry) {
      throw new NotFoundException("Compliance case not found.");
    }
    entry.status = "resolved";
    entry.reviewerId = user.id;
    entry.resolvedAt = new Date().toISOString();

    if (entry.payoutId) {
      const payout = this.requirePayout(entry.payoutId);
      payout.status = "funded";
      this.logAudit("payout", payout.id, "compliance.resolved", user, { caseId });
    }

    if (entry.batchId) {
      const batch = this.requireBatch(entry.batchId);
      batch.status = this.resolveBatchStatus(batch.id);
    }

    return entry;
  }

  listExceptions(): ExceptionCase[] {
    return this.exceptions;
  }

  listComplianceCases(): ComplianceCase[] {
    return this.complianceCases;
  }

  resolveException(user: SessionUser, exceptionId: string): ExceptionCase {
    const entry = this.exceptions.find((item) => item.id === exceptionId);
    if (!entry) {
      throw new NotFoundException("Exception not found.");
    }

    entry.status = "resolved";
    entry.resolvedAt = new Date().toISOString();
    this.logAudit("exception", entry.id, "exception.resolved", user, { batchId: entry.batchId, payoutId: entry.payoutId });
    return entry;
  }

  listAuditLogs(entityType?: string, entityId?: string): AuditLog[] {
    return this.auditLogs.filter((item) => {
      if (entityType && item.entityType !== entityType) {
        return false;
      }
      if (entityId && item.entityId !== entityId && item.metadata?.batchId !== entityId) {
        return false;
      }
      return true;
    });
  }

  getBatchReports(): BatchReportRow[] {
    return this.batches.map((batch) => {
      const batchPayouts = this.payouts.filter((item) => item.batchId === batch.id);
      return {
        batchId: batch.id,
        batchName: batch.name,
        status: batch.status,
        totalLocal: batch.totalLocal,
        totalFundingUsdc: batch.totalFundingUsdc,
        payoutCount: batchPayouts.length,
        paidCount: batchPayouts.filter((item) => item.status === "paid").length,
        failedCount: batchPayouts.filter((item) => item.status === "failed").length,
      };
    });
  }

  recordPartnerWebhook(payload: { eventId: string; payoutId: string; status: "paid" | "failed" }): Payout {
    if (this.webhookEvents.some((event) => event.eventId === payload.eventId)) {
      throw new NotFoundException("Duplicate partner event.");
    }

    const payout = this.requirePayout(payload.payoutId);
    payout.status = payload.status;
    const batch = this.requireBatch(payout.batchId);
    batch.status = this.resolveBatchStatus(batch.id);
    this.recordWebhook("inbound", "partner", payload.eventId, payload);

    if (payload.status === "failed") {
      this.raiseException({
        type: "callback_inconsistent",
        batchId: batch.id,
        payoutId: payout.id,
        country: payout.country,
        summary: "Partner callback changed the payout to failed.",
      });
    }

    return payout;
  }

  private validatePayout(country: CountryCode, amountLocal: number, beneficiary: Beneficiary): string[] {
    const corridor = this.corridors.find((item) => item.code === country);
    const errors: string[] = [];

    if (!corridor) {
      errors.push(`Unsupported corridor ${country}.`);
    }
    if (beneficiary.validationStatus !== "valid") {
      errors.push("Beneficiary is not valid for execution.");
    }
    if (corridor && (amountLocal < corridor.limits.minLocal || amountLocal > corridor.limits.maxLocal)) {
      errors.push("Amount outside corridor limits.");
    }

    return errors;
  }

  private validateBeneficiaryFields(country: CountryCode, dto: Partial<CreateBeneficiaryDto>): string[] {
    const corridor = this.corridors.find((item) => item.code === country);
    if (!corridor) {
      return ["Unsupported corridor."];
    }

    return corridor.requiredFields.filter((field) => {
      const value = dto[field as keyof CreateBeneficiaryDto];
      return value === undefined || value === null || value === "";
    });
  }

  private resolveBatchStatus(batchId: string): Batch["status"] {
    const payouts = this.payouts.filter((item) => item.batchId === batchId);

    if (payouts.some((item) => item.status === "in_review")) {
      return "in_review";
    }
    if (payouts.every((item) => item.status === "paid")) {
      return "completed";
    }
    if (payouts.some((item) => item.status === "failed")) {
      return "failed";
    }
    if (payouts.every((item) => item.status === "funded")) {
      return "funded";
    }
    return "dispatching" as Batch["status"];
  }

  private raiseException(input: Omit<ExceptionCase, "id" | "status" | "createdAt">): void {
    const entry: ExceptionCase = {
      id: randomUUID(),
      status: "open",
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.exceptions = [entry, ...this.exceptions];
  }

  private recordWebhook(
    direction: WebhookEvent["direction"],
    source: WebhookEvent["source"],
    eventId: string,
    payload: Record<string, unknown>,
  ): void {
    this.webhookEvents = [
      {
        id: randomUUID(),
        direction,
        source,
        eventId,
        payload,
        createdAt: new Date().toISOString(),
      },
      ...this.webhookEvents,
    ];
  }

  private requireBeneficiary(id: string): Beneficiary {
    const beneficiary = this.beneficiaries.find((item) => item.id === id);
    if (!beneficiary) {
      throw new NotFoundException(`Beneficiary ${id} not found.`);
    }
    return beneficiary;
  }

  private requireBatch(id: string): Batch {
    const batch = this.batches.find((item) => item.id === id);
    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found.`);
    }
    return batch;
  }

  private requirePayout(id: string): Payout {
    const payout = this.payouts.find((item) => item.id === id);
    if (!payout) {
      throw new NotFoundException(`Payout ${id} not found.`);
    }
    return payout;
  }

  private requireFundingInstruction(id: string): FundingInstruction {
    const instruction = this.fundingInstructions.find((item) => item.id === id);
    if (!instruction) {
      throw new NotFoundException(`Funding instruction ${id} not found.`);
    }
    return instruction;
  }

  private logAudit(
    entityType: string,
    entityId: string,
    action: string,
    user: SessionUser,
    metadata?: Record<string, unknown>,
  ): void {
    this.auditLogs = [
      {
        id: randomUUID(),
        entityType,
        entityId,
        action,
        actorType: "user",
        actorId: user.id,
        actorName: user.name,
        metadata,
        createdAt: new Date().toISOString(),
      },
      ...this.auditLogs,
    ];
  }

  private stripPassword(user: DemoUserRecord): SessionUser {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private seedDemoBatch(): void {
    const user = this.stripPassword(this.users[0]);
    const detail = this.createBatch(user, {
      name: "April contractor payroll",
      payouts: [
        { beneficiaryId: "ben_co_001", amountLocal: 1800000 },
        { beneficiaryId: "ben_mx_001", amountLocal: 22000 },
      ],
    });

    this.createQuote(user, detail.batch.id);
  }
}
