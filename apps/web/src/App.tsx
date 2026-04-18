import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import type { CreateBatchDto, CreateBeneficiaryDto, SessionUser } from "@latam-payouts/contracts";
import { api, type BatchDetail, type BootstrapPayload } from "./lib/api";

type SessionState = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
} | null;

const navItems = [
  { to: "/", label: "Operations" },
  { to: "/company", label: "Company" },
  { to: "/beneficiaries", label: "Beneficiaries" },
  { to: "/batches", label: "Batches" },
  { to: "/exceptions", label: "Exceptions" },
  { to: "/reports", label: "Reports" },
];

const emptyBeneficiaryForm: CreateBeneficiaryDto = {
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

export default function App() {
  const [session, setSession] = useState<SessionState>(() => {
    const value = localStorage.getItem("latam-payouts-session");
    return value ? (JSON.parse(value) as SessionState) : null;
  });
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [loginForm, setLoginForm] = useState({ email: "finance@acme-pay.com", password: "demo123" });
  const [beneficiaryForm, setBeneficiaryForm] = useState<CreateBeneficiaryDto>(emptyBeneficiaryForm);
  const [batchForm, setBatchForm] = useState<CreateBatchDto>({ name: "New payroll batch", payouts: [] });
  const [csvImport, setCsvImport] = useState("beneficiaryId,amountLocal\nben_co_001,2500000\nben_mx_001,18000");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!session) {
      return;
    }
    void refreshWorkspace(session.accessToken);
  }, [session?.accessToken]);

  async function refreshWorkspace(token: string) {
    setLoading(true);
    try {
      const bootstrap = await api.bootstrap(token);
      startTransition(() => {
        setData(bootstrap);
      });
      if (selectedBatch) {
        const detail = await api.getBatch(token, selectedBatch.batch.id);
        setSelectedBatch(detail);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load workspace data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setLoading(true);
    try {
      const nextSession = await api.login(loginForm.email, loginForm.password);
      localStorage.setItem("latam-payouts-session", JSON.stringify(nextSession));
      setSession(nextSession);
      setMessage("Logged into the operations console.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    if (!session) {
      return;
    }
    setLoading(true);
    try {
      await action();
      await refreshWorkspace(session.accessToken);
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The action could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function openBatch(batchId: string) {
    if (!session) {
      return;
    }
    setLoading(true);
    try {
      const detail = await api.getBatch(session.accessToken, batchId);
      setSelectedBatch(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load the batch.");
    } finally {
      setLoading(false);
    }
  }

  const filteredExceptions = useMemo(() => {
    if (!data) {
      return [];
    }
    const normalized = deferredSearch.toLowerCase();
    return data.exceptions.filter((entry) => `${entry.type} ${entry.summary} ${entry.country ?? ""}`.toLowerCase().includes(normalized));
  }, [data, deferredSearch]);

  if (!session) {
    return (
      <div className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Global Payroll Payouts</p>
          <h1>LatAm payout operations console</h1>
          <p className="lede">
            Run beneficiary onboarding, batch approvals, USDC funding, payout tracking, and exception handling from one
            place.
          </p>
          <label>
            Email
            <input value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
            />
          </label>
          <button className="primary" onClick={() => void handleLogin()} disabled={loading}>
            {loading ? "Signing in..." : "Enter workspace"}
          </button>
          <p className="helper">Demo users: finance, approver, compliance. Password: demo123</p>
          {message ? <p className="message">{message}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Ops Core</p>
          <h2>LatAm Payouts</h2>
          <p className="sidebar-copy">{session.user.name}</p>
          <p className="sidebar-copy role">{session.user.role.replaceAll("_", " ")}</p>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="ghost"
          onClick={() => {
            localStorage.removeItem("latam-payouts-session");
            setSession(null);
            setData(null);
            setSelectedBatch(null);
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operational workspace</p>
            <h1>Global companies paying talent in Colombia and Mexico</h1>
          </div>
          <div className="status-box">
            <span className={loading ? "dot live" : "dot"} />
            {loading ? "Syncing" : "Ready"}
          </div>
        </header>

        {message ? <div className="banner">{message}</div> : null}

        <Routes>
          <Route path="/" element={<DashboardPage data={data} />} />
          <Route
            path="/company"
            element={
              <CompanyPage
                data={data}
                onSave={(payload) =>
                  runAction(() => api.updateCompany(session.accessToken, payload).then(() => Promise.resolve()), "Company settings updated.")
                }
              />
            }
          />
          <Route
            path="/beneficiaries"
            element={
              <BeneficiariesPage
                data={data}
                form={beneficiaryForm}
                setForm={setBeneficiaryForm}
                onCreate={() =>
                  runAction(
                    () => api.createBeneficiary(session.accessToken, beneficiaryForm).then(() => Promise.resolve()),
                    "Beneficiary created.",
                  )
                }
              />
            }
          />
          <Route
            path="/batches"
            element={
              <BatchesPage
                data={data}
                selectedBatch={selectedBatch}
                batchForm={batchForm}
                setBatchForm={setBatchForm}
                csvImport={csvImport}
                setCsvImport={setCsvImport}
                openBatch={(batchId) => void openBatch(batchId)}
                onCreateBatch={() =>
                  runAction(
                    async () => {
                      const detail = await api.createBatch(session.accessToken, batchForm);
                      setSelectedBatch(detail);
                    },
                    "Batch created.",
                  )
                }
                onImportBatch={() =>
                  runAction(
                    async () => {
                      const detail = await api.importBatch(session.accessToken, `${batchForm.name} import`, csvImport);
                      setSelectedBatch(detail);
                    },
                    "CSV batch imported.",
                  )
                }
                onQuote={(batchId) =>
                  runAction(
                    async () => {
                      await api.createQuote(session.accessToken, batchId);
                      const detail = await api.getBatch(session.accessToken, batchId);
                      setSelectedBatch(detail);
                    },
                    "Quote generated.",
                  )
                }
                onApprove={(batchId) =>
                  runAction(
                    async () => {
                      const detail = await api.approveBatch(session.accessToken, batchId, "Approved in console");
                      setSelectedBatch(detail);
                    },
                    "Batch approved.",
                  )
                }
                onGenerateFunding={(batchId) =>
                  runAction(
                    async () => {
                      await api.getFundingInstructions(session.accessToken, batchId);
                      const detail = await api.getBatch(session.accessToken, batchId);
                      setSelectedBatch(detail);
                    },
                    "Funding instructions generated.",
                  )
                }
                onFunding={(instructionId, amount) =>
                  runAction(
                    async () => {
                      await api.recordFunding(session.accessToken, {
                        fundingInstructionId: instructionId,
                        txHash: `SOLANA-TX-${Date.now()}`,
                        amountReceived: amount,
                      });
                      if (selectedBatch) {
                        const detail = await api.getBatch(session.accessToken, selectedBatch.batch.id);
                        setSelectedBatch(detail);
                      }
                    },
                    "Funding transaction recorded.",
                  )
                }
                onDispatch={(payoutId) =>
                  runAction(
                    async () => {
                      await api.dispatchPayout(session.accessToken, payoutId);
                      if (selectedBatch) {
                        const detail = await api.getBatch(session.accessToken, selectedBatch.batch.id);
                        setSelectedBatch(detail);
                      }
                    },
                    "Payout dispatched.",
                  )
                }
              />
            }
          />
          <Route
            path="/exceptions"
            element={
              <ExceptionsPage
                data={data}
                search={search}
                setSearch={setSearch}
                filteredExceptions={filteredExceptions}
                onResolveException={(exceptionId) =>
                  runAction(() => api.resolveException(session.accessToken, exceptionId).then(() => Promise.resolve()), "Exception resolved.")
                }
                onResolveCompliance={(caseId) =>
                  runAction(
                    () => api.resolveComplianceCase(session.accessToken, caseId).then(() => Promise.resolve()),
                    "Compliance case resolved.",
                  )
                }
              />
            }
          />
          <Route path="/reports" element={<ReportsPage data={data} />} />
        </Routes>
      </main>
    </div>
  );
}

function DashboardPage({ data }: { data: BootstrapPayload | null }) {
  const cards = [
    { label: "Batches pending approval", value: data?.batches.filter((item) => item.status === "awaiting_approval").length ?? 0 },
    { label: "Funding pending", value: data?.batches.filter((item) => item.status === "awaiting_funding").length ?? 0 },
    { label: "Failed payouts", value: data?.payouts.filter((item) => item.status === "failed").length ?? 0 },
    { label: "Open exceptions", value: data?.exceptions.filter((item) => item.status === "open").length ?? 0 },
  ];

  return (
    <section className="page-grid">
      <div className="card-grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.label}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>
      <article className="panel wide">
        <h2>Corridor summary</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Currency</th>
                <th>Required fields</th>
                <th>Quote TTL</th>
              </tr>
            </thead>
            <tbody>
              {data?.corridors.map((corridor) => (
                <tr key={corridor.code}>
                  <td>{corridor.code}</td>
                  <td>{corridor.currency}</td>
                  <td>{corridor.requiredFields.join(", ")}</td>
                  <td>{corridor.quoteTtlMinutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function CompanyPage({
  data,
  onSave,
}: {
  data: BootstrapPayload | null;
  onSave: (payload: { displayName: string; webhookUrl: string; authorizedWallets: string[] }) => void;
}) {
  const [displayName, setDisplayName] = useState(data?.company.displayName ?? "");
  const [webhookUrl, setWebhookUrl] = useState(data?.company.webhookUrl ?? "");
  const [wallets, setWallets] = useState((data?.company.authorizedWallets ?? []).join(", "));

  useEffect(() => {
    setDisplayName(data?.company.displayName ?? "");
    setWebhookUrl(data?.company.webhookUrl ?? "");
    setWallets((data?.company.authorizedWallets ?? []).join(", "));
  }, [data?.company.displayName, data?.company.webhookUrl, data?.company.authorizedWallets]);

  return (
    <section className="page-grid">
      <article className="panel">
        <h2>Company settings</h2>
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <label>
          Webhook URL
          <input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} />
        </label>
        <label>
          Authorized funding wallets
          <textarea value={wallets} onChange={(event) => setWallets(event.target.value)} rows={4} />
        </label>
        <button
          className="primary"
          onClick={() =>
            onSave({
              displayName,
              webhookUrl,
              authorizedWallets: wallets.split(",").map((item) => item.trim()).filter(Boolean),
            })
          }
        >
          Save settings
        </button>
      </article>
    </section>
  );
}

function BeneficiariesPage({
  data,
  form,
  setForm,
  onCreate,
}: {
  data: BootstrapPayload | null;
  form: CreateBeneficiaryDto;
  setForm: (next: CreateBeneficiaryDto) => void;
  onCreate: () => void;
}) {
  return (
    <section className="page-grid two-columns">
      <article className="panel">
        <h2>Beneficiary management</h2>
        <div className="form-grid">
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Email
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Country
            <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value as "CO" | "MX" })}>
              <option value="CO">Colombia</option>
              <option value="MX">Mexico</option>
            </select>
          </label>
          <label>
            Bank name
            <input value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
          </label>
          <label>
            Account holder
            <input
              value={form.accountHolderName}
              onChange={(event) => setForm({ ...form, accountHolderName: event.target.value })}
            />
          </label>
          {form.country === "CO" ? (
            <>
              <label>
                Account number
                <input value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} />
              </label>
              <label>
                Account type
                <input value={form.accountType} onChange={(event) => setForm({ ...form, accountType: event.target.value })} />
              </label>
              <label>
                Document number
                <input
                  value={form.documentNumber}
                  onChange={(event) => setForm({ ...form, documentNumber: event.target.value })}
                />
              </label>
            </>
          ) : (
            <label>
              CLABE
              <input value={form.clabe} onChange={(event) => setForm({ ...form, clabe: event.target.value })} />
            </label>
          )}
        </div>
        <button className="primary" onClick={onCreate}>
          Create beneficiary
        </button>
      </article>
      <article className="panel">
        <h2>Current beneficiaries</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Currency</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>
              {data?.beneficiaries.map((beneficiary) => (
                <tr key={beneficiary.id}>
                  <td>{beneficiary.name}</td>
                  <td>{beneficiary.country}</td>
                  <td>{beneficiary.currency}</td>
                  <td>
                    <span className={beneficiary.validationStatus === "valid" ? "pill success" : "pill danger"}>
                      {beneficiary.validationStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function BatchesPage(props: {
  data: BootstrapPayload | null;
  selectedBatch: BatchDetail | null;
  batchForm: CreateBatchDto;
  setBatchForm: (next: CreateBatchDto) => void;
  csvImport: string;
  setCsvImport: (next: string) => void;
  openBatch: (id: string) => void;
  onCreateBatch: () => void;
  onImportBatch: () => void;
  onQuote: (batchId: string) => void;
  onApprove: (batchId: string) => void;
  onGenerateFunding: (batchId: string) => void;
  onFunding: (instructionId: string, amount: number) => void;
  onDispatch: (payoutId: string) => void;
}) {
  const {
    data,
    selectedBatch,
    batchForm,
    setBatchForm,
    csvImport,
    setCsvImport,
    openBatch,
    onCreateBatch,
    onImportBatch,
    onQuote,
    onApprove,
    onGenerateFunding,
    onFunding,
    onDispatch,
  } = props;
  const beneficiaries = data?.beneficiaries ?? [];

  return (
    <section className="page-grid two-columns">
      <article className="panel">
        <h2>Batch creation</h2>
        <label>
          Batch name
          <input value={batchForm.name} onChange={(event) => setBatchForm({ ...batchForm, name: event.target.value })} />
        </label>
        <label>
          Add payout
          <div className="inline-form">
            <select
              onChange={(event) => {
                const beneficiaryId = event.target.value;
                if (!beneficiaryId) {
                  return;
                }
                setBatchForm({
                  ...batchForm,
                  payouts: [...batchForm.payouts, { beneficiaryId, amountLocal: 0 }],
                });
              }}
            >
              <option value="">Select beneficiary</option>
              {beneficiaries.map((beneficiary) => (
                <option key={beneficiary.id} value={beneficiary.id}>
                  {beneficiary.name} ({beneficiary.country})
                </option>
              ))}
            </select>
          </div>
        </label>
        <div className="stack">
          {batchForm.payouts.map((payout, index) => (
            <div className="inline-form" key={`${payout.beneficiaryId}-${index}`}>
              <span>{beneficiaries.find((item) => item.id === payout.beneficiaryId)?.name ?? payout.beneficiaryId}</span>
              <input
                type="number"
                min="0"
                value={payout.amountLocal}
                onChange={(event) => {
                  const next = [...batchForm.payouts];
                  next[index] = { ...next[index], amountLocal: Number(event.target.value) };
                  setBatchForm({ ...batchForm, payouts: next });
                }}
              />
            </div>
          ))}
        </div>
        <button className="primary" onClick={onCreateBatch}>
          Create batch
        </button>

        <h3>CSV import</h3>
        <textarea value={csvImport} onChange={(event) => setCsvImport(event.target.value)} rows={7} />
        <button className="ghost" onClick={onImportBatch}>
          Import CSV
        </button>

        <h3>Existing batches</h3>
        <div className="stack">
          {data?.batches.map((batch) => (
            <button key={batch.id} className="list-button" onClick={() => openBatch(batch.id)}>
              <span>{batch.name}</span>
              <span className="pill neutral">{batch.status}</span>
            </button>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Batch detail</h2>
        {!selectedBatch ? <p>Select a batch to inspect quote, approvals, funding, and payouts.</p> : null}
        {selectedBatch ? (
          <>
            <div className="detail-header">
              <div>
                <h3>{selectedBatch.batch.name}</h3>
                <p>
                  Status: <span className="pill neutral">{selectedBatch.batch.status}</span>
                </p>
              </div>
              <div className="inline-actions">
                <button className="ghost" onClick={() => onQuote(selectedBatch.batch.id)}>
                  Generate quote
                </button>
                <button className="primary" onClick={() => onApprove(selectedBatch.batch.id)}>
                  Approve batch
                </button>
              </div>
            </div>

            {selectedBatch.quote ? (
              <div className="info-strip">
                <div>
                  <span>Total funding</span>
                  <strong>{selectedBatch.quote.totalFundingUsdc.toFixed(2)} USDC</strong>
                </div>
                <div>
                  <span>Total fees</span>
                  <strong>{selectedBatch.quote.totalFeesLocal.toFixed(2)} local</strong>
                </div>
                <div>
                  <span>Expires</span>
                  <strong>{new Date(selectedBatch.quote.expiresAt).toLocaleString()}</strong>
                </div>
              </div>
            ) : null}

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Beneficiary</th>
                    <th>Country</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatch.payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td>{payout.beneficiaryName}</td>
                      <td>{payout.country}</td>
                      <td>
                        {payout.amountLocal} {payout.currency}
                      </td>
                      <td>{payout.status}</td>
                      <td>
                        <button className="ghost" onClick={() => onDispatch(payout.id)}>
                          Dispatch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="split-panel">
              <section>
                <h3>Funding dashboard</h3>
                {selectedBatch.fundingInstruction ? (
                  <>
                    <p>Wallet: {selectedBatch.fundingInstruction.walletAddress}</p>
                    <p>Expected amount: {selectedBatch.fundingInstruction.expectedAmount.toFixed(2)} USDC</p>
                    <button
                      className="primary"
                      onClick={() =>
                        onFunding(selectedBatch.fundingInstruction!.id, selectedBatch.fundingInstruction!.expectedAmount)
                      }
                    >
                      Register full funding
                    </button>
                  </>
                ) : (
                  <p>Generate funding instructions after approval.</p>
                )}
                {!selectedBatch.fundingInstruction && selectedBatch.batch.status === "approved" ? (
                  <button className="primary" onClick={() => onGenerateFunding(selectedBatch.batch.id)}>
                    Generate funding instructions
                  </button>
                ) : null}
              </section>

              <section>
                <h3>Audit trail</h3>
                <div className="audit-list">
                  {selectedBatch.auditTrail.map((entry) => (
                    <div key={entry.id} className="audit-item">
                      <strong>{entry.action}</strong>
                      <span>{entry.actorName}</span>
                      <time>{new Date(entry.createdAt).toLocaleString()}</time>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </article>
    </section>
  );
}

function ExceptionsPage(props: {
  data: BootstrapPayload | null;
  search: string;
  setSearch: (next: string) => void;
  filteredExceptions: BootstrapPayload["exceptions"];
  onResolveException: (id: string) => void;
  onResolveCompliance: (id: string) => void;
}) {
  const { data, search, setSearch, filteredExceptions, onResolveException, onResolveCompliance } = props;
  return (
    <section className="page-grid two-columns">
      <article className="panel">
        <h2>Exception inbox</h2>
        <input value={search} placeholder="Filter by type, summary, country" onChange={(event) => setSearch(event.target.value)} />
        <div className="stack">
          {filteredExceptions.map((entry) => (
            <div className="issue-card" key={entry.id}>
              <div>
                <strong>{entry.type}</strong>
                <p>{entry.summary}</p>
              </div>
              <div className="inline-actions">
                <span className={entry.status === "open" ? "pill danger" : "pill success"}>{entry.status}</span>
                {entry.status === "open" ? (
                  <button className="ghost" onClick={() => onResolveException(entry.id)}>
                    Resolve
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <h2>Compliance review queue</h2>
        <div className="stack">
          {data?.complianceCases.map((entry) => (
            <div className="issue-card" key={entry.id}>
              <div>
                <strong>{entry.reason}</strong>
                <p>{entry.payoutId ?? entry.batchId}</p>
              </div>
              <div className="inline-actions">
                <span className={entry.status === "open" ? "pill warning" : "pill success"}>{entry.status}</span>
                {entry.status === "open" ? (
                  <button className="primary" onClick={() => onResolveCompliance(entry.id)}>
                    Clear review
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function ReportsPage({ data }: { data: BootstrapPayload | null }) {
  return (
    <section className="page-grid">
      <article className="panel wide">
        <h2>Batch reporting</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Status</th>
                <th>Total local</th>
                <th>Total funding</th>
                <th>Payouts</th>
                <th>Paid</th>
                <th>Failed</th>
              </tr>
            </thead>
            <tbody>
              {data?.reports.map((row) => (
                <tr key={row.batchId}>
                  <td>{row.batchName}</td>
                  <td>{row.status}</td>
                  <td>{row.totalLocal.toLocaleString()}</td>
                  <td>{row.totalFundingUsdc.toFixed(2)} USDC</td>
                  <td>{row.payoutCount}</td>
                  <td>{row.paidCount}</td>
                  <td>{row.failedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
