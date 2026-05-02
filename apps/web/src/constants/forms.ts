import type { CreateBatchDto, CreateBeneficiaryDto } from "@latam-payouts/contracts";

export const initialLoginForm = {
  email: "finance@acme-pay.com",
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

export const initialCsvImport = "beneficiaryId,amountLocal\nben_co_001,2500000\nben_mx_001,18000";
