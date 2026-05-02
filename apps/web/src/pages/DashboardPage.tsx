import type { BootstrapPayload } from "../lib/api";
import { MetricIcon, NavIcon } from "../components/icons";

export function DashboardPage({ data }: { data: BootstrapPayload | null }) {
  type MetricTone = "blue" | "green" | "amber" | "red";
  type Priority = "High" | "Medium";
  type QueueTone = "blue" | "green" | "amber" | "red";

  const awaitingApproval = data?.batches.filter((item) => item.status === "awaiting_approval").length ?? 4;
  const failedPayouts = data?.payouts.filter((item) => item.status === "failed").length ?? 6;
  const openExceptions = data?.exceptions.filter((item) => item.status === "open").length ?? 9;

  const metricCards: Array<{ label: string; value: string; detail: string; tone: MetricTone; icon: string }> = [
    {
      label: "Awaiting approval",
      value: `${awaitingApproval} batches`,
      detail: "18,430 USDC - 2 quotes expiring soon",
      tone: "blue",
      icon: "document",
    },
    {
      label: "Funding required",
      value: "12,200 USDC",
      detail: "7,000 received - 5,200 shortfall",
      tone: "green",
      icon: "wallet",
    },
    {
      label: "Payouts at risk",
      value: failedPayouts.toString(),
      detail: "failed / in review - 3 overdue",
      tone: "amber",
      icon: "alert",
    },
    {
      label: "Open exceptions",
      value: openExceptions.toString(),
      detail: "3 high severity",
      tone: "red",
      icon: "shield",
    },
    {
      label: "Today's payout volume",
      value: "12.4K USDC",
      detail: "COP 45.2M - MXN 180K - ARS 12.8M",
      tone: "blue",
      icon: "volume",
    },
  ];
  const actionRows: Array<[Priority, string, string, string, string]> = [
    ["High", "Batch May Payroll", "Approver", "Quote expires in 12 min", "Approve / Reject"],
    ["High", "Funding shortfall", "Finance", "4,450 USDC missing", "Rescan / Investigate"],
    ["Medium", "Luis Herrera payout", "Finance", "Partner failed", "Retry / Escalate"],
    ["Medium", "Manual review", "Compliance", "Amount over threshold", "Clear / Hold"],
  ];
  const queueRows: Array<[string, number, string, string, QueueTone]> = [
    ["Awaiting funding", 12, "8,400", "2h 15m", "blue"],
    ["Funded", 9, "5,200", "45m", "green"],
    ["Dispatching", 4, "2,100", "20m", "amber"],
    ["Paid", 86, "44,000", "—", "green"],
    ["Failed", 3, "900", "1h 05m", "red"],
  ];
  const fundingRows: Array<[string, string, string, "Reconciled" | "Partial" | "Pending", string, string]> = [
    ["May Payroll", "6,420 USDC", "6,420 USDC", "Reconciled", "Treasury-01", "10:42 AM"],
    ["Contractor Cycle MX", "3,800 USDC", "2,150 USDC", "Partial", "Treasury-02", "10:37 AM"],
    ["Ops Batch CO", "1,980 USDC", "0 USDC", "Pending", "Treasury-01", "10:20 AM"],
  ];
  const exceptionRows: Array<[string, number, number, string]> = [
    ["Funding incomplete", 2, 1, "3h"],
    ["Payout failed", 4, 2, "1h"],
    ["Manual review", 3, 1, "45m"],
    ["Callback inconsistent", 1, 1, "20m"],
  ];

  return (
    <section className="operations-page">
      <div className="ops-card-grid">
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

      <article className="panel ops-panel action-panel">
        <h2>Action needed now</h2>
        <div className="table-shell">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Item</th>
                <th>Owner</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {actionRows.map(([priority, item, owner, reason, action]) => (
                <tr key={item}>
                  <td>
                    <span className={priority === "High" ? "pill danger" : "pill warning"}>{priority}</span>
                  </td>
                  <td>{item}</td>
                  <td>
                    <span className="owner-cell">
                      <NavIcon name="users" />
                      {owner}
                    </span>
                  </td>
                  <td className={priority === "High" ? "danger-text" : "warning-text"}>{reason}</td>
                  <td>
                    <button className={priority === "High" ? "outline danger" : "outline warning"}>
                      {action}
                      <span className="button-arrow" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="operations-split">
        <article className="panel ops-panel">
          <h2>Funding & reconciliation</h2>
          <div className="table-shell">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Expected</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th>Source wallet</th>
                  <th>Last scan</th>
                </tr>
              </thead>
              <tbody>
                {fundingRows.map(([batch, expected, received, status, wallet, scan]) => (
                  <tr key={batch}>
                    <td>{batch}</td>
                    <td>{expected}</td>
                    <td>{received}</td>
                    <td>
                      <span className={status === "Reconciled" ? "pill success" : status === "Partial" ? "pill warning" : "pill neutral"}>
                        {status}
                      </span>
                    </td>
                    <td>{wallet}</td>
                    <td>{scan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel ops-panel">
          <h2>Payout pipeline</h2>
          <div className="table-shell">
            <table className="ops-table pipeline-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Amount USDC</th>
                  <th>Oldest item</th>
                </tr>
              </thead>
              <tbody>
                {queueRows.map(([status, count, amount, oldest, tone]) => (
                  <tr key={status}>
                    <td>
                      <span className="queue-status">
                        <span className={`queue-dot ${tone}`} />
                        {status}
                      </span>
                    </td>
                    <td>{count}</td>
                    <td>{amount}</td>
                    <td className={tone === "red" ? "danger-text" : ""}>{oldest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="panel ops-panel">
        <h2>Exception inbox summary</h2>
        <div className="table-shell">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Open</th>
                <th>High severity</th>
                <th>Oldest</th>
              </tr>
            </thead>
            <tbody>
              {exceptionRows.map(([type, open, highSeverity, oldest]) => (
                <tr key={type}>
                  <td>{type}</td>
                  <td>{open}</td>
                  <td>{highSeverity}</td>
                  <td>{oldest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
