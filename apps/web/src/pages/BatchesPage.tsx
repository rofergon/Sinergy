import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { BatchStatus, CreateBatchDto, Payout, SessionUser, UpdatePayoutDto } from "@latam-payouts/contracts";
import type { Transaction } from "@solana/web3.js";
import { MetricIcon } from "../components/icons";
import { initialBatchForm, initialCsvImport } from "../constants/forms";
import type { BatchDetail, Beneficiary, BootstrapPayload } from "../lib/api";

type BatchesPageProps = {
  data: BootstrapPayload | null;
  session: SessionUser;
  selectedBatch: BatchDetail | null;
  batchForm: CreateBatchDto;
  setBatchForm: (next: CreateBatchDto) => void;
  csvImport: string;
  setCsvImport: (next: string) => void;
  openBatch: (id: string) => void;
  onRefreshProjects: () => Promise<void>;
  onClearSelection: () => void;
  onCreateBatch: () => Promise<BatchDetail | undefined>;
  onImportBatch: () => Promise<BatchDetail | undefined>;
  onUpdatePayout: (payoutId: string, body: UpdatePayoutDto) => void;
  onQuote: (batchId: string) => void;
  onApprove: (batchId: string) => void;
  onGenerateFunding: (batchId: string) => void;
  onRefreshFunding: (instructionId: string) => void;
  onRecordFallbackFunding: (instructionId: string, payload: { txHash: string; amountReceived: number }) => Promise<BatchDetail | undefined>;
  onDispatch: (payoutId: string) => void;
  onSendApproved: (batchId: string) => void;
};

type DetailTab = "overview" | "people" | "approvals" | "funding" | "exceptions" | "audit";
type CreateProjectMode = "manual" | "csv";
type CountryFilter = "ALL" | "CO" | "MX" | "AR" | "UNKNOWN";
type ManualFundingForm = {
  txHash: string;
  amountReceived: string;
  confirmed: boolean;
};

type BrowserSolanaProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toBase58(): string };
  connect: () => Promise<{ publicKey: { toBase58(): string } }>;
  signMessage?: (message: Uint8Array, display?: "utf8" | "hex") => Promise<Uint8Array>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string } | string>;
};

declare global {
  interface Window {
    solana?: BrowserSolanaProvider;
    solflare?: BrowserSolanaProvider;
  }
}

type ProjectTableRow = {
  batchId: string;
  batchName: string;
  status: BatchStatus;
  country: CountryFilter;
  people: number;
  approved: number;
  pending: number;
  fundingRequired: number;
  lastActivity: string;
  fundingInstructionId?: string;
};

const demoFlowSteps = [
  { id: "login", label: "Login", note: "Admin demo user" },
  { id: "upload", label: "Upload batch", note: "Import CSV" },
  { id: "employees", label: "Approve employees", note: "Mark payable rows" },
  { id: "batch", label: "Approve batch", note: "Treasury sign-off" },
  { id: "execute", label: "Automated payouts", note: "Fund and send" },
];

const detailTabs: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "People" },
  { id: "approvals", label: "Approvals" },
  { id: "funding", label: "Funding" },
  { id: "exceptions", label: "Exceptions" },
  { id: "audit", label: "Audit" },
];

const editableProjectStatuses = ["draft", "validated", "quoted", "awaiting_approval", "approved"];

const countryMeta: Record<Exclude<CountryFilter, "ALL" | "UNKNOWN">, { label: string; flag: string }> = {
  CO: { label: "Colombia", flag: "/flags/co.svg" },
  MX: { label: "Mexico", flag: "/flags/mx.svg" },
  AR: { label: "Argentina", flag: "/flags/ar.svg" },
};

function formatMoney(value: number, currency: string) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

function getEstimatedFxRate(country: string) {
  return country === "CO" ? 4100 : 17.2;
}

function getPayoutUsdcAmount(payout: Payout) {
  return Number((payout.amountLocal / getEstimatedFxRate(payout.country)).toFixed(2));
}

function getLocalAmountFromUsdc(usdcAmount: number, country: string) {
  return Math.round(usdcAmount * getEstimatedFxRate(country));
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function getBatchTone(status: string) {
  if (["approved", "funded", "completed"].includes(status)) {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  if (["quoted", "awaiting_approval", "awaiting_funding", "dispatching", "in_review"].includes(status)) {
    return "warning";
  }
  return "neutral";
}

function getApprovalTone(status: Payout["approvalStatus"]) {
  if (status === "approved") {
    return "success";
  }
  if (status === "excluded") {
    return "danger";
  }
  return "warning";
}

function getCountryLabel(country: CountryFilter) {
  if (country === "UNKNOWN") {
    return "No country";
  }
  if (country === "ALL") {
    return "All countries";
  }
  return countryMeta[country].label;
}

function getDominantCountry(payouts: BootstrapPayload["payouts"], beneficiaries: Beneficiary[], batchId: string): CountryFilter {
  if (payouts.length) {
    const counts = payouts.reduce<Record<string, number>>((accumulator, payout) => {
      accumulator[payout.country] = (accumulator[payout.country] ?? 0) + 1;
      return accumulator;
    }, {});
    const sorted = Object.entries(counts).sort((left, right) => right[1] - left[1]);
    return (sorted[0]?.[0] as CountryFilter | undefined) ?? "UNKNOWN";
  }

  const beneficiary = beneficiaries.find((candidate) => candidate.projectId === batchId);
  return (beneficiary?.country as CountryFilter | undefined) ?? "UNKNOWN";
}

function getNextActionLabel(row: ProjectTableRow, selectedBatch: BatchDetail | null) {
  if (["draft", "validated"].includes(row.status)) {
    return "Continue setup";
  }
  if (["quoted", "awaiting_approval"].includes(row.status)) {
    return "Review approvals";
  }
  if (row.status === "approved" && !row.fundingInstructionId) {
    return "Generate funding";
  }
  if (row.status === "awaiting_funding") {
    return "Refresh funding";
  }
  if (["funded", "dispatching"].includes(row.status)) {
    return "View execution";
  }
  if (row.status === "failed") {
    return "Review exception";
  }
  if (row.status === "completed") {
    return "View details";
  }

  if (selectedBatch?.batch.id === row.batchId && selectedBatch.fundingInstruction) {
    return "Refresh funding";
  }

  return "Open project";
}

function getFundingStepItems(selectedBatch: BatchDetail) {
  const hasExecution = selectedBatch.payouts.some((payout) => ["paid", "failed", "in_review", "dispatching"].includes(payout.status));
  return [
    {
      id: 1,
      label: "People loaded",
      note: `${selectedBatch.payouts.length} people loaded`,
      done: selectedBatch.payouts.length > 0,
    },
    {
      id: 2,
      label: "Quote",
      note: selectedBatch.quote ? `${selectedBatch.quote.totalFundingUsdc.toFixed(2)} USDC required` : "Quote calculates fees and FX",
      done: Boolean(selectedBatch.quote),
    },
    {
      id: 3,
      label: "Approval",
      note: ["approved", "awaiting_funding", "funded", "dispatching", "in_review", "completed", "failed"].includes(selectedBatch.batch.status)
        ? "Project approved"
        : "Approver sign-off required",
      done: ["approved", "awaiting_funding", "funded", "dispatching", "in_review", "completed", "failed"].includes(selectedBatch.batch.status),
    },
    {
      id: 4,
      label: "Funding instructions",
      note: selectedBatch.fundingInstruction ? "Treasury destination generated" : "Pending instruction",
      done: Boolean(selectedBatch.fundingInstruction),
    },
    {
      id: 5,
      label: "Funding reconciled",
      note: selectedBatch.fundingInstruction?.status === "reconciled" ? "USDC received and reserved" : "Awaiting USDC transfer",
      done: selectedBatch.fundingInstruction?.status === "reconciled",
    },
    {
      id: 6,
      label: "Payout execution",
      note: hasExecution ? "Approved payouts auto-dispatched" : "Starts automatically after funding",
      done: hasExecution,
    },
    {
      id: 7,
      label: "Exceptions",
      note: selectedBatch.payouts.some((payout) => ["failed", "in_review"].includes(payout.status)) ? "Review required" : "No payout blockers",
      done: !selectedBatch.payouts.some((payout) => ["failed", "in_review"].includes(payout.status)),
    },
  ];
}

function getDemoFlowState(selectedBatch: BatchDetail | null) {
  if (!selectedBatch) {
    return { activeStep: "upload", completedSteps: new Set(["login"]) };
  }

  const completedSteps = new Set<string>(["login", "upload"]);
  const hasApprovedPeople = selectedBatch.payouts.length > 0 && selectedBatch.payouts.every((payout) => payout.approvalStatus !== "pending");
  const isBatchApproved = ["approved", "awaiting_funding", "funded", "dispatching", "in_review", "completed", "failed"].includes(selectedBatch.batch.status);
  const hasExecution = selectedBatch.payouts.some((payout) => ["paid", "failed", "in_review", "dispatching"].includes(payout.status));

  if (hasApprovedPeople) {
    completedSteps.add("employees");
  }
  if (isBatchApproved) {
    completedSteps.add("batch");
  }
  if (hasExecution || selectedBatch.batch.status === "completed") {
    completedSteps.add("execute");
  }

  let activeStep = "employees";
  if (!hasApprovedPeople) {
    activeStep = "employees";
  } else if (!isBatchApproved) {
    activeStep = "batch";
  } else {
    activeStep = "execute";
  }

  return { activeStep, completedSteps };
}

function getNextActionDescription(row: ProjectTableRow | undefined, selectedBatch: BatchDetail | null) {
  if (!row) {
    return "Open or create a payment project to continue.";
  }
  if (["draft", "validated"].includes(row.status)) {
    return "Review people, approve the payable rows, then generate a quote before the treasury approver signs off.";
  }
  if (row.status === "quoted") {
    return "The quote is ready. Ask an approver to review fees, FX, and the USDC requirement.";
  }
  if (row.status === "awaiting_approval") {
    return "Approval is required before treasury can fund this project.";
  }
  if (row.status === "approved" && !selectedBatch?.fundingInstruction) {
    return "Generate the USDC destination, reference, and memo for treasury.";
  }
  if (row.status === "awaiting_funding") {
    return "Send USDC from an authorized wallet, then refresh or record the funding transaction.";
  }
  if (["funded", "dispatching"].includes(row.status)) {
    return "Funding is reconciled. Approved payouts are auto-dispatched by the platform.";
  }
  if (row.status === "in_review") {
    return "One or more payouts need compliance review before completion.";
  }
  if (row.status === "failed") {
    return "Open the project exceptions to see the failed payout reason and the recommended recovery step.";
  }
  return "Review the final status, audit trail, and reports for this project.";
}

function getExceptionGuidance(type: string) {
  if (type === "payout_failed") {
    return "The payout provider returned a failure. Review the affected person's bank details before retrying in a replacement project.";
  }
  if (type === "manual_review") {
    return "Compliance review is required before this payout can continue.";
  }
  if (type === "funding_incomplete") {
    return "Treasury sent less USDC than required. Top up the same funding instruction and refresh funding.";
  }
  if (type === "funding_wallet_unauthorized") {
    return "The USDC came from a wallet that is not authorized in Company settings.";
  }
  if (type === "quote_expired") {
    return "Generate a fresh quote and send the project back through approval.";
  }
  return "Review the affected payment, audit trail, and funding activity before resolving.";
}

function buildFundingInstructionText(selectedBatch: BatchDetail) {
  const instruction = selectedBatch.fundingInstruction;
  if (!instruction) {
    return "";
  }

  return [
    `Project: ${selectedBatch.batch.name}`,
    `Amount due: ${instruction.expectedAmount.toFixed(2)} ${instruction.asset}`,
    `Network: Solana ${instruction.cluster}`,
    `Internal vault owner: ${instruction.recipientAddress}`,
    `Internal USDC vault account: ${instruction.recipientTokenAccount}`,
    `Reference: ${instruction.reference}`,
    `Memo: ${instruction.memo ?? "N/A"}`,
  ].join("\n");
}

function getRpcUrlForCluster(cluster?: string) {
  if (import.meta.env.VITE_SOLANA_RPC_URL) {
    return import.meta.env.VITE_SOLANA_RPC_URL;
  }
  if (cluster === "mainnet-beta") {
    return "https://api.mainnet-beta.solana.com";
  }
  if (cluster === "devnet") {
    return "https://api.devnet.solana.com";
  }
  if (cluster === "localnet") {
    return "http://127.0.0.1:8899";
  }
  return "https://api.testnet.solana.com";
}

async function ensureBrowserBuffer() {
  const target = globalThis as typeof globalThis & { Buffer?: unknown };
  if (!target.Buffer) {
    const { Buffer } = await import("buffer");
    target.Buffer = Buffer;
  }
}

function getInjectedSolanaProvider() {
  return window.solflare ?? window.solana;
}

export function BatchesPage({
  data,
  session,
  selectedBatch,
  batchForm,
  setBatchForm,
  csvImport,
  setCsvImport,
  openBatch,
  onRefreshProjects,
  onClearSelection,
  onCreateBatch,
  onImportBatch,
  onUpdatePayout,
  onQuote,
  onApprove,
  onGenerateFunding,
  onRefreshFunding,
  onRecordFallbackFunding,
  onDispatch,
  onSendApproved,
}: BatchesPageProps) {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "ALL">("ALL");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("ALL");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateProjectMode>("manual");
  const [selectedBeneficiaryIdToAdd, setSelectedBeneficiaryIdToAdd] = useState("");
  const [selectedBeneficiaryAmountLocal, setSelectedBeneficiaryAmountLocal] = useState("");
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [isManualFundingOpen, setIsManualFundingOpen] = useState(false);
  const [manualFundingForm, setManualFundingForm] = useState<ManualFundingForm>({ txHash: "", amountReceived: "", confirmed: false });
  const [isRecordingFunding, setIsRecordingFunding] = useState(false);
  const [fundingCopied, setFundingCopied] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState("");
  const [walletFundingMessage, setWalletFundingMessage] = useState("");
  const [isWalletFunding, setIsWalletFunding] = useState(false);
  const [selectedApprovalPayoutIds, setSelectedApprovalPayoutIds] = useState<Set<string>>(new Set());
  const [isSigningApprovals, setIsSigningApprovals] = useState(false);
  const [approvalSignatureMessage, setApprovalSignatureMessage] = useState("");

  const beneficiaries = data?.beneficiaries ?? [];
  const batches = data?.batches ?? [];
  const payouts = data?.payouts ?? [];
  const isFinanceOperator = session.role === "finance_operator";
  const isApprover = session.role === "approver";
  const isAdmin = session.role === "admin";
  const canManageWorkspace = isFinanceOperator || isAdmin;
  const canApproveProject = isApprover || isAdmin;
  const canEditPayoutApprovals = isFinanceOperator || isApprover || isAdmin;
  const selectedProjectPayouts = selectedBatch?.payouts ?? [];
  const canEditProject = selectedBatch ? editableProjectStatuses.includes(selectedBatch.batch.status) && canEditPayoutApprovals : false;
  const selectedBeneficiaryOption = beneficiaries.find((beneficiary) => beneficiary.id === selectedBeneficiaryIdToAdd) ?? null;

  useEffect(() => {
    const batchIdFromUrl = searchParams.get("batch");
    if (batchIdFromUrl && selectedBatch?.batch.id !== batchIdFromUrl && batches.some((batch) => batch.id === batchIdFromUrl)) {
      openBatch(batchIdFromUrl);
      return;
    }

    if (!batchIdFromUrl && !selectedBatch && batches.length) {
      openBatch(batches[0].id);
    }
  }, [batches, openBatch, searchParams, selectedBatch]);

  useEffect(() => {
    setSelectedApprovalPayoutIds(new Set(selectedProjectPayouts.filter((payout) => payout.approvalStatus === "pending").map((payout) => payout.id)));
    setApprovalSignatureMessage("");
  }, [selectedBatch?.batch.id, selectedProjectPayouts.length]);

  const projectRows = useMemo<ProjectTableRow[]>(() => {
    return batches.map((batch) => {
      const batchPayouts = payouts.filter((payout) => payout.batchId === batch.id);
      const approved = batchPayouts.filter((payout) => payout.approvalStatus === "approved").length;
      const pending = batchPayouts.filter((payout) => payout.approvalStatus === "pending").length;
      const country = getDominantCountry(batchPayouts, beneficiaries, batch.id);
      const isSelected = selectedBatch?.batch.id === batch.id;
      const lastActivity = isSelected && selectedBatch.auditTrail[0] ? selectedBatch.auditTrail[0].createdAt : batch.createdAt;

      return {
        batchId: batch.id,
        batchName: batch.name,
        status: batch.status,
        country,
        people: batchPayouts.length,
        approved,
        pending,
        fundingRequired: batch.totalFundingUsdc,
        lastActivity,
        fundingInstructionId: isSelected ? selectedBatch.fundingInstruction?.id : undefined,
      };
    });
  }, [batches, beneficiaries, payouts, selectedBatch]);

  const selectedProjectRow = selectedBatch ? projectRows.find((row) => row.batchId === selectedBatch.batch.id) : undefined;
  const selectedOpenExceptions = (data?.exceptions ?? []).filter((entry) => entry.status === "open" && entry.batchId === selectedBatch?.batch.id);
  const demoFlowState = getDemoFlowState(selectedBatch);
  const selectedNextActionLabel = getNextActionLabel(
    selectedProjectRow ?? {
      batchId: selectedBatch?.batch.id ?? "",
      batchName: selectedBatch?.batch.name ?? "",
      status: selectedBatch?.batch.status ?? "draft",
      country: "UNKNOWN",
      people: selectedProjectPayouts.length,
      approved: selectedProjectPayouts.filter((payout) => payout.approvalStatus === "approved").length,
      pending: selectedProjectPayouts.filter((payout) => payout.approvalStatus === "pending").length,
      fundingRequired: selectedBatch?.batch.totalFundingUsdc ?? 0,
      lastActivity: selectedBatch?.batch.createdAt ?? new Date().toISOString(),
      fundingInstructionId: selectedBatch?.fundingInstruction?.id,
    },
    selectedBatch,
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return projectRows.filter((row) => {
      const matchesSearch = normalizedSearch ? row.batchName.toLowerCase().includes(normalizedSearch) : true;
      const matchesStatus = statusFilter === "ALL" ? true : row.status === statusFilter;
      const matchesCountry = countryFilter === "ALL" ? true : row.country === countryFilter;
      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [countryFilter, projectRows, search, statusFilter]);

  const selectedProjectStats = useMemo(() => {
    const approved = selectedProjectPayouts.filter((payout) => payout.approvalStatus === "approved");
    const excluded = selectedProjectPayouts.filter((payout) => payout.approvalStatus === "excluded");
    const pending = selectedProjectPayouts.filter((payout) => payout.approvalStatus === "pending");
    const paid = selectedProjectPayouts.filter((payout) => payout.status === "paid");
    const failed = selectedProjectPayouts.filter((payout) => payout.status === "failed");
    return { approved, excluded, pending, paid, failed };
  }, [selectedProjectPayouts]);

  const availableBeneficiaries = useMemo(
    () => beneficiaries.filter((beneficiary) => !batchForm.payouts.some((payout) => payout.beneficiaryId === beneficiary.id)),
    [batchForm.payouts, beneficiaries],
  );

  function addDraftPayout() {
    if (!selectedBeneficiaryIdToAdd || batchForm.payouts.some((payout) => payout.beneficiaryId === selectedBeneficiaryIdToAdd)) {
      return;
    }

    setBatchForm({
      ...batchForm,
      payouts: [...batchForm.payouts, { beneficiaryId: selectedBeneficiaryIdToAdd, amountLocal: Number(selectedBeneficiaryAmountLocal) }],
    });
    setSelectedBeneficiaryIdToAdd("");
    setSelectedBeneficiaryAmountLocal("");
  }

  function updateDraftAmount(index: number, amountLocal: number) {
    const next = [...batchForm.payouts];
    next[index] = { ...next[index], amountLocal };
    setBatchForm({ ...batchForm, payouts: next });
  }

  function removeDraftPayout(index: number) {
    setBatchForm({ ...batchForm, payouts: batchForm.payouts.filter((_, itemIndex) => itemIndex !== index) });
  }

  function resetCreateProjectState() {
    setBatchForm({ ...initialBatchForm });
    setCsvImport(initialCsvImport);
    setSelectedBeneficiaryIdToAdd("");
    setSelectedBeneficiaryAmountLocal("");
    setCreateMode("manual");
  }

  function openCreateProjectModal(mode: CreateProjectMode) {
    setCreateMode(mode);
    setIsCreateModalOpen(true);
  }

  function closeCreateProjectModal() {
    setIsCreateModalOpen(false);
    resetCreateProjectState();
  }

  async function handleCreateProject() {
    setIsSubmittingProject(true);
    try {
      const detail = await onCreateBatch();
      if (detail) {
        closeCreateProjectModal();
      }
    } finally {
      setIsSubmittingProject(false);
    }
  }

  async function handleImportProject() {
    setIsSubmittingProject(true);
    try {
      const detail = await onImportBatch();
      if (detail) {
        closeCreateProjectModal();
      }
    } finally {
      setIsSubmittingProject(false);
    }
  }

  function handleCsvFileUpload(file: File | null) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCsvImport(String(reader.result ?? ""));
      if (!batchForm.name || batchForm.name === initialBatchForm.name) {
        setBatchForm({ ...batchForm, name: file.name.replace(/\.csv$/i, "").replace(/[-_]/g, " ") });
      }
    };
    reader.readAsText(file);
  }

  function openManualFundingModal() {
    if (!selectedBatch?.fundingInstruction) {
      return;
    }

    setManualFundingForm({
      txHash: "",
      amountReceived: selectedBatch.fundingInstruction.expectedAmount.toFixed(2),
      confirmed: false,
    });
    setIsManualFundingOpen(true);
  }

  function closeManualFundingModal() {
    setIsManualFundingOpen(false);
    setManualFundingForm({ txHash: "", amountReceived: "", confirmed: false });
  }

  async function handleRecordManualFunding() {
    if (!selectedBatch?.fundingInstruction) {
      return;
    }

    setIsRecordingFunding(true);
    try {
      const detail = await onRecordFallbackFunding(selectedBatch.fundingInstruction.id, {
        txHash: manualFundingForm.txHash.trim(),
        amountReceived: Number(manualFundingForm.amountReceived),
      });
      if (detail) {
        closeManualFundingModal();
      }
    } finally {
      setIsRecordingFunding(false);
    }
  }

  async function copyFundingDetails() {
    if (!selectedBatch?.fundingInstruction) {
      return;
    }

    await navigator.clipboard?.writeText(buildFundingInstructionText(selectedBatch));
    setFundingCopied(true);
    window.setTimeout(() => setFundingCopied(false), 1600);
  }

  async function connectFundingWallet() {
    const provider = getInjectedSolanaProvider();
    if (!provider) {
      setWalletFundingMessage("No Solana wallet detected. Open this page in Chrome with Solflare enabled, then refresh the tab.");
      return undefined;
    }

    const response = await provider.connect();
    const publicKey = response.publicKey ?? provider.publicKey;
    if (!publicKey) {
      setWalletFundingMessage("Wallet connected, but no public key was returned. Unlock Solflare and try again.");
      return undefined;
    }

    const walletAddress = publicKey.toBase58();
    setConnectedWallet(walletAddress);
    setWalletFundingMessage("");
    return { provider, walletAddress };
  }

  async function fundSelectedProjectWithWallet() {
    if (!selectedBatch?.fundingInstruction) {
      return;
    }

    setIsWalletFunding(true);
    setWalletFundingMessage("Preparing wallet transaction...");
    try {
      const provider = getInjectedSolanaProvider();
      const connected = connectedWallet && provider ? { provider, walletAddress: connectedWallet } : await connectFundingWallet();
      if (!connected) {
        return;
      }

      await ensureBrowserBuffer();
      const [{ createTransferCheckedInstruction, getAssociatedTokenAddressSync }, { Connection, PublicKey, Transaction }] = await Promise.all([
        import("@solana/spl-token"),
        import("@solana/web3.js"),
      ]);
      const instruction = selectedBatch.fundingInstruction;
      const decimals = Number(import.meta.env.VITE_SOLANA_USDC_DECIMALS ?? 6);
      const connection = new Connection(getRpcUrlForCluster(instruction.cluster), "confirmed");
      const owner = new PublicKey(connected.walletAddress);
      const mint = new PublicKey(instruction.tokenMint);
      const sourceTokenAccount = getAssociatedTokenAddressSync(mint, owner);
      const destinationTokenAccount = new PublicKey(instruction.recipientTokenAccount);
      const reference = new PublicKey(instruction.reference);
      const rawAmount = BigInt(Math.round(instruction.expectedAmount * 10 ** decimals));
      const transferInstruction = createTransferCheckedInstruction(
        sourceTokenAccount,
        mint,
        destinationTokenAccount,
        owner,
        rawAmount,
        decimals,
      );

      transferInstruction.keys.push({ pubkey: reference, isSigner: false, isWritable: false });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: owner,
        recentBlockhash: blockhash,
      }).add(transferInstruction);

      let signature: string;
      if (connected.provider.signAndSendTransaction) {
        const result = await connected.provider.signAndSendTransaction(transaction);
        signature = typeof result === "string" ? result : result.signature;
      } else if (connected.provider.signTransaction) {
        const signed = await connected.provider.signTransaction(transaction);
        signature = await connection.sendRawTransaction(signed.serialize());
      } else {
        throw new Error("Connected wallet cannot sign Solana transactions.");
      }

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      setWalletFundingMessage(`Funding transfer submitted: ${signature}`);
      onRefreshFunding(instruction.id);
    } catch (error) {
      setWalletFundingMessage(error instanceof Error ? error.message : "Wallet funding failed.");
    } finally {
      setIsWalletFunding(false);
    }
  }

  function handleSelectedNextAction() {
    if (!selectedBatch) {
      return;
    }

    const row = selectedProjectRow;
    if (row?.status === "approved" && !selectedBatch.fundingInstruction && canManageWorkspace) {
      onGenerateFunding(selectedBatch.batch.id);
      setActiveTab("funding");
      return;
    }

    if (row?.status === "awaiting_funding" && selectedBatch.fundingInstruction && canManageWorkspace) {
      setActiveTab("funding");
      return;
    }

    if (["draft", "validated", "quoted", "awaiting_approval"].includes(selectedBatch.batch.status)) {
      setActiveTab("approvals");
      return;
    }

    if (["funded", "dispatching", "completed"].includes(selectedBatch.batch.status)) {
      setActiveTab("people");
      return;
    }

    setActiveTab(selectedOpenExceptions.length ? "exceptions" : "overview");
  }

  function handleRowAction(row: ProjectTableRow) {
    const isSelected = selectedBatch?.batch.id === row.batchId;

    if (row.status === "approved" && !row.fundingInstructionId && canManageWorkspace) {
      onGenerateFunding(row.batchId);
      return;
    }

    if (row.status === "awaiting_funding" && isSelected && selectedBatch?.fundingInstruction && canManageWorkspace) {
      onRefreshFunding(selectedBatch.fundingInstruction.id);
      return;
    }

    if (!isSelected) {
      openBatch(row.batchId);
      return;
    }

    if (row.status === "failed") {
      setActiveTab("exceptions");
      return;
    }

    if (["funded", "dispatching", "in_review"].includes(row.status)) {
      setActiveTab("people");
    }
  }

  function toggleApprovalSelection(payoutId: string, checked: boolean) {
    const next = new Set(selectedApprovalPayoutIds);
    if (checked) {
      next.add(payoutId);
    } else {
      next.delete(payoutId);
    }
    setSelectedApprovalPayoutIds(next);
  }

  async function signAndApproveSelectedEmployees() {
    if (!selectedBatch) {
      return;
    }

    const selectedPendingPayouts = selectedProjectPayouts.filter(
      (payout) => payout.approvalStatus === "pending" && selectedApprovalPayoutIds.has(payout.id),
    );

    if (!selectedPendingPayouts.length) {
      setApprovalSignatureMessage("Select at least one pending employee to approve.");
      return;
    }

    const provider = getInjectedSolanaProvider();
    if (!provider) {
      setApprovalSignatureMessage("No Solana wallet detected. Unlock Solflare in Chrome, refresh the tab, and try again.");
      return;
    }
    if (!provider.signMessage) {
      setApprovalSignatureMessage("This wallet does not expose message signing. Enable Solflare permissions for this site and try again.");
      return;
    }

    setIsSigningApprovals(true);
    setApprovalSignatureMessage("Waiting for wallet signature...");
    try {
      const response = await provider.connect();
      const publicKey = response.publicKey ?? provider.publicKey;
      if (!publicKey) {
        throw new Error("Wallet connected, but no public key was returned.");
      }

      const walletAddress = publicKey.toBase58();
      const approvalMessage = [
        "Sinergy Sol employee payout approval",
        `Batch: ${selectedBatch.batch.name}`,
        `Batch ID: ${selectedBatch.batch.id}`,
        `Approver: ${session.name} (${session.email})`,
        `Wallet: ${walletAddress}`,
        `Employees: ${selectedPendingPayouts.map((payout) => payout.beneficiaryName).join(", ")}`,
        `Payout IDs: ${selectedPendingPayouts.map((payout) => payout.id).join(", ")}`,
        `Signed at: ${new Date().toISOString()}`,
      ].join("\n");

      await provider.signMessage(new TextEncoder().encode(approvalMessage), "utf8");
      setConnectedWallet(walletAddress);
      selectedPendingPayouts.forEach((payout) => onUpdatePayout(payout.id, { approvalStatus: "approved" }));
      setSelectedApprovalPayoutIds(new Set());
      setApprovalSignatureMessage(`Identity verified with ${walletAddress}. ${selectedPendingPayouts.length} employees sent for approval.`);
    } catch (error) {
      setApprovalSignatureMessage(error instanceof Error ? error.message : "Wallet signature was cancelled or failed.");
    } finally {
      setIsSigningApprovals(false);
    }
  }

  function getSelectedPendingApprovalCount() {
    return selectedProjectPayouts.filter(
      (payout) => payout.approvalStatus === "pending" && selectedApprovalPayoutIds.has(payout.id),
    ).length;
  }

  function renderEmployeeApprovalActions() {
    const selectedPendingCount = getSelectedPendingApprovalCount();
    return (
      <div className="employee-approval-actions">
        <span className="pill neutral">{selectedPendingCount} selected</span>
        <button
          className="primary"
          onClick={() => void signAndApproveSelectedEmployees()}
          disabled={!canEditPayoutApprovals || !selectedPendingCount || isSigningApprovals}
        >
          {isSigningApprovals ? "Waiting for signature..." : "Sign & approve selected"}
        </button>
      </div>
    );
  }

  function renderPeopleTable() {
    return (
      <div className="table-shell">
        <table className="ops-table project-people-table employee-approval-table">
          <thead>
            <tr>
              <th>Approve</th>
              <th>Employee</th>
              <th>Bank</th>
              <th>Market</th>
              <th>Amount USDC</th>
              <th>Funding required</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {selectedProjectPayouts.map((payout) => {
              const beneficiary = beneficiaries.find((item) => item.id === payout.beneficiaryId);
              const payoutException = (data?.exceptions ?? []).find(
                (entry) => entry.status === "open" && (entry.payoutId === payout.id || (!entry.payoutId && entry.batchId === payout.batchId)),
              );
              const isApproved = payout.approvalStatus === "approved";
              const isSelectable = payout.approvalStatus === "pending" && canEditPayoutApprovals;
              const isChecked = isApproved || selectedApprovalPayoutIds.has(payout.id);
              return (
                <tr key={payout.id} className={isChecked ? "approval-selected-row" : ""}>
                  <td>
                    <label className="approval-checkbox">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isSelectable}
                        onChange={(event) => toggleApprovalSelection(payout.id, event.target.checked)}
                      />
                      <span>{isApproved ? "Approved" : "Select"}</span>
                    </label>
                  </td>
                  <td>
                    <strong>{payout.beneficiaryName}</strong>
                    <span className="cell-subtext">
                      {payout.country} · {beneficiary?.email ?? "no email"}
                    </span>
                  </td>
                  <td>
                    {beneficiary?.bankName ?? "N/A"}
                    <span className="cell-subtext">{beneficiary?.validationStatus ?? "unknown"}</span>
                  </td>
                  <td>
                    {payout.country in countryMeta ? (
                      <img
                        src={countryMeta[payout.country as Exclude<CountryFilter, "ALL" | "UNKNOWN">].flag}
                        alt={getCountryLabel(payout.country as CountryFilter)}
                        title={getCountryLabel(payout.country as CountryFilter)}
                        className="employee-country-flag"
                      />
                    ) : (
                      <span className="pill neutral">N/A</span>
                    )}
                  </td>
                  <td>
                    {canEditProject ? (
                      <input
                        className="amount-cell-input"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={getPayoutUsdcAmount(payout)}
                        onBlur={(event) => {
                          const amountLocal = getLocalAmountFromUsdc(Number(event.target.value), payout.country);
                          if (amountLocal !== payout.amountLocal) {
                            onUpdatePayout(payout.id, { amountLocal });
                          }
                        }}
                      />
                    ) : (
                      `${getPayoutUsdcAmount(payout).toFixed(2)} USDC`
                    )}
                    <span className="cell-subtext">≈ {formatMoney(payout.amountLocal, payout.currency)}</span>
                  </td>
                  <td>
                    {payout.fundingAmountUsdc ? `${payout.fundingAmountUsdc.toFixed(2)} USDC` : "Pending quote"}
                    <span className="cell-subtext">USDC funding</span>
                  </td>
                  <td>
                    <span className={`pill ${getApprovalTone(payout.approvalStatus)}`}>{humanize(payout.approvalStatus)}</span>
                    <span className="cell-subtext">{humanize(payout.status)}</span>
                    {payout.validationErrors.length ? <span className="cell-subtext danger-text">{payout.validationErrors[0]}</span> : null}
                    {payoutException ? <span className="cell-subtext danger-text">{payoutException.summary}</span> : null}
                  </td>
                  <td>
                    <div className="row-actions">
                      {canEditProject ? (
                        <>
                          <button className="ghost" onClick={() => onUpdatePayout(payout.id, { approvalStatus: "approved" })}>
                            Approve
                          </button>
                          <button className="ghost" onClick={() => onUpdatePayout(payout.id, { approvalStatus: "excluded" })}>
                            Exclude
                          </button>
                        </>
                      ) : null}
                      {selectedBatch?.batch.status === "funded" && payout.approvalStatus === "approved" && payout.status === "funded" && canManageWorkspace ? (
                        <button className="ghost" onClick={() => onDispatch(payout.id)}>
                          Send
                        </button>
                      ) : null}
                      {payoutException ? (
                        <button className="ghost" onClick={() => setActiveTab("exceptions")}>
                          View reason
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderFundingPanel() {
    if (!selectedBatch) {
      return null;
    }

    const instruction = selectedBatch.fundingInstruction;
    const creditedFunding = selectedBatch.fundingTransactions.reduce((sum, transaction) => sum + transaction.reconciledAmount, 0);
    const fundingGap = instruction ? Math.max(0, instruction.expectedAmount - creditedFunding) : 0;

    return (
      <div className="project-detail-columns">
        <section className="project-section">
          <div className="section-heading-row">
            <div>
              <h2>Fund this project with USDC</h2>
              <span className="helper">Treasury funds once. Reconciliation starts approved local payouts automatically.</span>
            </div>
            {instruction ? <span className={`pill ${instruction.status === "reconciled" ? "success" : instruction.status === "partial" ? "warning" : "neutral"}`}>{humanize(instruction.status)}</span> : null}
          </div>
          {selectedBatch.quote ? (
            <div className="info-strip">
              <div>
                <span>Amount due</span>
                <strong>{selectedBatch.quote.totalFundingUsdc.toFixed(2)}</strong>
              </div>
              <div>
                <span>Auto-dispatch</span>
                <strong>{instruction?.status === "reconciled" ? "Started" : "After funding"}</strong>
              </div>
              <div>
                <span>Expires</span>
                <strong>{formatTimestamp(selectedBatch.quote.expiresAt)}</strong>
              </div>
            </div>
          ) : (
            <p className="helper">Quote approved beneficiaries to calculate project funding.</p>
          )}

          {instruction ? (
            <div className="funding-command-card">
              <div className="funding-progress-strip">
                <div>
                  <span>Received</span>
                  <strong>{creditedFunding.toFixed(2)} USDC</strong>
                </div>
                <div>
                  <span>Remaining</span>
                  <strong>{fundingGap.toFixed(2)} USDC</strong>
                </div>
                <div>
                  <span>Last scan</span>
                  <strong>{instruction.lastScanAt ? formatTimestamp(instruction.lastScanAt) : "Not scanned yet"}</strong>
                </div>
              </div>

              <div className="funding-detail-grid">
                <div>
                  <span>Asset</span>
                  <strong>{instruction.asset}</strong>
                </div>
                <div>
                  <span>Network</span>
                  <strong>Solana {instruction.cluster}</strong>
                </div>
                <div>
                  <span>Internal vault owner</span>
                  <strong>{instruction.recipientAddress}</strong>
                </div>
                <div>
                  <span>Internal USDC vault account</span>
                  <strong>{instruction.recipientTokenAccount}</strong>
                </div>
                <div>
                  <span>Reference</span>
                  <strong>{instruction.reference}</strong>
                </div>
                <div>
                  <span>Memo</span>
                  <strong>{instruction.memo ?? "N/A"}</strong>
                </div>
              </div>

              <div className="authorized-wallets-box">
                <strong>Authorized source wallets</strong>
                <span>{selectedBatch.company.authorizedWallets.length ? selectedBatch.company.authorizedWallets.join(", ") : "No authorized wallets configured."}</span>
              </div>

              <div className="wallet-funding-box">
                <div>
                  <strong>Wallet funding</strong>
                  <span>
                    {connectedWallet
                      ? `${connectedWallet} ${
                          selectedBatch.company.authorizedWallets.includes(connectedWallet) ? "is authorized" : "is not whitelisted"
                        }`
                      : "Connect the wallet that will sign the USDC transfer."}
                  </span>
                </div>
                <div className="inline-actions">
                  <button className="ghost" onClick={() => void connectFundingWallet()}>
                    {connectedWallet ? "Reconnect wallet" : "Connect wallet"}
                  </button>
                  <button className="primary" onClick={() => void fundSelectedProjectWithWallet()} disabled={isWalletFunding || instruction.status === "reconciled"}>
                    {isWalletFunding ? "Funding..." : `Fund ${instruction.expectedAmount.toFixed(2)} USDC`}
                  </button>
                </div>
                {walletFundingMessage ? <span className="helper">{walletFundingMessage}</span> : null}
              </div>

              <div className="inline-actions funding-actions">
                <button className="ghost" onClick={() => void copyFundingDetails()}>
                  {fundingCopied ? "Copied" : "Copy funding details"}
                </button>
                <button className="ghost" onClick={() => onRefreshFunding(instruction.id)}>
                  Refresh funding
                </button>
                <button className="ghost" onClick={openManualFundingModal} disabled={instruction.status === "reconciled"}>
                  Record manual funding
                </button>
              </div>
            </div>
          ) : (
            <div className="funding-empty-state">
              <strong>Funding instructions are not generated yet.</strong>
              <span>Approve the project first. Then treasury can generate a USDC destination, reference, and memo from this screen.</span>
              {selectedBatch.batch.status === "approved" && canManageWorkspace ? (
                <button className="primary" onClick={() => onGenerateFunding(selectedBatch.batch.id)}>
                  Generate funding instructions
                </button>
              ) : null}
            </div>
          )}
        </section>

        <section className="project-section">
          <h2>Funding activity</h2>
          <div className="audit-list compact-audit">
            {selectedBatch.fundingTransactions.length ? (
              selectedBatch.fundingTransactions.map((transaction) => (
                <div key={transaction.id} className="audit-item">
                  <strong>{transaction.amountReceived.toFixed(2)} USDC · {humanize(transaction.status)}</strong>
                  <span>{transaction.detectionSource} · {transaction.signature}</span>
                  <time>{formatTimestamp(transaction.createdAt)}</time>
                </div>
              ))
            ) : (
              <div className="queue-empty">No funding transactions recorded yet.</div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="projects-page">
      <section className="demo-flow-hero" aria-label="Recording flow">
        <div>
          <h2>Login, upload batch, approve employees, approve batch, automate payouts</h2>
        </div>
        <div className="demo-flow-rail">
          {demoFlowSteps.map((step, index) => {
            const isDone = demoFlowState.completedSteps.has(step.id);
            const isActive = demoFlowState.activeStep === step.id;
            return (
              <div className={`demo-flow-step ${isDone ? "done" : ""} ${isActive ? "active" : ""}`} key={step.id}>
                <span>{isDone ? "✓" : index + 1}</span>
                <strong>{step.label}</strong>
                <small>{step.note}</small>
              </div>
            );
          })}
        </div>
      </section>

      <article className="panel ops-panel projects-shell">
        <div className="panel-title-row">
          <div>
            <h2>Batch workspace</h2>
            <span className="helper">Start with CSV import, then use the selected batch panel for approvals and execution.</span>
          </div>
          <div className="projects-toolbar-actions">
            <button className="tool-button" onClick={() => openCreateProjectModal("csv")} disabled={!canManageWorkspace}>
              <MetricIcon name="download" className="control-icon" />
              Upload batch
            </button>
            <button className="primary projects-create-button" onClick={() => openCreateProjectModal("manual")} disabled={!canManageWorkspace}>
              Create project
            </button>
          </div>
        </div>

        <div className="projects-table-toolbar">
          <label className="search-control">
            <span className="sr-only">Search projects</span>
            <input value={search} placeholder="Search projects" onChange={(event) => setSearch(event.target.value)} />
            <MetricIcon name="search" className="control-icon" />
          </label>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BatchStatus | "ALL")}>
            <option value="ALL">Status</option>
            {Array.from(new Set(batches.map((batch) => batch.status))).map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </select>

          <select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value as CountryFilter)}>
            <option value="ALL">Country</option>
            <option value="CO">Colombia</option>
            <option value="MX">Mexico</option>
            <option value="AR">Argentina</option>
            <option value="UNKNOWN">No country</option>
          </select>

          <button className="projects-clear-button" onClick={() => {
            setSearch("");
            setStatusFilter("ALL");
            setCountryFilter("ALL");
          }}>
            Clear filters
          </button>

          <button className="tool-button" onClick={() => void onRefreshProjects()}>
            Refresh
          </button>
        </div>

        <section className="project-table-section">
          <div className="panel-title-row">
            <h2>Project table</h2>
            <span className="helper">{filteredRows.length} projects</span>
          </div>

          {filteredRows.length ? (
            <div className="table-shell">
              <table className="ops-table projects-table">
                <thead>
                  <tr>
                    <th />
                    <th>Project name</th>
                    <th>People</th>
                    <th>Approved</th>
                    <th>Pending</th>
                    <th>Funding required</th>
                    <th>Batch status</th>
                    <th>Last activity</th>
                    <th>Next action</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const isSelected = selectedBatch?.batch.id === row.batchId;
                    const nextActionLabel = getNextActionLabel(row, selectedBatch);
                    return (
                      <tr key={row.batchId} className={isSelected ? "selected-row" : ""} onClick={() => openBatch(row.batchId)}>
                        <td>
                          <span className={`projects-row-radio ${isSelected ? "active" : ""}`} aria-hidden="true" />
                        </td>
                        <td>
                          <strong>{row.batchName}</strong>
                        </td>
                        <td>{row.people}</td>
                        <td>{row.approved}</td>
                        <td className={row.pending ? "warning-text" : "success-text"}>{row.pending}</td>
                        <td>{formatMoney(row.fundingRequired, "USDC")}</td>
                        <td>
                          <span className={`pill ${getBatchTone(row.status)}`}>{humanize(row.status)}</span>
                        </td>
                        <td>{formatTimestamp(row.lastActivity)}</td>
                        <td>
                          <button
                            className={`ghost compact-action ${nextActionLabel === "Generate funding" ? "primary-like" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRowAction(row);
                            }}
                          >
                            {nextActionLabel}
                          </button>
                        </td>
                        <td>
                          <button
                            className="row-menu"
                            onClick={(event) => {
                              event.stopPropagation();
                              openBatch(row.batchId);
                            }}
                            aria-label={`Open ${row.batchName}`}
                          >
                            <MetricIcon name="kebab" className="control-icon" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h2>No matching projects</h2>
              <p>Adjust the filters or create a new project.</p>
            </div>
          )}
        </section>

        {selectedBatch ? (
          <section className="project-detail-shell">
            <div className="project-detail-topbar">
              <div>
                <h2>{selectedBatch.batch.name}</h2>
                <span className="helper">Payment project command center · Project ID: {selectedBatch.batch.id}</span>
              </div>
              <div className="project-detail-topbar-actions">
                <span className={`pill ${getBatchTone(selectedBatch.batch.status)}`}>{humanize(selectedBatch.batch.status)}</span>
                <button className="ghost icon-button" onClick={onClearSelection} aria-label="Close project detail">
                  x
                </button>
              </div>
            </div>

            <section className="project-command-panel">
              <div>
                <p className="eyebrow">Next action</p>
                <h2>{selectedNextActionLabel}</h2>
                <span>{getNextActionDescription(selectedProjectRow, selectedBatch)}</span>
              </div>
              <div className="command-panel-actions">
                {selectedOpenExceptions.length ? <span className="pill danger">{selectedOpenExceptions.length} open exceptions</span> : <span className="pill success">No open blockers</span>}
                <button className="primary" onClick={handleSelectedNextAction}>
                  Continue
                </button>
              </div>
            </section>

            <div className="project-detail-tabs" role="tablist" aria-label="Project detail tabs">
              {detailTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`project-detail-tab ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <div className="project-overview-grid">
                <section className="project-section project-snapshot-card">
                  <h2>Snapshot</h2>
                  <div className="snapshot-list">
                    <div>
                      <span>Country</span>
                      <strong>{getCountryLabel(getDominantCountry(selectedProjectPayouts, beneficiaries, selectedBatch.batch.id))}</strong>
                    </div>
                    <div>
                      <span>People</span>
                      <strong>{selectedProjectPayouts.length}</strong>
                    </div>
                    <div>
                      <span>Approved</span>
                      <strong>{selectedProjectStats.approved.length}</strong>
                    </div>
                    <div>
                      <span>Pending</span>
                      <strong>{selectedProjectStats.pending.length}</strong>
                    </div>
                    <div>
                      <span>Funding required</span>
                      <strong>{selectedBatch.batch.totalFundingUsdc.toFixed(2)} USDC</strong>
                    </div>
                    <div>
                      <span>Batch status</span>
                      <strong>{humanize(selectedBatch.batch.status)}</strong>
                    </div>
                  </div>
                </section>

                <section className="project-section project-funding-flow-card">
                  <h2>Funding flow</h2>
                  <div className="projects-timeline">
                    {getFundingStepItems(selectedBatch).map((step) => (
                      <div key={step.id} className="projects-timeline-step">
                        <span className={`projects-timeline-node ${step.done ? "done" : ""}`}>{step.done ? "✓" : step.id}</span>
                        <strong>{step.label}</strong>
                        <small>{step.note}</small>
                      </div>
                    ))}
                  </div>

                  <div className="projects-next-step-card">
                    <div>
                      <strong>Next: {selectedNextActionLabel}</strong>
                      <span>{getNextActionDescription(selectedProjectRow, selectedBatch)}</span>
                    </div>
                    {!selectedBatch.fundingInstruction && selectedBatch.batch.status === "approved" && canManageWorkspace ? (
                      <button className="primary" onClick={() => onGenerateFunding(selectedBatch.batch.id)}>
                        Generate funding
                      </button>
                    ) : selectedBatch.fundingInstruction && selectedBatch.batch.status === "awaiting_funding" ? (
                      <button className="primary" onClick={() => setActiveTab("funding")}>
                        Open funding
                      </button>
                    ) : null}
                  </div>
                </section>

                <div className="project-overview-rail">
                  <section className="project-section">
                    <h2>Funding</h2>
                    <div className="overview-summary-list">
                      <div>
                        <span>Total USDC</span>
                        <strong>{selectedBatch.quote?.totalFundingUsdc.toFixed(2) ?? selectedBatch.batch.totalFundingUsdc.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span>Local fees</span>
                        <strong>{selectedBatch.quote?.totalFeesLocal.toFixed(2) ?? "0.00"}</strong>
                      </div>
                      <div>
                        <span>Quote expires</span>
                        <strong>{selectedBatch.quote ? formatTimestamp(selectedBatch.quote.expiresAt) : "Pending quote"}</strong>
                      </div>
                    </div>
                    <button className="ghost" onClick={() => setActiveTab("funding")}>
                      Open funding workspace
                    </button>
                  </section>

                  <section className="project-section">
                    <h2>Audit (latest)</h2>
                    <div className="audit-list compact-audit">
                      {selectedBatch.auditTrail.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="audit-item">
                          <strong>{entry.action}</strong>
                          <span>
                            {entry.actorName} · {formatTimestamp(entry.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button className="ghost" onClick={() => setActiveTab("audit")}>
                      View full audit trail
                    </button>
                  </section>
                </div>
              </div>
            ) : null}

            {activeTab === "people" ? (
              <section className="project-section employee-approval-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>Employees & approvals</h2>
                    <span className="helper">One list for payout review, wallet-signed employee approval, funding status, and payout actions.</span>
                  </div>
                  {renderEmployeeApprovalActions()}
                </div>
                {renderPeopleTable()}
                {approvalSignatureMessage ? <div className="approval-signature-message">{approvalSignatureMessage}</div> : null}
              </section>
            ) : null}

            {activeTab === "approvals" ? (
              <section className="project-section">
                <div className="panel-title-row">
                  <div>
                    <h2>Approval control room</h2>
                    <span className="helper">Approve employees first, then approve the complete batch for treasury funding.</span>
                  </div>
                  {renderEmployeeApprovalActions()}
                </div>
                {!canApproveProject ? <p className="helper">Project approval requires the `approver` or `admin` demo user.</p> : null}
                <div className="info-strip">
                  <div>
                    <span>Approved people</span>
                    <strong>{selectedProjectStats.approved.length}</strong>
                  </div>
                  <div>
                    <span>Pending approvals</span>
                    <strong>{selectedProjectStats.pending.length}</strong>
                  </div>
                  <div>
                    <span>Excluded</span>
                    <strong>{selectedProjectStats.excluded.length}</strong>
                  </div>
                </div>
                <div className="projects-approval-actions">
                  {canManageWorkspace ? (
                    <button className="ghost" onClick={() => onQuote(selectedBatch.batch.id)}>
                      Quote approved payouts
                    </button>
                  ) : null}
                  {canApproveProject ? (
                    <button className="ghost batch-approval-button" onClick={() => onApprove(selectedBatch.batch.id)}>
                      Approve batch
                    </button>
                  ) : null}
                </div>
                {renderPeopleTable()}
                {approvalSignatureMessage ? <div className="approval-signature-message">{approvalSignatureMessage}</div> : null}
              </section>
            ) : null}

            {activeTab === "funding" ? renderFundingPanel() : null}
            {activeTab === "exceptions" ? (
              <section className="project-section">
                <div className="panel-title-row">
                  <div>
                    <h2>Project exceptions</h2>
                    <span className="helper">Reasons this project needs attention before it can be considered complete.</span>
                  </div>
                  <span className={selectedOpenExceptions.length ? "pill danger" : "pill success"}>
                    {selectedOpenExceptions.length ? `${selectedOpenExceptions.length} open` : "Clear"}
                  </span>
                </div>

                {selectedOpenExceptions.length ? (
                  <div className="project-exception-list">
                    {selectedOpenExceptions.map((entry) => {
                      const payout = selectedProjectPayouts.find((item) => item.id === entry.payoutId);
                      return (
                        <article className="project-exception-card" key={entry.id}>
                          <div>
                            <span className="pill danger">{humanize(entry.type)}</span>
                            <h3>{entry.summary}</h3>
                            <p>{getExceptionGuidance(entry.type)}</p>
                          </div>
                          <div className="exception-facts">
                            <div>
                              <span>Affected person</span>
                              <strong>{payout?.beneficiaryName ?? "Project-level issue"}</strong>
                            </div>
                            <div>
                              <span>Country</span>
                              <strong>{entry.country ?? payout?.country ?? "N/A"}</strong>
                            </div>
                            <div>
                              <span>Created</span>
                              <strong>{formatTimestamp(entry.createdAt)}</strong>
                            </div>
                          </div>
                          <div className="inline-actions">
                            <button className="ghost" onClick={() => setActiveTab(entry.payoutId ? "people" : "funding")}>
                              Inspect affected record
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="queue-empty">No open exceptions for this project.</div>
                )}
              </section>
            ) : null}
            {activeTab === "audit" ? (
              <section className="project-section">
                <h2>Audit</h2>
                <div className="audit-list compact-audit">
                  {selectedBatch.auditTrail.map((entry) => (
                    <div key={entry.id} className="audit-item">
                      <strong>{entry.action}</strong>
                      <span>{entry.actorName}</span>
                      <time>{formatTimestamp(entry.createdAt)}</time>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}
      </article>

      {isCreateModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeCreateProjectModal}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Create project" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title-row">
              <div>
                <h2>Create project</h2>
                <span className="helper">Assemble a batch from existing people or import it from CSV.</span>
              </div>
              <button className="ghost icon-button" onClick={closeCreateProjectModal} aria-label="Close modal">
                x
              </button>
            </div>

            <div className="project-detail-tabs modal-segment-tabs">
              <button className={`project-detail-tab ${createMode === "manual" ? "active" : ""}`} onClick={() => setCreateMode("manual")}>
                Manual
              </button>
              <button className={`project-detail-tab ${createMode === "csv" ? "active" : ""}`} onClick={() => setCreateMode("csv")}>
                CSV
              </button>
            </div>

            {createMode === "manual" ? (
              <div className="modal-body-stack">
                <label>
                  Project name
                  <input value={batchForm.name} onChange={(event) => setBatchForm({ ...batchForm, name: event.target.value })} />
                </label>

                <div className="project-builder-card">
                  <div className="builder-heading">
                    <strong>Add existing beneficiary</strong>
                    <span>Select an existing person and define their local payout amount for this batch.</span>
                  </div>
                  <div className="builder-inline-grid">
                    <label>
                      Beneficiary
                      <select value={selectedBeneficiaryIdToAdd} onChange={(event) => setSelectedBeneficiaryIdToAdd(event.target.value)}>
                        <option value="">Select beneficiary</option>
                        {availableBeneficiaries.map((beneficiary) => (
                          <option key={beneficiary.id} value={beneficiary.id}>
                            {beneficiary.name} ({beneficiary.country})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Local amount
                      <input
                        type="number"
                        min="0"
                        placeholder={selectedBeneficiaryOption ? `Amount in ${selectedBeneficiaryOption.currency}` : "Amount"}
                        value={selectedBeneficiaryAmountLocal}
                        onChange={(event) => setSelectedBeneficiaryAmountLocal(event.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="ghost"
                    disabled={!selectedBeneficiaryIdToAdd || Number(selectedBeneficiaryAmountLocal) <= 0}
                    onClick={addDraftPayout}
                  >
                    Add to project
                  </button>
                </div>

                <div className="draft-payout-list modal-draft-list">
                  {batchForm.payouts.map((payout, index) => {
                    const beneficiary = beneficiaries.find((item) => item.id === payout.beneficiaryId);
                    return (
                      <div className="draft-payout-row" key={`${payout.beneficiaryId}-${index}`}>
                        <span>
                          {beneficiary?.name ?? payout.beneficiaryId}
                          <small>
                            {beneficiary?.country ?? "N/A"} · {beneficiary?.currency ?? "Local currency"}
                          </small>
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={payout.amountLocal}
                          onChange={(event) => updateDraftAmount(index, Number(event.target.value))}
                        />
                        <button className="ghost icon-button" onClick={() => removeDraftPayout(index)} aria-label="Remove person">
                          x
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="project-builder-summary">
                  <div>
                    <span>Draft people</span>
                    <strong>{batchForm.payouts.length}</strong>
                  </div>
                  <div>
                    <span>Draft local total</span>
                    <strong>{batchForm.payouts.reduce((total, payout) => total + payout.amountLocal, 0).toLocaleString("en-US")}</strong>
                  </div>
                  <div>
                    <span>Currencies</span>
                    <strong>
                      {Array.from(
                        new Set(
                          batchForm.payouts
                            .map((payout) => beneficiaries.find((beneficiary) => beneficiary.id === payout.beneficiaryId)?.currency)
                            .filter(Boolean),
                        ),
                      ).join(", ") || "Pending"}
                    </strong>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="ghost" onClick={closeCreateProjectModal}>
                    Cancel
                  </button>
                  <button className="primary" onClick={() => void handleCreateProject()} disabled={!canManageWorkspace || !batchForm.payouts.length || isSubmittingProject}>
                    Create project
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-body-stack">
                <label>
                  Project name
                  <input value={batchForm.name} onChange={(event) => setBatchForm({ ...batchForm, name: event.target.value })} />
                </label>
                <div className="csv-upload-card">
                  <div>
                    <strong>Upload a CSV file</strong>
                    <span>Expected columns: beneficiaryId, amountLocal.</span>
                  </div>
                  <label className="csv-file-control">
                    <span>Select CSV</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => handleCsvFileUpload(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <a className="csv-sample-link" href="/demo-batch-import.csv" download>
                    Download mock CSV
                  </a>
                </div>
                <label>
                  CSV preview
                  <textarea value={csvImport} onChange={(event) => setCsvImport(event.target.value)} rows={10} />
                </label>
                <div className="modal-actions">
                  <button className="ghost" onClick={closeCreateProjectModal}>
                    Cancel
                  </button>
                  <button className="primary" onClick={() => void handleImportProject()} disabled={!canManageWorkspace || !csvImport.trim() || isSubmittingProject}>
                    Import project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {isManualFundingOpen && selectedBatch?.fundingInstruction ? (
        <div className="modal-backdrop" role="presentation" onClick={closeManualFundingModal}>
          <div className="modal-card funding-modal-card" role="dialog" aria-modal="true" aria-label="Record manual funding" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title-row">
              <div>
                <h2>Record manual funding</h2>
                <span className="helper">Use this only when treasury has already sent USDC and you need to reconcile the project for this demo or support flow.</span>
              </div>
              <button className="ghost icon-button" onClick={closeManualFundingModal} aria-label="Close modal">
                x
              </button>
            </div>

            <div className="manual-funding-summary">
              <div>
                <span>Expected amount</span>
                <strong>{selectedBatch.fundingInstruction.expectedAmount.toFixed(2)} USDC</strong>
              </div>
              <div>
                <span>Reference</span>
                <strong>{selectedBatch.fundingInstruction.reference}</strong>
              </div>
              <div>
                <span>Internal USDC vault</span>
                <strong>{selectedBatch.fundingInstruction.recipientTokenAccount}</strong>
              </div>
            </div>

            <div className="modal-body-stack">
              <label>
                Transaction hash
                <input
                  value={manualFundingForm.txHash}
                  placeholder="Solana signature or support reference"
                  onChange={(event) => setManualFundingForm({ ...manualFundingForm, txHash: event.target.value })}
                />
              </label>
              <label>
                Amount received
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualFundingForm.amountReceived}
                  onChange={(event) => setManualFundingForm({ ...manualFundingForm, amountReceived: event.target.value })}
                />
              </label>
              <label className="confirmation-check">
                <input
                  type="checkbox"
                  checked={manualFundingForm.confirmed}
                  onChange={(event) => setManualFundingForm({ ...manualFundingForm, confirmed: event.target.checked })}
                />
                <span>I confirm this USDC funding belongs to this project and was sent from an authorized company wallet.</span>
              </label>
              <div className="gate-note">
                <strong>What happens next</strong>
                <span>If the amount fully covers the expected funding, the platform reconciles the project and auto-dispatches approved payouts. Partial funding keeps the project waiting and opens a funding exception.</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="ghost" onClick={closeManualFundingModal}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => void handleRecordManualFunding()}
                disabled={!manualFundingForm.txHash.trim() || Number(manualFundingForm.amountReceived) <= 0 || !manualFundingForm.confirmed || isRecordingFunding}
              >
                Record funding
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
