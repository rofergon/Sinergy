import { useEffect, useState } from "react";
import type { BootstrapPayload } from "../lib/api";

type CompanyPageProps = {
  data: BootstrapPayload | null;
  onSave: (payload: { displayName: string; webhookUrl: string; authorizedWallets: string[] }) => void;
};

export function CompanyPage({ data, onSave }: CompanyPageProps) {
  const [displayName, setDisplayName] = useState(data?.company.displayName ?? "");
  const [webhookUrl, setWebhookUrl] = useState(data?.company.webhookUrl ?? "");
  const [wallets, setWallets] = useState((data?.company.authorizedWallets ?? []).join(", "));
  const walletList = wallets
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const readinessItems = [
    { label: "Company account active", detail: data?.company.onboardingStatus === "active" ? "Ready to operate" : "Activation required", done: data?.company.onboardingStatus === "active" },
    { label: "Webhook configured", detail: webhookUrl ? "Payout events can be delivered" : "Add a webhook URL for event delivery", done: Boolean(webhookUrl) },
    { label: "Authorized funding wallets", detail: walletList.length ? `${walletList.length} wallet${walletList.length === 1 ? "" : "s"} allowed` : "Add at least one treasury source wallet", done: walletList.length > 0 },
    { label: "Demo role access", detail: "Finance, approver, compliance, and admin users are available", done: true },
    { label: "Funding ready", detail: walletList.length ? "USDC funding instructions can be reconciled" : "Funding validation needs an authorized source wallet", done: walletList.length > 0 },
  ];

  useEffect(() => {
    setDisplayName(data?.company.displayName ?? "");
    setWebhookUrl(data?.company.webhookUrl ?? "");
    setWallets((data?.company.authorizedWallets ?? []).join(", "));
  }, [data?.company.displayName, data?.company.webhookUrl, data?.company.authorizedWallets]);

  return (
    <section className="page-grid two-columns">
      <article className="panel company-settings-panel">
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
              authorizedWallets: wallets
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        >
          Save settings
        </button>
      </article>

      <article className="panel company-readiness-panel">
        <div className="panel-title-row">
          <div>
            <h2>Payment readiness</h2>
            <span className="helper">These checks tell finance whether the workspace can fund and automate LATAM payouts.</span>
          </div>
          <span className="pill success">
            {readinessItems.filter((item) => item.done).length}/{readinessItems.length} ready
          </span>
        </div>
        <div className="readiness-list">
          {readinessItems.map((item) => (
            <div className={`readiness-row ${item.done ? "done" : ""}`} key={item.label}>
              <span>{item.done ? "OK" : "!"}</span>
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
