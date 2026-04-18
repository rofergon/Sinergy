export type CountryCode = "CO" | "MX";
export type CurrencyCode = "COP" | "MXN" | "USDC";
export type UserRole =
  | "admin"
  | "finance_operator"
  | "approver"
  | "compliance_reviewer";
export type BatchStatus =
  | "draft"
  | "validated"
  | "quoted"
  | "awaiting_approval"
  | "approved"
  | "awaiting_funding"
  | "funded"
  | "dispatching"
  | "in_review"
  | "completed"
  | "failed";
export type PayoutStatus =
  | "draft"
  | "validated"
  | "quoted"
  | "awaiting_approval"
  | "approved"
  | "awaiting_funding"
  | "funded"
  | "in_review"
  | "dispatching"
  | "paid"
  | "failed";
export type ExceptionType =
  | "quote_expired"
  | "funding_incomplete"
  | "payout_failed"
  | "callback_inconsistent"
  | "manual_review";
export type BeneficiaryKind = "contractor" | "employee";
export type FundingStatus = "pending" | "reconciled" | "partial";
export type LedgerEntryType =
  | "funding_received"
  | "funding_reserved"
  | "fee_reserved"
  | "payout_dispatched"
  | "payout_settled"
  | "payout_failed";

export interface SessionUser {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Company {
  id: string;
  legalName: string;
  displayName: string;
  country: string;
  onboardingStatus: "pending" | "active";
  authorizedWallets: string[];
  webhookUrl?: string;
}

export interface Corridor {
  code: CountryCode;
  currency: CurrencyCode;
  payoutMethod: "bank_transfer";
  quoteTtlMinutes: number;
  requiredFields: string[];
  limits: {
    minLocal: number;
    maxLocal: number;
  };
}

export interface Beneficiary {
  id: string;
  companyId: string;
  name: string;
  email: string;
  country: CountryCode;
  currency: CurrencyCode;
  kind: BeneficiaryKind;
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  accountType?: string;
  clabe?: string;
  documentNumber?: string;
  validationStatus: "valid" | "invalid";
  createdAt: string;
}

export interface Payout {
  id: string;
  batchId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  country: CountryCode;
  currency: CurrencyCode;
  amountLocal: number;
  feeLocal: number;
  fxRate: number;
  fundingAmountUsdc: number;
  status: PayoutStatus;
  partnerRoute: string;
  validationErrors: string[];
}

export interface Quote {
  id: string;
  batchId: string;
  expiresAt: string;
  totalFundingUsdc: number;
  totalFeesLocal: number;
  payouts: Array<{
    payoutId: string;
    feeLocal: number;
    fxRate: number;
    fundingAmountUsdc: number;
  }>;
}

export interface Batch {
  id: string;
  companyId: string;
  name: string;
  createdByUserId: string;
  status: BatchStatus;
  payoutIds: string[];
  totalLocal: number;
  totalFundingUsdc: number;
  quoteId?: string;
  createdAt: string;
}

export interface FundingInstruction {
  id: string;
  batchId: string;
  chain: "solana";
  asset: "USDC";
  walletAddress: string;
  expectedAmount: number;
  memo?: string;
  status: FundingStatus;
}

export interface FundingTransaction {
  id: string;
  fundingInstructionId: string;
  txHash: string;
  amountReceived: number;
  status: FundingStatus;
  createdAt: string;
}

export interface ApprovalDecision {
  id: string;
  batchId: string;
  actorId: string;
  actorName: string;
  outcome: "approved" | "rejected";
  comment?: string;
  createdAt: string;
}

export interface ComplianceCase {
  id: string;
  batchId?: string;
  payoutId?: string;
  reason: string;
  status: "open" | "resolved";
  reviewerId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface LedgerEntry {
  id: string;
  batchId?: string;
  payoutId?: string;
  type: LedgerEntryType;
  amount: number;
  currency: CurrencyCode;
  createdAt: string;
  note: string;
}

export interface WebhookEvent {
  id: string;
  direction: "inbound" | "outbound";
  source: "funding" | "partner" | "client";
  eventId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: "user" | "system";
  actorId: string;
  actorName: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ExceptionCase {
  id: string;
  type: ExceptionType;
  batchId?: string;
  payoutId?: string;
  country?: CountryCode;
  status: "open" | "resolved";
  summary: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface BatchDetail {
  batch: Batch;
  company: Company;
  payouts: Payout[];
  quote?: Quote;
  fundingInstruction?: FundingInstruction;
  approvalDecisions: ApprovalDecision[];
  auditTrail: AuditLog[];
}

export interface BatchReportRow {
  batchId: string;
  batchName: string;
  status: BatchStatus;
  totalLocal: number;
  totalFundingUsdc: number;
  payoutCount: number;
  paidCount: number;
  failedCount: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export interface CreateBeneficiaryDto {
  name: string;
  email: string;
  country: CountryCode;
  kind: BeneficiaryKind;
  bankName: string;
  accountHolderName: string;
  accountNumber?: string;
  accountType?: string;
  clabe?: string;
  documentNumber?: string;
}

export interface CreateBatchDto {
  name: string;
  payouts: Array<{
    beneficiaryId: string;
    amountLocal: number;
  }>;
}

export interface ImportBatchDto {
  name: string;
  csv: string;
}
