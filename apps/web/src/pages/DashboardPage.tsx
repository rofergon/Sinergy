import type { Batch, BootstrapPayload, Payout } from "../lib/api";
import { MetricIcon } from "../components/icons";

type MetricTone = "blue" | "green" | "amber" | "red";

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function formatUsdc(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} USDC`;
}

function statusTone(status: string): MetricTone {
  if (["completed", "paid", "funded"].includes(status)) {
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

function getProjectPayouts(batch: Batch, payouts: Payout[]) {
  return payouts.filter((payout) => payout.batchId === batch.id);
}

export function DashboardPage({ data }: { data: BootstrapPayload | null }) {
  const batches = data?.batches ?? [];
  const payouts = data?.payouts ?? [];
  const activeProjects = batches.filter((batch) => !["completed", "failed"].includes(batch.status));
  const approvedPayouts = payouts.filter((payout) => payout.approvalStatus === "approved");
  const payablePayouts = approvedPayouts.filter((payout) => ["funded", "dispatching"].includes(payout.status));
  const paidPayouts = payouts.filter((payout) => payout.status === "paid");
  const failedPayouts = payouts.filter((payout) => payout.status === "failed");
  const pendingApproval = payouts.filter((payout) => payout.approvalStatus === "pending").length;
  const totalFundingRequired = batches.reduce((sum, batch) => sum + batch.totalFundingUsdc, 0);
  const fundedAmount = batches
    .filter((batch) => ["funded", "dispatching", "completed"].includes(batch.status))
    .reduce((sum, batch) => sum + batch.totalFundingUsdc, 0);

  const metricCards: Array<{ label: string; value: string; detail: string; tone: MetricTone; icon: string }> = [
    {
      label: "Proyectos activos",
      value: activeProjects.length.toString(),
      detail: `${batches.length} proyectos totales`,
      tone: "blue",
      icon: "document",
    },
    {
      label: "Fondeo requerido",
      value: formatUsdc(totalFundingRequired),
      detail: `${formatUsdc(fundedAmount)} fondeado`,
      tone: "green",
      icon: "wallet",
    },
    {
      label: "Personas por aprobar",
      value: pendingApproval.toString(),
      detail: `${approvedPayouts.length} aprobadas para pago`,
      tone: "amber",
      icon: "alert",
    },
    {
      label: "Pagos en curso",
      value: payablePayouts.length.toString(),
      detail: "fondeados o enviándose",
      tone: "blue",
      icon: "volume",
    },
    {
      label: "Pagos fallidos",
      value: failedPayouts.length.toString(),
      detail: `${paidPayouts.length} pagados correctamente`,
      tone: failedPayouts.length ? "red" : "green",
      icon: "shield",
    },
  ];

  return (
    <section className="operations-page monitor-page">
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

      <article className="panel ops-panel">
        <div className="panel-title-row">
          <h2>Monitoreo por proyecto</h2>
          <span className="helper">Fondeo, aprobaciones y pagos actuales</span>
        </div>
        <div className="table-shell">
          <table className="ops-table project-monitor-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Estado</th>
                <th>Personas</th>
                <th>Aprobadas</th>
                <th>Pagadas</th>
                <th>Fallidas</th>
                <th>Fondeo</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const projectPayouts = getProjectPayouts(batch, payouts);
                const approved = projectPayouts.filter((payout) => payout.approvalStatus === "approved").length;
                const paid = projectPayouts.filter((payout) => payout.status === "paid").length;
                const failed = projectPayouts.filter((payout) => payout.status === "failed").length;
                return (
                  <tr key={batch.id}>
                    <td>
                      <strong>{batch.name}</strong>
                      <span className="cell-subtext">Creado {new Date(batch.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td>
                      <span className={`pill ${statusTone(batch.status) === "red" ? "danger" : statusTone(batch.status) === "green" ? "success" : "warning"}`}>
                        {humanize(batch.status)}
                      </span>
                    </td>
                    <td>{projectPayouts.length}</td>
                    <td>{approved}</td>
                    <td>{paid}</td>
                    <td className={failed ? "danger-text" : ""}>{failed}</td>
                    <td>{formatUsdc(batch.totalFundingUsdc)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <div className="operations-split monitor-split">
        {batches.slice(0, 3).map((batch) => {
          const projectPayouts = getProjectPayouts(batch, payouts);
          return (
            <article className="panel ops-panel project-monitor-card" key={batch.id}>
              <div className="panel-title-row">
                <h2>{batch.name}</h2>
                <span className="pill neutral">{humanize(batch.status)}</span>
              </div>
              <div className="project-person-feed">
                {projectPayouts.map((payout) => (
                  <div className="person-payment-row" key={payout.id}>
                    <span className={`queue-dot ${statusTone(payout.status)}`} />
                    <div>
                      <strong>{payout.beneficiaryName}</strong>
                      <small>
                        {humanize(payout.approvalStatus)} · {humanize(payout.status)} · {payout.fundingAmountUsdc.toFixed(2)} USDC
                      </small>
                    </div>
                    <span className="pill neutral">{payout.country}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
