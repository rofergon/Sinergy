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
    </section>
  );
}
