import process from "node:process";
import { loadEnvFiles } from "./env-utils.mjs";

const loadedEnv = await loadEnvFiles(".env");
process.env = { ...process.env, ...loadedEnv };

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Add it to apps/api/.env or pass it in the environment.");
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const companyId = "seed_company_acme";
const financeUserId = "seed_user_finance";
const approverUserId = "seed_user_approver";
const complianceUserId = "seed_user_compliance";

const batchIds = [
  "seed_op_co_awaiting_approval",
  "seed_op_co_dispatching",
  "seed_op_co_completed",
  "seed_op_co_exception",
  "seed_op_mx_awaiting_funding",
  "seed_op_mx_in_review",
  "seed_op_ar_validated",
  "seed_op_ar_completed",
];

const beneficiaryIds = [
  "seed_ben_co_001",
  "seed_ben_co_002",
  "seed_ben_co_003",
  "seed_ben_co_004",
  "seed_ben_mx_001",
  "seed_ben_mx_002",
  "seed_ben_mx_003",
  "seed_ben_ar_001",
  "seed_ben_ar_002",
];

const now = new Date();
const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

function money(value) {
  return value.toFixed(2);
}

function usdc(value) {
  return value.toFixed(6);
}

function fundingAmount(amountLocal, country) {
  const fxRate = country === "CO" ? 4100 : country === "MX" ? 17.2 : 980;
  const feeLocal = amountLocal * 0.015;
  return Number(((amountLocal + feeLocal) / fxRate).toFixed(6));
}

function fee(amountLocal) {
  return Number((amountLocal * 0.015).toFixed(2));
}

function currencyFor(country) {
  return country === "CO" ? "COP" : country === "MX" ? "MXN" : "ARS";
}

function fxFor(country) {
  return country === "CO" ? 4100 : country === "MX" ? 17.2 : 980;
}

function partnerRouteFor(country) {
  return country === "CO" ? "co-bank-transfer" : country === "MX" ? "mx-spei" : "ar-bank-transfer";
}

function payout(input) {
  const funding = fundingAmount(input.amountLocal, input.country);
  return {
    id: input.id,
    batchId: input.batchId,
    beneficiaryId: input.beneficiaryId,
    beneficiaryName: input.beneficiaryName,
    country: input.country,
    currency: currencyFor(input.country),
    amountLocal: money(input.amountLocal),
    feeLocal: money(fee(input.amountLocal)),
    fxRate: usdc(fxFor(input.country)),
    fundingAmountUsdc: usdc(funding),
    status: input.status,
    approvalStatus: input.approvalStatus,
    approvalComment: input.approvalComment,
    approvedByUserId: input.approvalStatus === "approved" ? approverUserId : null,
    approvedAt: input.approvalStatus === "approved" ? input.approvedAt ?? hoursAgo(18) : null,
    partnerRoute: partnerRouteFor(input.country),
    validationErrors: input.validationErrors ?? [],
  };
}

const beneficiaries = [
  {
    id: "seed_ben_co_001",
    name: "Camila Torres",
    email: "camila.torres@example.com",
    projectId: "seed_op_co_awaiting_approval",
    projectName: "Contractor Payroll Colombia - May",
    country: "CO",
    bankName: "Bancolombia",
    accountNumber: "1234567890",
    accountType: "savings",
    phoneNumber: "+573001112233",
    documentType: "CC",
    documentNumber: "1020304050",
  },
  {
    id: "seed_ben_co_002",
    name: "Santiago Rojas",
    email: "santiago.rojas@example.com",
    projectId: "seed_op_co_dispatching",
    projectName: "Vendor Payouts Colombia - Week 18",
    country: "CO",
    bankName: "Davivienda",
    accountNumber: "9876543210",
    accountType: "checking",
    phoneNumber: "+573004445566",
    documentType: "CC",
    documentNumber: "1100220033",
  },
  {
    id: "seed_ben_co_003",
    name: "Laura Mejia",
    email: "laura.mejia@example.com",
    projectId: "seed_op_co_completed",
    projectName: "Monthly Settlements Colombia - April",
    country: "CO",
    bankName: "Banco de Bogota",
    accountNumber: "4455667788",
    accountType: "savings",
    phoneNumber: "+573007778899",
    documentType: "CC",
    documentNumber: "52345678",
  },
  {
    id: "seed_ben_co_004",
    name: "Nicolas Perez",
    email: "nicolas.perez@example.com",
    projectId: "seed_op_co_exception",
    projectName: "Ad-hoc Bonuses Colombia - April",
    country: "CO",
    bankName: "Nequi",
    accountNumber: "3001234567",
    accountType: "savings",
    phoneNumber: "+573001234567",
    documentType: "CC",
    documentNumber: "1002003004",
  },
  {
    id: "seed_ben_mx_001",
    name: "Diego Martinez",
    email: "diego.martinez@example.mx",
    projectId: "seed_op_mx_awaiting_funding",
    projectName: "Mexico Payroll - May",
    country: "MX",
    bankName: "BBVA Mexico",
    bankKey: "012180001234567890",
    bankKeyType: "CLABE",
    clabe: "012180001234567890",
    documentType: "RFC",
    documentNumber: "MARD900101AB1",
  },
  {
    id: "seed_ben_mx_002",
    name: "Ana Gutierrez",
    email: "ana.gutierrez@example.mx",
    projectId: "seed_op_mx_in_review",
    projectName: "Mexico Vendor Review - Week 19",
    country: "MX",
    bankName: "Santander Mexico",
    bankKey: "014180123456789012",
    bankKeyType: "CLABE",
    clabe: "014180123456789012",
    documentType: "RFC",
    documentNumber: "GUAO920202CD2",
  },
  {
    id: "seed_ben_mx_003",
    name: "Luis Hernandez",
    email: "luis.hernandez@example.mx",
    projectId: "seed_op_mx_in_review",
    projectName: "Mexico Vendor Review - Week 19",
    country: "MX",
    bankName: "Citibanamex",
    bankKey: "002180987654321098",
    bankKeyType: "CLABE",
    clabe: "002180987654321098",
    documentType: "RFC",
    documentNumber: "HEGL880303EF3",
  },
  {
    id: "seed_ben_ar_001",
    name: "Sofia Alvarez",
    email: "sofia.alvarez@example.ar",
    projectId: "seed_op_ar_validated",
    projectName: "Argentina Talent Onboarding - May",
    country: "AR",
    bankName: "Banco Galicia",
    bankKey: "2850590940090418135201",
    bankKeyType: "CBU",
    documentType: "CUIT",
    documentNumber: "27-30123456-8",
  },
  {
    id: "seed_ben_ar_002",
    name: "Mateo Fernandez",
    email: "mateo.fernandez@example.ar",
    projectId: "seed_op_ar_completed",
    projectName: "Argentina Settlements - April",
    country: "AR",
    bankName: "Banco Nacion",
    bankKey: "0110599540000001234567",
    bankKeyType: "CBU",
    documentType: "CUIT",
    documentNumber: "20-33445566-7",
  },
];

const payouts = [
  payout({
    id: "seed_pay_co_approval_001",
    batchId: "seed_op_co_awaiting_approval",
    beneficiaryId: "seed_ben_co_001",
    beneficiaryName: "Camila Torres",
    country: "CO",
    amountLocal: 2450000,
    status: "awaiting_approval",
    approvalStatus: "pending",
  }),
  payout({
    id: "seed_pay_co_dispatch_001",
    batchId: "seed_op_co_dispatching",
    beneficiaryId: "seed_ben_co_002",
    beneficiaryName: "Santiago Rojas",
    country: "CO",
    amountLocal: 3200000,
    status: "dispatching",
    approvalStatus: "approved",
  }),
  payout({
    id: "seed_pay_co_completed_001",
    batchId: "seed_op_co_completed",
    beneficiaryId: "seed_ben_co_003",
    beneficiaryName: "Laura Mejia",
    country: "CO",
    amountLocal: 2800000,
    status: "paid",
    approvalStatus: "approved",
    approvedAt: hoursAgo(4),
  }),
  payout({
    id: "seed_pay_co_exception_001",
    batchId: "seed_op_co_exception",
    beneficiaryId: "seed_ben_co_004",
    beneficiaryName: "Nicolas Perez",
    country: "CO",
    amountLocal: 760000,
    status: "failed",
    approvalStatus: "approved",
    approvalComment: "Approved before partner callback failure.",
  }),
  payout({
    id: "seed_pay_mx_funding_001",
    batchId: "seed_op_mx_awaiting_funding",
    beneficiaryId: "seed_ben_mx_001",
    beneficiaryName: "Diego Martinez",
    country: "MX",
    amountLocal: 42000,
    status: "awaiting_funding",
    approvalStatus: "approved",
  }),
  payout({
    id: "seed_pay_mx_review_001",
    batchId: "seed_op_mx_in_review",
    beneficiaryId: "seed_ben_mx_002",
    beneficiaryName: "Ana Gutierrez",
    country: "MX",
    amountLocal: 68000,
    status: "in_review",
    approvalStatus: "approved",
    validationErrors: ["Amount requires manual review for this corridor."],
  }),
  payout({
    id: "seed_pay_mx_review_002",
    batchId: "seed_op_mx_in_review",
    beneficiaryId: "seed_ben_mx_003",
    beneficiaryName: "Luis Hernandez",
    country: "MX",
    amountLocal: 31500,
    status: "funded",
    approvalStatus: "approved",
  }),
  payout({
    id: "seed_pay_ar_validated_001",
    batchId: "seed_op_ar_validated",
    beneficiaryId: "seed_ben_ar_001",
    beneficiaryName: "Sofia Alvarez",
    country: "AR",
    amountLocal: 980000,
    status: "validated",
    approvalStatus: "pending",
  }),
  payout({
    id: "seed_pay_ar_completed_001",
    batchId: "seed_op_ar_completed",
    beneficiaryId: "seed_ben_ar_002",
    beneficiaryName: "Mateo Fernandez",
    country: "AR",
    amountLocal: 1120000,
    status: "paid",
    approvalStatus: "approved",
    approvedAt: hoursAgo(3),
  }),
];

const batchSpecs = [
  { id: "seed_op_co_awaiting_approval", name: "Contractor Payroll Colombia - May", status: "awaiting_approval", createdAt: daysAgo(1) },
  { id: "seed_op_co_dispatching", name: "Vendor Payouts Colombia - Week 18", status: "dispatching", createdAt: daysAgo(2) },
  { id: "seed_op_co_completed", name: "Monthly Settlements Colombia - April", status: "completed", createdAt: daysAgo(5) },
  { id: "seed_op_co_exception", name: "Ad-hoc Bonuses Colombia - April", status: "failed", createdAt: daysAgo(3) },
  { id: "seed_op_mx_awaiting_funding", name: "Mexico Payroll - May", status: "awaiting_funding", createdAt: daysAgo(1) },
  { id: "seed_op_mx_in_review", name: "Mexico Vendor Review - Week 19", status: "in_review", createdAt: daysAgo(2) },
  { id: "seed_op_ar_validated", name: "Argentina Talent Onboarding - May", status: "validated", createdAt: daysAgo(1) },
  { id: "seed_op_ar_completed", name: "Argentina Settlements - April", status: "completed", createdAt: daysAgo(6) },
];

function totalsForBatch(batchId) {
  const batchPayouts = payouts.filter((item) => item.batchId === batchId);
  return {
    totalLocal: batchPayouts.reduce((sum, item) => sum + Number(item.amountLocal), 0),
    totalFundingUsdc: batchPayouts.reduce((sum, item) => sum + Number(item.fundingAmountUsdc), 0),
    payoutIds: batchPayouts.map((item) => item.id),
  };
}

function quoteSnapshot(batchId) {
  const batchPayouts = payouts.filter((item) => item.batchId === batchId);
  return {
    payouts: batchPayouts.map((item) => ({
      payoutId: item.id,
      feeLocal: Number(item.feeLocal),
      fxRate: Number(item.fxRate),
      fundingAmountUsdc: Number(item.fundingAmountUsdc),
    })),
  };
}

async function clearSeedData() {
  await prisma.webhookEvent.deleteMany({ where: { eventId: { startsWith: "seed_" } } });
  await prisma.ledgerEntry.deleteMany({ where: { OR: [{ batchId: { in: batchIds } }, { payoutId: { startsWith: "seed_pay_" } }] } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ batchId: { in: batchIds } }, { entityId: { startsWith: "seed_" } }] } });
  await prisma.exceptionCase.deleteMany({ where: { OR: [{ batchId: { in: batchIds } }, { payoutId: { startsWith: "seed_pay_" } }] } });
  await prisma.complianceCase.deleteMany({ where: { OR: [{ batchId: { in: batchIds } }, { payoutId: { startsWith: "seed_pay_" } }] } });
  await prisma.approvalDecision.deleteMany({ where: { batchId: { in: batchIds } } });
  await prisma.fundingTransaction.deleteMany({ where: { fundingInstruction: { batchId: { in: batchIds } } } });
  await prisma.fundingInstruction.deleteMany({ where: { batchId: { in: batchIds } } });
  await prisma.quote.deleteMany({ where: { batchId: { in: batchIds } } });
  await prisma.payout.deleteMany({ where: { id: { startsWith: "seed_pay_" } } });
  await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  await prisma.beneficiary.deleteMany({ where: { id: { in: beneficiaryIds } } });
}

async function seedBaseActors() {
  await prisma.company.upsert({
    where: { id: companyId },
    update: {
      legalName: "Acme Global Services LLC",
      displayName: "Acme Global",
      country: "US",
      onboardingStatus: "active",
      webhookUrl: "https://client.example.com/webhooks/payouts",
    },
    create: {
      id: companyId,
      legalName: "Acme Global Services LLC",
      displayName: "Acme Global",
      country: "US",
      onboardingStatus: "active",
      webhookUrl: "https://client.example.com/webhooks/payouts",
    },
  });

  await prisma.authorizedWallet.upsert({
    where: { id: "seed_wallet_acme_001" },
    update: { address: process.env.DEFAULT_AUTHORIZED_WALLETS?.split(",")[0] ?? "ACME-FUNDING-WALLET-001" },
    create: {
      id: "seed_wallet_acme_001",
      companyId,
      address: process.env.DEFAULT_AUTHORIZED_WALLETS?.split(",")[0] ?? "ACME-FUNDING-WALLET-001",
    },
  });

  const users = [
    { id: financeUserId, email: "finance.seed@acme-pay.com", name: "Finance Ops", role: "finance_operator" },
    { id: approverUserId, email: "approver.seed@acme-pay.com", name: "Ana Approver", role: "approver" },
    { id: complianceUserId, email: "compliance.seed@acme-pay.com", name: "Compliance Review", role: "compliance_reviewer" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
      },
      create: {
        ...user,
        companyId,
        password: "demo123",
        isActive: true,
      },
    });
  }
}

async function seedBeneficiaries() {
  for (const item of beneficiaries) {
    await prisma.beneficiary.create({
      data: {
        ...item,
        companyId,
        currency: currencyFor(item.country),
        kind: "contractor",
        accountHolderName: item.name,
        validationStatus: "valid",
        createdAt: daysAgo(12),
      },
    });
  }
}

async function seedBatchesAndPayouts() {
  for (const spec of batchSpecs) {
    const totals = totalsForBatch(spec.id);
    await prisma.batch.create({
      data: {
        id: spec.id,
        companyId,
        name: spec.name,
        createdByUserId: financeUserId,
        status: spec.status,
        totalLocal: money(totals.totalLocal),
        totalFundingUsdc: usdc(totals.totalFundingUsdc),
        quoteId: ["validated", "awaiting_approval"].includes(spec.status) ? null : `seed_quote_${spec.id}`,
        createdAt: spec.createdAt,
      },
    });
  }

  for (const item of payouts) {
    await prisma.payout.create({ data: item });
  }

  for (const spec of batchSpecs.filter((item) => !["validated", "awaiting_approval"].includes(item.status))) {
    const totals = totalsForBatch(spec.id);
    await prisma.quote.create({
      data: {
        id: `seed_quote_${spec.id}`,
        batchId: spec.id,
        expiresAt: daysAgo(-2),
        totalFundingUsdc: usdc(totals.totalFundingUsdc),
        totalFeesLocal: money(payouts.filter((item) => item.batchId === spec.id).reduce((sum, item) => sum + Number(item.feeLocal), 0)),
        snapshot: quoteSnapshot(spec.id),
        createdAt: hoursAgo(30),
      },
    });
  }

  for (const spec of batchSpecs.filter((item) => !["validated", "awaiting_approval"].includes(item.status))) {
    await prisma.approvalDecision.create({
      data: {
        id: `seed_approval_${spec.id}`,
        batchId: spec.id,
        actorId: approverUserId,
        actorName: "Ana Approver",
        outcome: "approved",
        comment: "Seeded approval for demo operations.",
        createdAt: hoursAgo(26),
      },
    });
  }
}

async function seedFundingAndOperationalSignals() {
  const fundedBatchIds = ["seed_op_co_dispatching", "seed_op_co_completed", "seed_op_co_exception", "seed_op_mx_in_review", "seed_op_ar_completed"];
  const pendingFundingBatchIds = ["seed_op_mx_awaiting_funding"];

  for (const batchId of [...fundedBatchIds, ...pendingFundingBatchIds]) {
    const totals = totalsForBatch(batchId);
    const reconciled = fundedBatchIds.includes(batchId);
    await prisma.fundingInstruction.create({
      data: {
        id: `seed_funding_${batchId}`,
        batchId,
        chain: "solana",
        cluster: process.env.SOLANA_CLUSTER ?? "devnet",
        asset: "USDC",
        walletAddress: process.env.DEFAULT_AUTHORIZED_WALLETS?.split(",")[0] ?? "ACME-FUNDING-WALLET-001",
        recipientAddress: process.env.SOLANA_TREASURY_WALLET ?? "SEED-TREASURY-WALLET",
        recipientTokenAccount: `seed_treasury_ata_${batchId}`,
        tokenMint: process.env.SOLANA_USDC_MINT ?? "SEED-USDC-MINT",
        reference: `seed_ref_${batchId}`,
        expectedAmount: usdc(totals.totalFundingUsdc),
        memo: `Seed funding for ${batchId}`,
        status: reconciled ? "reconciled" : "pending",
        expiresAt: daysAgo(-3),
        lastScanAt: reconciled ? hoursAgo(3) : null,
        latestSignature: reconciled ? `seed_sig_${batchId}` : null,
        createdAt: hoursAgo(24),
      },
    });

    if (reconciled) {
      await prisma.fundingTransaction.create({
        data: {
          id: `seed_funding_tx_${batchId}`,
          fundingInstructionId: `seed_funding_${batchId}`,
          txHash: `seed_tx_${batchId}`,
          signature: `seed_sig_${batchId}`,
          amountReceived: usdc(totals.totalFundingUsdc),
          status: "reconciled",
          fromAddress: process.env.DEFAULT_AUTHORIZED_WALLETS?.split(",")[0] ?? "ACME-FUNDING-WALLET-001",
          toAddress: process.env.SOLANA_TREASURY_WALLET ?? "SEED-TREASURY-WALLET",
          rawAmount: Math.round(totals.totalFundingUsdc * 10 ** 6).toString(),
          reconciledAmount: usdc(totals.totalFundingUsdc),
          confirmedAt: hoursAgo(20),
          detectionSource: "manual",
          eventId: `seed_event_${batchId}`,
          createdAt: hoursAgo(20),
        },
      });
    }
  }

  await prisma.exceptionCase.create({
    data: {
      id: "seed_exception_co_payout_failed",
      batchId: "seed_op_co_exception",
      payoutId: "seed_pay_co_exception_001",
      type: "payout_failed",
      country: "CO",
      status: "open",
      summary: "Partner callback reported rejected bank account details.",
      createdAt: hoursAgo(8),
    },
  });

  await prisma.exceptionCase.create({
    data: {
      id: "seed_exception_mx_manual_review",
      batchId: "seed_op_mx_in_review",
      payoutId: "seed_pay_mx_review_001",
      type: "manual_review",
      country: "MX",
      status: "open",
      summary: "High-value payout requires manual review before dispatch.",
      createdAt: hoursAgo(10),
    },
  });

  await prisma.complianceCase.create({
    data: {
      id: "seed_compliance_mx_review",
      batchId: "seed_op_mx_in_review",
      payoutId: "seed_pay_mx_review_001",
      reason: "Amount exceeds standard review threshold for MX corridor.",
      status: "open",
      createdAt: hoursAgo(10),
    },
  });

  const ledgerRows = [
    { id: "seed_ledger_co_dispatch_funding", batchId: "seed_op_co_dispatching", type: "funding_received", amount: totalsForBatch("seed_op_co_dispatching").totalFundingUsdc, note: "Seed funding received." },
    { id: "seed_ledger_co_completed_settled", batchId: "seed_op_co_completed", payoutId: "seed_pay_co_completed_001", type: "payout_settled", amount: Number(payouts.find((item) => item.id === "seed_pay_co_completed_001").fundingAmountUsdc), note: "Seed payout settled." },
    { id: "seed_ledger_ar_completed_settled", batchId: "seed_op_ar_completed", payoutId: "seed_pay_ar_completed_001", type: "payout_settled", amount: Number(payouts.find((item) => item.id === "seed_pay_ar_completed_001").fundingAmountUsdc), note: "Seed payout settled." },
  ];

  for (const row of ledgerRows) {
    await prisma.ledgerEntry.create({
      data: {
        ...row,
        amount: usdc(row.amount),
        currency: "USDC",
        createdAt: hoursAgo(3),
      },
    });
  }

  for (const spec of batchSpecs) {
    await prisma.auditLog.create({
      data: {
        id: `seed_audit_${spec.id}`,
        batchId: spec.id,
        entityType: "batch",
        entityId: spec.id,
        action: `seed.${spec.status}`,
        actorType: "system",
        actorId: "seed-script",
        actorName: "Seed script",
        metadata: { status: spec.status },
        createdAt: spec.createdAt,
      },
    });
  }
}

async function main() {
  await clearSeedData();
  await seedBaseActors();
  await seedBeneficiaries();
  await seedBatchesAndPayouts();
  await seedFundingAndOperationalSignals();

  console.log(`Seeded ${batchSpecs.length} operations, ${payouts.length} payouts, and ${beneficiaries.length} beneficiaries.`);
  console.log("Demo company:", companyId);
}

try {
  await main();
} catch (error) {
  if (error?.name === "PrismaClientInitializationError") {
    console.error("Could not connect to the database.");
    console.error("Make sure PostgreSQL is running and the Prisma schema is applied:");
    console.error("  docker compose up -d");
    console.error("  pnpm --filter @latam-payouts/api prisma:push");
    console.error("  pnpm --filter @latam-payouts/api seed:operations");
    process.exit(1);
  }

  throw error;
} finally {
  await prisma.$disconnect();
}
