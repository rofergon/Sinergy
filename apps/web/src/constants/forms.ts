import type { CreateBatchDto, CreateBeneficiaryDto } from "@latam-payouts/contracts";

export const initialLoginForm = {
  email: "finance@acme-pay.com",
  password: "demo123",
};

export const emptyBeneficiaryForm: CreateBeneficiaryDto = {
  name: "",
  email: "",
  country: "CO",
  kind: "contractor",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  accountType: "",
  clabe: "",
  documentNumber: "",
};

export const initialBatchForm: CreateBatchDto = {
  name: "New payroll batch",
  payouts: [],
};

export const initialCsvImport = "beneficiaryId,amountLocal\nben_co_001,2500000\nben_mx_001,18000";
