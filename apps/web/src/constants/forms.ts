import type { CreateBatchDto, CreateBeneficiaryDto } from "@latam-payouts/contracts";

export const initialLoginForm = {
  email: "admin@acme-pay.com",
  password: "demo123",
};

export const emptyBeneficiaryForm: CreateBeneficiaryDto = {
  name: "",
  email: "",
  projectId: "",
  projectName: "",
  country: "CO",
  kind: "employee",
  bankName: "",
  accountHolderName: "",
  phoneNumber: "",
  accountNumber: "",
  accountType: "savings",
  bankKey: "",
  bankKeyType: "",
  clabe: "",
  documentType: "CC",
  documentNumber: "",
};

export const initialBatchForm: CreateBatchDto = {
  name: "New payroll project",
  payouts: [],
};

export const initialCsvImport = [
  "beneficiaryId,amountLocal",
  "ben_co_001,2500000",
  "ben_co_002,3100000",
  "ben_co_003,1850000",
  "ben_mx_001,18000",
  "ben_mx_002,24500",
  "ben_mx_003,16500",
  "ben_mx_004,29200",
  "ben_ar_001,650000",
  "ben_ar_002,720000",
  "ben_ar_003,580000",
].join("\n");
