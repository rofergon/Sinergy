import { useDeferredValue, useMemo, useState } from "react";
import { Route, Routes } from "react-router-dom";
import type { CreateBatchDto, CreateBeneficiaryDto, ExceptionCase } from "@latam-payouts/contracts";
import { AppLayout, LoginScreen } from "./components/layout";
import { emptyBeneficiaryForm, initialBatchForm, initialCsvImport, initialLoginForm } from "./constants/forms";
import { useOperationsActions } from "./hooks/useOperationsActions";
import { useSession } from "./hooks/useSession";
import { useWorkspace } from "./hooks/useWorkspace";
import { BatchesPage, BeneficiariesPage, CompanyPage, DashboardPage, ExceptionsPage, ReportsPage } from "./pages";

export default function App() {
  const [message, setMessage] = useState<string>("");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [loginLoading, setLoginLoading] = useState(false);
  const [beneficiaryForm, setBeneficiaryForm] = useState<CreateBeneficiaryDto>(emptyBeneficiaryForm);
  const [batchForm, setBatchForm] = useState<CreateBatchDto>(initialBatchForm);
  const [csvImport, setCsvImport] = useState(initialCsvImport);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { session, login, logout } = useSession();
  const {
    data,
    selectedBatch,
    loading: workspaceLoading,
    setLoading: setWorkspaceLoading,
    setSelectedBatch,
    refreshWorkspace,
    openBatch,
    resetWorkspace,
  } = useWorkspace(session, setMessage);
  const loading = loginLoading || workspaceLoading;

  const actions = useOperationsActions({
    session,
    selectedBatch,
    setLoading: setWorkspaceLoading,
    setMessage,
    setSelectedBatch,
    refreshWorkspace,
  });

  async function handleLogin() {
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      setMessage("Logged into the operations console.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    logout();
    resetWorkspace();
  }

  const filteredExceptions = useMemo(() => {
    if (!data) {
      return [];
    }
    const normalized = deferredSearch.toLowerCase();
    return data.exceptions.filter((entry: ExceptionCase) =>
      `${entry.type} ${entry.summary} ${entry.country ?? ""}`.toLowerCase().includes(normalized),
    );
  }, [data, deferredSearch]);

  if (!session) {
    return (
      <LoginScreen
        form={loginForm}
        loading={loading}
        message={message}
        onFormChange={setLoginForm}
        onLogin={() => void handleLogin()}
      />
    );
  }

  return (
    <AppLayout loading={loading} message={message} session={session} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage data={data} />} />
        <Route path="/company" element={<CompanyPage data={data} onSave={actions.saveCompany} />} />
        <Route
          path="/beneficiaries"
          element={
            <BeneficiariesPage
              data={data}
              form={beneficiaryForm}
              setForm={setBeneficiaryForm}
              onCreate={() => actions.createBeneficiary(beneficiaryForm)}
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
              onCreateBatch={() => actions.createBatch(batchForm)}
              onImportBatch={() => actions.importBatch(batchForm.name, csvImport)}
              onQuote={actions.createQuote}
              onApprove={actions.approveBatch}
              onGenerateFunding={actions.generateFunding}
              onRefreshFunding={actions.refreshFunding}
              onRecordFallbackFunding={actions.recordFallbackFunding}
              onDispatch={actions.dispatchPayout}
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
              onResolveException={actions.resolveException}
              onResolveCompliance={actions.resolveCompliance}
            />
          }
        />
        <Route path="/reports" element={<ReportsPage data={data} />} />
      </Routes>
    </AppLayout>
  );
}
