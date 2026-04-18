import type {
  ApprovalDecision,
  AuditLog,
  Batch,
  BatchDetail,
  BatchReportRow,
  Beneficiary,
  Company,
  ComplianceCase,
  Corridor,
  CreateBatchDto,
  CreateBeneficiaryDto,
  ExceptionCase,
  FundingInstruction,
  FundingTransaction,
  Payout,
  SessionUser,
} from "@latam-payouts/contracts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type HttpMethod = "GET" | "POST" | "PATCH";

async function request<T>(path: string, options: { method?: HttpMethod; body?: unknown; token?: string } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed for ${path}`);
  }

  return (await response.json()) as T;
}

export interface BootstrapPayload {
  me: SessionUser;
  company: Company;
  beneficiaries: Beneficiary[];
  corridors: Corridor[];
  batches: Batch[];
  payouts: Payout[];
  exceptions: ExceptionCase[];
  complianceCases: ComplianceCase[];
  reports: BatchReportRow[];
}

export const api = {
  login(email: string, password: string) {
    return request<{ accessToken: string; refreshToken: string; user: SessionUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },
  refresh(refreshToken: string) {
    return request<{ accessToken: string; refreshToken: string; user: SessionUser }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },
  me(token: string) {
    return request<SessionUser>("/me", { token });
  },
  getCompany(token: string) {
    return request<Company>("/companies/current", { token });
  },
  updateCompany(token: string, body: Partial<Company>) {
    return request<Company>("/companies/current", { token, method: "PATCH", body });
  },
  listBeneficiaries(token: string) {
    return request<Beneficiary[]>("/beneficiaries", { token });
  },
  createBeneficiary(token: string, body: CreateBeneficiaryDto) {
    return request<Beneficiary>("/beneficiaries", { token, method: "POST", body });
  },
  updateBeneficiary(token: string, id: string, body: Partial<CreateBeneficiaryDto>) {
    return request<Beneficiary>(`/beneficiaries/${id}`, { token, method: "PATCH", body });
  },
  listCorridors(token: string) {
    return request<Corridor[]>("/corridors", { token });
  },
  listBatches(token: string) {
    return request<Batch[]>("/batches", { token });
  },
  getBatch(token: string, id: string) {
    return request<BatchDetail>(`/batches/${id}`, { token });
  },
  createBatch(token: string, body: CreateBatchDto) {
    return request<BatchDetail>("/batches", { token, method: "POST", body });
  },
  importBatch(token: string, name: string, csv: string) {
    return request<BatchDetail>("/batches/import", { token, method: "POST", body: { name, csv } });
  },
  createQuote(token: string, id: string) {
    return request(`/batches/${id}/quote`, { token, method: "POST" });
  },
  approveBatch(token: string, id: string, comment?: string) {
    return request<BatchDetail>(`/batches/${id}/approve`, { token, method: "POST", body: { comment } });
  },
  rejectBatch(token: string, id: string, comment?: string) {
    return request<BatchDetail>(`/batches/${id}/reject`, { token, method: "POST", body: { comment } });
  },
  getFundingInstructions(token: string, id: string) {
    return request<FundingInstruction>(`/batches/${id}/funding-instructions`, { token });
  },
  recordFunding(token: string, body: { fundingInstructionId: string; txHash: string; amountReceived: number }) {
    return request<FundingTransaction>("/funding/transactions", { token, method: "POST", body });
  },
  listPayouts(token: string) {
    return request<Payout[]>("/payouts", { token });
  },
  dispatchPayout(token: string, payoutId: string) {
    return request<Payout>(`/payouts/${payoutId}/dispatch`, { token, method: "POST" });
  },
  listExceptions(token: string) {
    return request<ExceptionCase[]>("/exceptions", { token });
  },
  resolveException(token: string, exceptionId: string) {
    return request<ExceptionCase>(`/exceptions/${exceptionId}/resolve`, { token, method: "PATCH" });
  },
  listComplianceCases(token: string) {
    return request<ComplianceCase[]>("/compliance/cases", { token });
  },
  resolveComplianceCase(token: string, caseId: string) {
    return request<ComplianceCase>(`/batches/compliance/${caseId}/resolve`, { token, method: "PATCH" });
  },
  getReports(token: string) {
    return request<BatchReportRow[]>("/reports/batches", { token });
  },
  getAuditLogs(token: string, entityId?: string) {
    const query = entityId ? `?entityId=${entityId}` : "";
    return request<AuditLog[]>(`/audit-logs${query}`, { token });
  },
  async bootstrap(token: string): Promise<BootstrapPayload> {
    const [me, company, beneficiaries, corridors, batches, payouts, exceptions, complianceCases, reports] =
      await Promise.all([
        this.me(token),
        this.getCompany(token),
        this.listBeneficiaries(token),
        this.listCorridors(token),
        this.listBatches(token),
        this.listPayouts(token),
        this.listExceptions(token),
        this.listComplianceCases(token).catch(() => []),
        this.getReports(token),
      ]);

    return { me, company, beneficiaries, corridors, batches, payouts, exceptions, complianceCases, reports };
  },
};

export type { ApprovalDecision, AuditLog, Batch, BatchDetail, BatchReportRow, Beneficiary, Company, ComplianceCase, Corridor, ExceptionCase, FundingInstruction, Payout };

