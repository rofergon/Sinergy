import type { BootstrapPayload } from "../lib/api";
import { useNavigate } from "react-router-dom";

type ExceptionsPageProps = {
  data: BootstrapPayload | null;
  search: string;
  setSearch: (next: string) => void;
  filteredExceptions: BootstrapPayload["exceptions"];
  onResolveException: (id: string) => void;
  onResolveCompliance: (id: string) => void;
};

const exceptionPlaybooks: Record<string, { title: string; steps: string }> = {
  funding_incomplete: {
    title: "Funding is below the expected amount",
    steps: "Check the expected USDC amount, ask treasury to top up with the same reference, then refresh funding status.",
  },
  funding_wallet_unauthorized: {
    title: "Funding came from an unauthorized wallet",
    steps: "Compare the source wallet with Company settings, add the wallet if approved, or ask treasury to resend from an authorized wallet.",
  },
  funding_invalid_mint: {
    title: "Wrong token mint",
    steps: "Confirm treasury sent Devnet USDC, not SOL or another token. Re-send using the funding instruction asset.",
  },
  funding_invalid_destination: {
    title: "Wrong destination",
    steps: "Compare the token account in the transaction with the project funding instruction before retrying reconciliation.",
  },
  funding_reference_missing: {
    title: "Missing or wrong reference",
    steps: "Ask treasury to include the project reference or record the transaction manually only after confirming ownership.",
  },
  quote_expired: {
    title: "Quote expired",
    steps: "Return to the project, generate a fresh quote, and send it back for approval.",
  },
  payout_failed: {
    title: "Partner payout failed",
    steps: "Review beneficiary bank details, correct the employee record, then create a replacement payout project if needed.",
  },
  manual_review: {
    title: "Manual review required",
    steps: "Open the compliance queue, clear the case, and confirm whether the payout should continue or be excluded.",
  },
  callback_inconsistent: {
    title: "Callback mismatch",
    steps: "Compare partner status with the audit trail and reports before marking the exception resolved.",
  },
};

export function ExceptionsPage({
  data,
  search,
  setSearch,
  filteredExceptions,
  onResolveException,
  onResolveCompliance,
}: ExceptionsPageProps) {
  const navigate = useNavigate();
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
                <div className="exception-playbook">
                  <span>{exceptionPlaybooks[entry.type]?.title ?? "Operational review"}</span>
                  <small>{exceptionPlaybooks[entry.type]?.steps ?? "Review the affected project, audit trail, and latest payment state before resolving."}</small>
                </div>
              </div>
              <div className="inline-actions">
                <span className={entry.status === "open" ? "pill danger" : "pill success"}>{entry.status}</span>
                {entry.batchId ? (
                  <button className="ghost" onClick={() => navigate(`/batches?batch=${entry.batchId}`)}>
                    Open project
                  </button>
                ) : null}
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
