import type { BootstrapPayload } from "../lib/api";

export function ReportsPage({ data }: { data: BootstrapPayload | null }) {
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
