import type { BootstrapPayload } from "../lib/api";

type ExceptionsPageProps = {
  data: BootstrapPayload | null;
  search: string;
  setSearch: (next: string) => void;
  filteredExceptions: BootstrapPayload["exceptions"];
  onResolveException: (id: string) => void;
  onResolveCompliance: (id: string) => void;
};

export function ExceptionsPage({
  data,
  search,
  setSearch,
  filteredExceptions,
  onResolveException,
  onResolveCompliance,
}: ExceptionsPageProps) {
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
