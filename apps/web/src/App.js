import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { api } from "./lib/api";
const navItems = [
    { to: "/", label: "Operations" },
    { to: "/company", label: "Company" },
    { to: "/beneficiaries", label: "Beneficiaries" },
    { to: "/batches", label: "Batches" },
    { to: "/exceptions", label: "Exceptions" },
    { to: "/reports", label: "Reports" },
];
const emptyBeneficiaryForm = {
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
    const [session, setSession] = useState(() => {
        const value = localStorage.getItem("latam-payouts-session");
        return value ? JSON.parse(value) : null;
    });
    const [data, setData] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [loginForm, setLoginForm] = useState({ email: "finance@acme-pay.com", password: "demo123" });
    const [beneficiaryForm, setBeneficiaryForm] = useState(emptyBeneficiaryForm);
    const [batchForm, setBatchForm] = useState({ name: "New payroll batch", payouts: [] });
    const [csvImport, setCsvImport] = useState("beneficiaryId,amountLocal\nben_co_001,2500000\nben_mx_001,18000");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    useEffect(() => {
        if (!session) {
            return;
        }
        void refreshWorkspace(session.accessToken);
    }, [session?.accessToken]);
    async function refreshWorkspace(token) {
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
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load workspace data.");
        }
        finally {
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
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "Login failed.");
        }
        finally {
            setLoading(false);
        }
    }
    async function runAction(action, successMessage) {
        if (!session) {
            return;
        }
        setLoading(true);
        try {
            await action();
            await refreshWorkspace(session.accessToken);
            setMessage(successMessage);
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "The action could not be completed.");
        }
        finally {
            setLoading(false);
        }
    }
    async function openBatch(batchId) {
        if (!session) {
            return;
        }
        setLoading(true);
        try {
            const detail = await api.getBatch(session.accessToken, batchId);
            setSelectedBatch(detail);
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load the batch.");
        }
        finally {
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
        return (_jsx("div", { className: "login-shell", children: _jsxs("section", { className: "login-card", children: [_jsx("p", { className: "eyebrow", children: "Global Payroll Payouts" }), _jsx("h1", { children: "LatAm payout operations console" }), _jsx("p", { className: "lede", children: "Run beneficiary onboarding, batch approvals, USDC funding, payout tracking, and exception handling from one place." }), _jsxs("label", { children: ["Email", _jsx("input", { value: loginForm.email, onChange: (event) => setLoginForm({ ...loginForm, email: event.target.value }) })] }), _jsxs("label", { children: ["Password", _jsx("input", { type: "password", value: loginForm.password, onChange: (event) => setLoginForm({ ...loginForm, password: event.target.value }) })] }), _jsx("button", { className: "primary", onClick: () => void handleLogin(), disabled: loading, children: loading ? "Signing in..." : "Enter workspace" }), _jsx("p", { className: "helper", children: "Demo users: finance, approver, compliance. Password: demo123" }), message ? _jsx("p", { className: "message", children: message }) : null] }) }));
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Ops Core" }), _jsx("h2", { children: "LatAm Payouts" }), _jsx("p", { className: "sidebar-copy", children: session.user.name }), _jsx("p", { className: "sidebar-copy role", children: session.user.role.replaceAll("_", " ") })] }), _jsx("nav", { children: navItems.map((item) => (_jsx(NavLink, { to: item.to, end: true, className: ({ isActive }) => (isActive ? "nav-link active" : "nav-link"), children: item.label }, item.to))) }), _jsx("button", { className: "ghost", onClick: () => {
                            localStorage.removeItem("latam-payouts-session");
                            setSession(null);
                            setData(null);
                            setSelectedBatch(null);
                        }, children: "Sign out" })] }), _jsxs("main", { className: "main-panel", children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Operational workspace" }), _jsx("h1", { children: "Global companies paying talent in Colombia and Mexico" })] }), _jsxs("div", { className: "status-box", children: [_jsx("span", { className: loading ? "dot live" : "dot" }), loading ? "Syncing" : "Ready"] })] }), message ? _jsx("div", { className: "banner", children: message }) : null, _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, { data: data }) }), _jsx(Route, { path: "/company", element: _jsx(CompanyPage, { data: data, onSave: (payload) => runAction(() => api.updateCompany(session.accessToken, payload).then(() => Promise.resolve()), "Company settings updated.") }) }), _jsx(Route, { path: "/beneficiaries", element: _jsx(BeneficiariesPage, { data: data, form: beneficiaryForm, setForm: setBeneficiaryForm, onCreate: () => runAction(() => api.createBeneficiary(session.accessToken, beneficiaryForm).then(() => Promise.resolve()), "Beneficiary created.") }) }), _jsx(Route, { path: "/batches", element: _jsx(BatchesPage, { data: data, selectedBatch: selectedBatch, batchForm: batchForm, setBatchForm: setBatchForm, csvImport: csvImport, setCsvImport: setCsvImport, openBatch: (batchId) => void openBatch(batchId), onCreateBatch: () => runAction(async () => {
                                        const detail = await api.createBatch(session.accessToken, batchForm);
                                        setSelectedBatch(detail);
                                    }, "Batch created."), onImportBatch: () => runAction(async () => {
                                        const detail = await api.importBatch(session.accessToken, `${batchForm.name} import`, csvImport);
                                        setSelectedBatch(detail);
                                    }, "CSV batch imported."), onQuote: (batchId) => runAction(async () => {
                                        await api.createQuote(session.accessToken, batchId);
                                        const detail = await api.getBatch(session.accessToken, batchId);
                                        setSelectedBatch(detail);
                                    }, "Quote generated."), onApprove: (batchId) => runAction(async () => {
                                        const detail = await api.approveBatch(session.accessToken, batchId, "Approved in console");
                                        setSelectedBatch(detail);
                                    }, "Batch approved."), onGenerateFunding: (batchId) => runAction(async () => {
                                        await api.getFundingInstructions(session.accessToken, batchId);
                                        const detail = await api.getBatch(session.accessToken, batchId);
                                        setSelectedBatch(detail);
                                    }, "Funding instructions generated."), onFunding: (instructionId, amount) => runAction(async () => {
                                        await api.recordFunding(session.accessToken, {
                                            fundingInstructionId: instructionId,
                                            txHash: `SOLANA-TX-${Date.now()}`,
                                            amountReceived: amount,
                                        });
                                        if (selectedBatch) {
                                            const detail = await api.getBatch(session.accessToken, selectedBatch.batch.id);
                                            setSelectedBatch(detail);
                                        }
                                    }, "Funding transaction recorded."), onDispatch: (payoutId) => runAction(async () => {
                                        await api.dispatchPayout(session.accessToken, payoutId);
                                        if (selectedBatch) {
                                            const detail = await api.getBatch(session.accessToken, selectedBatch.batch.id);
                                            setSelectedBatch(detail);
                                        }
                                    }, "Payout dispatched.") }) }), _jsx(Route, { path: "/exceptions", element: _jsx(ExceptionsPage, { data: data, search: search, setSearch: setSearch, filteredExceptions: filteredExceptions, onResolveException: (exceptionId) => runAction(() => api.resolveException(session.accessToken, exceptionId).then(() => Promise.resolve()), "Exception resolved."), onResolveCompliance: (caseId) => runAction(() => api.resolveComplianceCase(session.accessToken, caseId).then(() => Promise.resolve()), "Compliance case resolved.") }) }), _jsx(Route, { path: "/reports", element: _jsx(ReportsPage, { data: data }) })] })] })] }));
}
function DashboardPage({ data }) {
    const cards = [
        { label: "Batches pending approval", value: data?.batches.filter((item) => item.status === "awaiting_approval").length ?? 0 },
        { label: "Funding pending", value: data?.batches.filter((item) => item.status === "awaiting_funding").length ?? 0 },
        { label: "Failed payouts", value: data?.payouts.filter((item) => item.status === "failed").length ?? 0 },
        { label: "Open exceptions", value: data?.exceptions.filter((item) => item.status === "open").length ?? 0 },
    ];
    return (_jsxs("section", { className: "page-grid", children: [_jsx("div", { className: "card-grid", children: cards.map((card) => (_jsxs("article", { className: "metric-card", children: [_jsx("p", { children: card.label }), _jsx("strong", { children: card.value })] }, card.label))) }), _jsxs("article", { className: "panel wide", children: [_jsx("h2", { children: "Corridor summary" }), _jsx("div", { className: "table-shell", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Country" }), _jsx("th", { children: "Currency" }), _jsx("th", { children: "Required fields" }), _jsx("th", { children: "Quote TTL" })] }) }), _jsx("tbody", { children: data?.corridors.map((corridor) => (_jsxs("tr", { children: [_jsx("td", { children: corridor.code }), _jsx("td", { children: corridor.currency }), _jsx("td", { children: corridor.requiredFields.join(", ") }), _jsxs("td", { children: [corridor.quoteTtlMinutes, " min"] })] }, corridor.code))) })] }) })] })] }));
}
function CompanyPage({ data, onSave, }) {
    const [displayName, setDisplayName] = useState(data?.company.displayName ?? "");
    const [webhookUrl, setWebhookUrl] = useState(data?.company.webhookUrl ?? "");
    const [wallets, setWallets] = useState((data?.company.authorizedWallets ?? []).join(", "));
    useEffect(() => {
        setDisplayName(data?.company.displayName ?? "");
        setWebhookUrl(data?.company.webhookUrl ?? "");
        setWallets((data?.company.authorizedWallets ?? []).join(", "));
    }, [data?.company.displayName, data?.company.webhookUrl, data?.company.authorizedWallets]);
    return (_jsx("section", { className: "page-grid", children: _jsxs("article", { className: "panel", children: [_jsx("h2", { children: "Company settings" }), _jsxs("label", { children: ["Display name", _jsx("input", { value: displayName, onChange: (event) => setDisplayName(event.target.value) })] }), _jsxs("label", { children: ["Webhook URL", _jsx("input", { value: webhookUrl, onChange: (event) => setWebhookUrl(event.target.value) })] }), _jsxs("label", { children: ["Authorized funding wallets", _jsx("textarea", { value: wallets, onChange: (event) => setWallets(event.target.value), rows: 4 })] }), _jsx("button", { className: "primary", onClick: () => onSave({
                        displayName,
                        webhookUrl,
                        authorizedWallets: wallets.split(",").map((item) => item.trim()).filter(Boolean),
                    }), children: "Save settings" })] }) }));
}
function BeneficiariesPage({ data, form, setForm, onCreate, }) {
    return (_jsxs("section", { className: "page-grid two-columns", children: [_jsxs("article", { className: "panel", children: [_jsx("h2", { children: "Beneficiary management" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["Name", _jsx("input", { value: form.name, onChange: (event) => setForm({ ...form, name: event.target.value }) })] }), _jsxs("label", { children: ["Email", _jsx("input", { value: form.email, onChange: (event) => setForm({ ...form, email: event.target.value }) })] }), _jsxs("label", { children: ["Country", _jsxs("select", { value: form.country, onChange: (event) => setForm({ ...form, country: event.target.value }), children: [_jsx("option", { value: "CO", children: "Colombia" }), _jsx("option", { value: "MX", children: "Mexico" })] })] }), _jsxs("label", { children: ["Bank name", _jsx("input", { value: form.bankName, onChange: (event) => setForm({ ...form, bankName: event.target.value }) })] }), _jsxs("label", { children: ["Account holder", _jsx("input", { value: form.accountHolderName, onChange: (event) => setForm({ ...form, accountHolderName: event.target.value }) })] }), form.country === "CO" ? (_jsxs(_Fragment, { children: [_jsxs("label", { children: ["Account number", _jsx("input", { value: form.accountNumber, onChange: (event) => setForm({ ...form, accountNumber: event.target.value }) })] }), _jsxs("label", { children: ["Account type", _jsx("input", { value: form.accountType, onChange: (event) => setForm({ ...form, accountType: event.target.value }) })] }), _jsxs("label", { children: ["Document number", _jsx("input", { value: form.documentNumber, onChange: (event) => setForm({ ...form, documentNumber: event.target.value }) })] })] })) : (_jsxs("label", { children: ["CLABE", _jsx("input", { value: form.clabe, onChange: (event) => setForm({ ...form, clabe: event.target.value }) })] }))] }), _jsx("button", { className: "primary", onClick: onCreate, children: "Create beneficiary" })] }), _jsxs("article", { className: "panel", children: [_jsx("h2", { children: "Current beneficiaries" }), _jsx("div", { className: "table-shell", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Country" }), _jsx("th", { children: "Currency" }), _jsx("th", { children: "Validation" })] }) }), _jsx("tbody", { children: data?.beneficiaries.map((beneficiary) => (_jsxs("tr", { children: [_jsx("td", { children: beneficiary.name }), _jsx("td", { children: beneficiary.country }), _jsx("td", { children: beneficiary.currency }), _jsx("td", { children: _jsx("span", { className: beneficiary.validationStatus === "valid" ? "pill success" : "pill danger", children: beneficiary.validationStatus }) })] }, beneficiary.id))) })] }) })] })] }));
}
function BatchesPage(props) {
    const { data, selectedBatch, batchForm, setBatchForm, csvImport, setCsvImport, openBatch, onCreateBatch, onImportBatch, onQuote, onApprove, onGenerateFunding, onFunding, onDispatch, } = props;
    const beneficiaries = data?.beneficiaries ?? [];
    return (_jsxs("section", { className: "page-grid two-columns", children: [_jsxs("article", { className: "panel", children: [_jsx("h2", { children: "Batch creation" }), _jsxs("label", { children: ["Batch name", _jsx("input", { value: batchForm.name, onChange: (event) => setBatchForm({ ...batchForm, name: event.target.value }) })] }), _jsxs("label", { children: ["Add payout", _jsx("div", { className: "inline-form", children: _jsxs("select", { onChange: (event) => {
                                        const beneficiaryId = event.target.value;
                                        if (!beneficiaryId) {
                                            return;
                                        }
                                        setBatchForm({
                                            ...batchForm,
                                            payouts: [...batchForm.payouts, { beneficiaryId, amountLocal: 0 }],
                                        });
                                    }, children: [_jsx("option", { value: "", children: "Select beneficiary" }), beneficiaries.map((beneficiary) => (_jsxs("option", { value: beneficiary.id, children: [beneficiary.name, " (", beneficiary.country, ")"] }, beneficiary.id)))] }) })] }), _jsx("div", { className: "stack", children: batchForm.payouts.map((payout, index) => (_jsxs("div", { className: "inline-form", children: [_jsx("span", { children: beneficiaries.find((item) => item.id === payout.beneficiaryId)?.name ?? payout.beneficiaryId }), _jsx("input", { type: "number", min: "0", value: payout.amountLocal, onChange: (event) => {
                                        const next = [...batchForm.payouts];
                                        next[index] = { ...next[index], amountLocal: Number(event.target.value) };
                                        setBatchForm({ ...batchForm, payouts: next });
                                    } })] }, `${payout.beneficiaryId}-${index}`))) }), _jsx("button", { className: "primary", onClick: onCreateBatch, children: "Create batch" }), _jsx("h3", { children: "CSV import" }), _jsx("textarea", { value: csvImport, onChange: (event) => setCsvImport(event.target.value), rows: 7 }), _jsx("button", { className: "ghost", onClick: onImportBatch, children: "Import CSV" }), _jsx("h3", { children: "Existing batches" }), _jsx("div", { className: "stack", children: data?.batches.map((batch) => (_jsxs("button", { className: "list-button", onClick: () => openBatch(batch.id), children: [_jsx("span", { children: batch.name }), _jsx("span", { className: "pill neutral", children: batch.status })] }, batch.id))) })] }), _jsxs("article", { className: "panel", children: [_jsx("h2", { children: "Batch detail" }), !selectedBatch ? _jsx("p", { children: "Select a batch to inspect quote, approvals, funding, and payouts." }) : null, selectedBatch ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "detail-header", children: [_jsxs("div", { children: [_jsx("h3", { children: selectedBatch.batch.name }), _jsxs("p", { children: ["Status: ", _jsx("span", { className: "pill neutral", children: selectedBatch.batch.status })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { className: "ghost", onClick: () => onQuote(selectedBatch.batch.id), children: "Generate quote" }), _jsx("button", { className: "primary", onClick: () => onApprove(selectedBatch.batch.id), children: "Approve batch" })] })] }), selectedBatch.quote ? (_jsxs("div", { className: "info-strip", children: [_jsxs("div", { children: [_jsx("span", { children: "Total funding" }), _jsxs("strong", { children: [selectedBatch.quote.totalFundingUsdc.toFixed(2), " USDC"] })] }), _jsxs("div", { children: [_jsx("span", { children: "Total fees" }), _jsxs("strong", { children: [selectedBatch.quote.totalFeesLocal.toFixed(2), " local"] })] }), _jsxs("div", { children: [_jsx("span", { children: "Expires" }), _jsx("strong", { children: new Date(selectedBatch.quote.expiresAt).toLocaleString() })] })] })) : null, _jsx("div", { className: "table-shell", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Beneficiary" }), _jsx("th", { children: "Country" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Action" })] }) }), _jsx("tbody", { children: selectedBatch.payouts.map((payout) => (_jsxs("tr", { children: [_jsx("td", { children: payout.beneficiaryName }), _jsx("td", { children: payout.country }), _jsxs("td", { children: [payout.amountLocal, " ", payout.currency] }), _jsx("td", { children: payout.status }), _jsx("td", { children: _jsx("button", { className: "ghost", onClick: () => onDispatch(payout.id), children: "Dispatch" }) })] }, payout.id))) })] }) }), _jsxs("div", { className: "split-panel", children: [_jsxs("section", { children: [_jsx("h3", { children: "Funding dashboard" }), selectedBatch.fundingInstruction ? (_jsxs(_Fragment, { children: [_jsxs("p", { children: ["Wallet: ", selectedBatch.fundingInstruction.walletAddress] }), _jsxs("p", { children: ["Expected amount: ", selectedBatch.fundingInstruction.expectedAmount.toFixed(2), " USDC"] }), _jsx("button", { className: "primary", onClick: () => onFunding(selectedBatch.fundingInstruction.id, selectedBatch.fundingInstruction.expectedAmount), children: "Register full funding" })] })) : (_jsx("p", { children: "Generate funding instructions after approval." })), !selectedBatch.fundingInstruction && selectedBatch.batch.status === "approved" ? (_jsx("button", { className: "primary", onClick: () => onGenerateFunding(selectedBatch.batch.id), children: "Generate funding instructions" })) : null] }), _jsxs("section", { children: [_jsx("h3", { children: "Audit trail" }), _jsx("div", { className: "audit-list", children: selectedBatch.auditTrail.map((entry) => (_jsxs("div", { className: "audit-item", children: [_jsx("strong", { children: entry.action }), _jsx("span", { children: entry.actorName }), _jsx("time", { children: new Date(entry.createdAt).toLocaleString() })] }, entry.id))) })] })] })] })) : null] })] }));
}
function ExceptionsPage(props) {
    const { data, search, setSearch, filteredExceptions, onResolveException, onResolveCompliance } = props;
    return (_jsxs("section", { className: "page-grid two-columns", children: [_jsxs("article", { className: "panel", children: [_jsx("h2", { children: "Exception inbox" }), _jsx("input", { value: search, placeholder: "Filter by type, summary, country", onChange: (event) => setSearch(event.target.value) }), _jsx("div", { className: "stack", children: filteredExceptions.map((entry) => (_jsxs("div", { className: "issue-card", children: [_jsxs("div", { children: [_jsx("strong", { children: entry.type }), _jsx("p", { children: entry.summary })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("span", { className: entry.status === "open" ? "pill danger" : "pill success", children: entry.status }), entry.status === "open" ? (_jsx("button", { className: "ghost", onClick: () => onResolveException(entry.id), children: "Resolve" })) : null] })] }, entry.id))) })] }), _jsxs("article", { className: "panel", children: [_jsx("h2", { children: "Compliance review queue" }), _jsx("div", { className: "stack", children: data?.complianceCases.map((entry) => (_jsxs("div", { className: "issue-card", children: [_jsxs("div", { children: [_jsx("strong", { children: entry.reason }), _jsx("p", { children: entry.payoutId ?? entry.batchId })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("span", { className: entry.status === "open" ? "pill warning" : "pill success", children: entry.status }), entry.status === "open" ? (_jsx("button", { className: "primary", onClick: () => onResolveCompliance(entry.id), children: "Clear review" })) : null] })] }, entry.id))) })] })] }));
}
function ReportsPage({ data }) {
    return (_jsx("section", { className: "page-grid", children: _jsxs("article", { className: "panel wide", children: [_jsx("h2", { children: "Batch reporting" }), _jsx("div", { className: "table-shell", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Batch" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Total local" }), _jsx("th", { children: "Total funding" }), _jsx("th", { children: "Payouts" }), _jsx("th", { children: "Paid" }), _jsx("th", { children: "Failed" })] }) }), _jsx("tbody", { children: data?.reports.map((row) => (_jsxs("tr", { children: [_jsx("td", { children: row.batchName }), _jsx("td", { children: row.status }), _jsx("td", { children: row.totalLocal.toLocaleString() }), _jsxs("td", { children: [row.totalFundingUsdc.toFixed(2), " USDC"] }), _jsx("td", { children: row.payoutCount }), _jsx("td", { children: row.paidCount }), _jsx("td", { children: row.failedCount })] }, row.batchId))) })] }) })] }) }));
}
