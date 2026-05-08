import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CountryCode } from "@latam-payouts/contracts";
import type { Batch, BootstrapPayload, ExceptionCase, Payout } from "../lib/api";
import { MetricIcon } from "../components/icons";

type MetricTone = "blue" | "green" | "amber" | "red";
type ActivityTone = MetricTone | "neutral";

const countryOptions: Array<{ code: CountryCode; label: string; flag: string; shortLabel: string }> = [
  { code: "CO", label: "Colombia", flag: "/flags/co.svg", shortLabel: "Colombia / CO" },
  { code: "MX", label: "Mexico", flag: "/flags/mx.svg", shortLabel: "Mexico / MX" },
  { code: "AR", label: "Argentina", flag: "/flags/ar.svg", shortLabel: "Argentina / AR" },
];

const currencyByCountry: Record<CountryCode, string> = {
  CO: "COP",
  MX: "MXN",
  AR: "ARS",
};

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function formatUsdc(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} USDC`;
}

function formatLocal(value: number, currency: string) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${currency}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusTone(status: string): MetricTone {
  if (["completed", "paid"].includes(status)) {
    return "green";
  }
  if (["failed"].includes(status)) {
    return "red";
  }
  if (["awaiting_funding", "awaiting_approval", "in_review"].includes(status)) {
    return "amber";
  }
  return "blue";
}

function statusLabel(status: string) {
  if (status === "awaiting_approval") {
    return "Awaiting approval";
  }
  if (["funded", "dispatching", "in_review"].includes(status)) {
    return "In progress";
  }
  if (status === "completed") {
    return "Paid";
  }
  if (status === "failed") {
    return "Exception";
  }
  return humanize(status);
}

function getProjectPayouts(batch: Batch, payouts: Payout[]) {
  return payouts.filter((payout) => payout.batchId === batch.id);
}

function getOperationCountries(batch: Batch, payouts: Payout[], beneficiaryCountries: Map<string, string[]>) {
  const payoutCountries = getProjectPayouts(batch, payouts).map((payout) => payout.country);
  const batchCountries = beneficiaryCountries.get(batch.id) ?? [];
  return Array.from(new Set([...payoutCountries, ...batchCountries]));
}

function getBatchExceptions(batch: Batch, exceptions: ExceptionCase[], country: CountryCode) {
  return exceptions.filter((entry) => entry.status === "open" && (entry.batchId === batch.id || entry.country === country));
}

function getOperationAmount(batch: Batch, projectPayouts: Payout[], country: CountryCode) {
  const countryPayouts = projectPayouts.filter((payout) => payout.country === country);
  const localTotal = countryPayouts.reduce((sum, payout) => sum + payout.amountLocal, 0);
  if (localTotal > 0) {
    return formatLocal(localTotal, currencyByCountry[country]);
  }
  return formatUsdc(batch.totalFundingUsdc);
}

export function DashboardPage({ data }: { data: BootstrapPayload | null }) {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("CO");
  const [search, setSearch] = useState("");
  const batches = data?.batches ?? [];
  const payouts = data?.payouts ?? [];
  const beneficiaries = data?.beneficiaries ?? [];
  const exceptions = data?.exceptions ?? [];
  const beneficiaryCountries = beneficiaries.reduce((map, beneficiary) => {
    if (!beneficiary.projectId) {
      return map;
    }
    const current = map.get(beneficiary.projectId) ?? [];
    map.set(beneficiary.projectId, current.includes(beneficiary.country) ? current : [...current, beneficiary.country]);
    return map;
  }, new Map<string, string[]>());

  const operations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return batches
      .map((batch) => {
        const projectPayouts = getProjectPayouts(batch, payouts);
        const countries = getOperationCountries(batch, payouts, beneficiaryCountries);
        const countryPayouts = projectPayouts.filter((payout) => payout.country === selectedCountry);
        const approved = countryPayouts.filter((payout) => payout.approvalStatus === "approved").length;
        const paid = countryPayouts.filter((payout) => payout.status === "paid").length;
        const batchExceptions = getBatchExceptions(batch, exceptions, selectedCountry);
        return {
          batch,
          projectPayouts,
          countries,
          beneficiaries: countryPayouts.length || projectPayouts.length,
          approved,
          paid,
          exceptions: batchExceptions.length,
          amount: getOperationAmount(batch, projectPayouts, selectedCountry),
        };
      })
      .filter((operation) => operation.countries.includes(selectedCountry))
      .filter((operation) => {
        if (!normalizedSearch) {
          return true;
        }
        return `${operation.batch.name} ${operation.batch.id} ${operation.countries.join(" ")}`.toLowerCase().includes(normalizedSearch);
      });
  }, [batches, beneficiaryCountries, exceptions, payouts, search, selectedCountry]);

  const operationBatchIds = new Set(operations.map((operation) => operation.batch.id));
  const countryPayouts = payouts.filter((payout) => payout.country === selectedCountry);
  const filteredPayouts = countryPayouts.filter((payout) => operationBatchIds.has(payout.batchId));
  const openExceptions = exceptions.filter((entry) => entry.status === "open" && (entry.country === selectedCountry || (entry.batchId ? operationBatchIds.has(entry.batchId) : false)));
  const awaitingApproval = filteredPayouts.filter((payout) => payout.approvalStatus === "pending").length;
  const paymentsInProgress = filteredPayouts.filter((payout) => ["funded", "dispatching", "in_review"].includes(payout.status)).length;
  const completedPaid = filteredPayouts.filter((payout) => payout.status === "paid").length;
  const activeOperations = operations.filter((operation) => !["completed", "failed"].includes(operation.batch.status)).length;

  const metricCards: Array<{ label: string; value: string; detail: string; tone: MetricTone; icon: string }> = [
    {
      label: "Active operations",
      value: activeOperations.toString(),
      detail: "Total running",
      tone: "blue",
      icon: "document",
    },
    {
      label: "Awaiting approval",
      value: awaitingApproval.toString(),
      detail: "Require review",
      tone: "amber",
      icon: "clock",
    },
    {
      label: "Payments in progress",
      value: paymentsInProgress.toString(),
      detail: "Disbursing",
      tone: "blue",
      icon: "card",
    },
    {
      label: "Exceptions",
      value: openExceptions.length.toString(),
      detail: "Need attention",
      tone: "red",
      icon: "alert",
    },
    {
      label: "Completed today",
      value: completedPaid.toString(),
      detail: "Successfully paid",
      tone: "green",
      icon: "check",
    },
  ];

  const alerts = [
    {
      tone: "red" as ActivityTone,
      icon: "alert",
      title: `${openExceptions.length} operations with exceptions`,
      detail: openExceptions.length ? "Review and resolve to continue payments." : "No open issues for this market.",
    },
    {
      tone: "amber" as ActivityTone,
      icon: "clock",
      title: `${awaitingApproval} operations awaiting approval`,
      detail: awaitingApproval ? "Pending review before funding or dispatch." : "Approval queue is clear.",
    },
    {
      tone: "blue" as ActivityTone,
      icon: "info",
      title: "Bank file processing delays",
      detail: "Some payments may take longer to settle.",
    },
  ];

  const recentActivity = [
    ...filteredPayouts.slice(0, 4).map((payout) => ({
      id: payout.id,
      tone: statusTone(payout.status) as ActivityTone,
      icon: payout.status === "paid" ? "check" : payout.status === "failed" ? "alert" : payout.approvalStatus === "pending" ? "clock" : "card",
      title: payout.status === "paid" ? "Payment completed" : payout.status === "failed" ? "Exception reported" : payout.approvalStatus === "pending" ? "Awaiting approval" : "Operation moved to in progress",
      detail: payout.beneficiaryName,
      time: payout.approvedAt ? formatTime(payout.approvedAt) : "Today",
    })),
    ...openExceptions.slice(0, 2).map((entry) => ({
      id: entry.id,
      tone: "red" as ActivityTone,
      icon: "alert",
      title: "Exception reported",
      detail: entry.summary,
      time: formatTime(entry.createdAt),
    })),
  ].slice(0, 5);

  return (
    <section className="monitoring-page">
      <header className="monitoring-hero">
        <div>
          <h1>Operations Monitoring</h1>
          <p>Track approval, payment, and exception status by market.</p>
        </div>
        <div className="market-tabs" aria-label="Destination market">
          {countryOptions.map((country) => (
            <button
              className={`market-tab ${country.code === selectedCountry ? "active" : ""}`}
              key={country.code}
              type="button"
              onClick={() => setSelectedCountry(country.code)}
              aria-label={`Show ${country.label} operations`}
              title={country.label}
            >
              <img src={country.flag} alt="" />
            </button>
          ))}
        </div>
      </header>

      <div className="ops-card-grid monitoring-kpis">
        {metricCards.map((card) => (
          <article className={`metric-card ops-metric ${card.tone}`} key={card.label}>
            <div className="metric-icon">
              <MetricIcon name={card.icon} />
            </div>
            <div>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="monitoring-grid">
        <article className="panel ops-panel queue-panel">
          <div className="queue-header">
            <h2>Operations Queue</h2>
            <div className="queue-tools">
              <label className="search-control">
                <span className="sr-only">Search operations</span>
                <input value={search} placeholder="Search operations..." onChange={(event) => setSearch(event.target.value)} />
                <MetricIcon name="search" className="control-icon" />
              </label>
              <button type="button" className="tool-button" onClick={() => navigate("/batches")}>
                <MetricIcon name="document" className="control-icon" />
                View projects
              </button>
            </div>
          </div>
          <div className="table-shell">
            <table className="ops-table project-monitor-table">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Destination Country</th>
                  <th>Status</th>
                  <th>Beneficiaries</th>
                  <th>Approved</th>
                  <th>Paid</th>
                  <th>Exceptions</th>
                  <th>Amount</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {operations.map((operation) => (
                  <tr key={operation.batch.id} onClick={() => navigate(`/batches?batch=${operation.batch.id}`)}>
                    <td>
                      <strong>{operation.batch.name}</strong>
                      <span className="cell-subtext">OP-{operation.batch.id.toUpperCase().slice(0, 12)}</span>
                    </td>
                    <td>
                      <span className="country-cell">
                        <img src={countryOptions.find((country) => country.code === selectedCountry)?.flag} alt="" />
                        {countryOptions.find((country) => country.code === selectedCountry)?.shortLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`pill status-pill ${statusTone(operation.batch.status) === "red" ? "danger" : statusTone(operation.batch.status) === "green" ? "success" : statusTone(operation.batch.status) === "amber" ? "warning" : "info"}`}>
                        {statusLabel(operation.batch.status)}
                      </span>
                    </td>
                    <td>{operation.beneficiaries}</td>
                    <td>{operation.approved}</td>
                    <td>{operation.paid}</td>
                    <td className={operation.exceptions ? "danger-text" : ""}>{operation.exceptions}</td>
                    <td>{operation.amount}</td>
                    <td>
                      <button
                        className="row-menu"
                        type="button"
                        aria-label={`Open ${operation.batch.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/batches?batch=${operation.batch.id}`);
                        }}
                      >
                        <MetricIcon name="kebab" className="control-icon" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!operations.length ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="queue-empty">No operations found for this market.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <footer className="queue-footer">
            <span>
              Showing {operations.length ? 1 : 0} to {operations.length} of {operations.length} operations
            </span>
            <div className="pagination-controls">
              <button type="button">20 per page</button>
              <button type="button" aria-label="Previous page">
                <MetricIcon name="chevronLeft" className="control-icon" />
              </button>
              <strong>1</strong>
              <button type="button">2</button>
              <button type="button" aria-label="Next page">
                <MetricIcon name="chevronRight" className="control-icon" />
              </button>
            </div>
          </footer>
        </article>

        <aside className="monitoring-rail">
          <article className="panel ops-panel side-card">
            <div className="side-card-title">
              <h2>Alerts & Notes</h2>
              <button type="button">View all</button>
            </div>
            <div className="alert-list">
              {alerts.map((alert) => (
                <div className={`alert-row ${alert.tone}`} key={alert.title}>
                  <div className="rail-icon">
                    <MetricIcon name={alert.icon} />
                  </div>
                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alert.detail}</span>
                  </div>
                  <MetricIcon name="chevronRight" className="control-icon" />
                </div>
              ))}
            </div>
          </article>

          <article className="panel ops-panel side-card activity-card">
            <div className="side-card-title">
              <h2>Recent Activity</h2>
              <button type="button">View all</button>
            </div>
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div className="activity-row" key={activity.id}>
                  <div className={`rail-icon ${activity.tone}`}>
                    <MetricIcon name={activity.icon} />
                  </div>
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{activity.detail}</span>
                  </div>
                  <time>{activity.time}</time>
                </div>
              ))}
              {!recentActivity.length ? <p className="queue-empty">No recent activity for this market.</p> : null}
            </div>
            <footer className="timezone-note">
              <MetricIcon name="clock" className="control-icon" />
              Times shown in America/Bogota (COT)
            </footer>
          </article>
        </aside>
      </div>
    </section>
  );
}
