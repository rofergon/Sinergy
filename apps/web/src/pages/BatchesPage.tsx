import type { CreateBatchDto } from "@latam-payouts/contracts";
import type { BatchDetail, BootstrapPayload } from "../lib/api";

type BatchesPageProps = {
  data: BootstrapPayload | null;
  selectedBatch: BatchDetail | null;
  batchForm: CreateBatchDto;
  setBatchForm: (next: CreateBatchDto) => void;
  csvImport: string;
  setCsvImport: (next: string) => void;
  openBatch: (id: string) => void;
  onCreateBatch: () => void;
  onImportBatch: () => void;
  onQuote: (batchId: string) => void;
  onApprove: (batchId: string) => void;
  onGenerateFunding: (batchId: string) => void;
  onRefreshFunding: (instructionId: string) => void;
  onRecordFallbackFunding: (instructionId: string, amount: number) => void;
  onDispatch: (payoutId: string) => void;
};

export function BatchesPage({
  data,
  selectedBatch,
  batchForm,
  setBatchForm,
  csvImport,
  setCsvImport,
  openBatch,
  onCreateBatch,
  onImportBatch,
  onQuote,
  onApprove,
  onGenerateFunding,
  onRefreshFunding,
  onRecordFallbackFunding,
  onDispatch,
}: BatchesPageProps) {
  const beneficiaries = data?.beneficiaries ?? [];

  return (
    <section className="page-grid two-columns">
      <article className="panel">
        <h2>Batch creation</h2>
        <label>
          Batch name
          <input value={batchForm.name} onChange={(event) => setBatchForm({ ...batchForm, name: event.target.value })} />
        </label>
        <label>
          Add payout
          <div className="inline-form">
            <select
              onChange={(event) => {
                const beneficiaryId = event.target.value;
                if (!beneficiaryId) {
                  return;
                }
                setBatchForm({
                  ...batchForm,
                  payouts: [...batchForm.payouts, { beneficiaryId, amountLocal: 0 }],
                });
              }}
            >
              <option value="">Select beneficiary</option>
              {beneficiaries.map((beneficiary) => (
                <option key={beneficiary.id} value={beneficiary.id}>
                  {beneficiary.name} ({beneficiary.country})
                </option>
              ))}
            </select>
          </div>
        </label>
        <div className="stack">
          {batchForm.payouts.map((payout, index) => (
            <div className="inline-form" key={`${payout.beneficiaryId}-${index}`}>
              <span>{beneficiaries.find((item) => item.id === payout.beneficiaryId)?.name ?? payout.beneficiaryId}</span>
              <input
                type="number"
                min="0"
                value={payout.amountLocal}
                onChange={(event) => {
                  const next = [...batchForm.payouts];
                  next[index] = { ...next[index], amountLocal: Number(event.target.value) };
                  setBatchForm({ ...batchForm, payouts: next });
                }}
              />
            </div>
          ))}
        </div>
        <button className="primary" onClick={onCreateBatch}>
          Create batch
        </button>

        <h3>CSV import</h3>
        <textarea value={csvImport} onChange={(event) => setCsvImport(event.target.value)} rows={7} />
        <button className="ghost" onClick={onImportBatch}>
          Import CSV
        </button>

        <h3>Existing batches</h3>
        <div className="stack">
          {data?.batches.map((batch) => (
            <button key={batch.id} className="list-button" onClick={() => openBatch(batch.id)}>
              <span>{batch.name}</span>
              <span className="pill neutral">{batch.status}</span>
            </button>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Batch detail</h2>
        {!selectedBatch ? <p>Select a batch to inspect quote, approvals, funding, and payouts.</p> : null}
        {selectedBatch ? (
          <>
            <div className="detail-header">
              <div>
                <h3>{selectedBatch.batch.name}</h3>
                <p>
                  Status: <span className="pill neutral">{selectedBatch.batch.status}</span>
                </p>
              </div>
              <div className="inline-actions">
                <button className="ghost" onClick={() => onQuote(selectedBatch.batch.id)}>
                  Generate quote
                </button>
                <button className="primary" onClick={() => onApprove(selectedBatch.batch.id)}>
                  Approve batch
                </button>
              </div>
            </div>

            {selectedBatch.quote ? (
              <div className="info-strip">
                <div>
                  <span>Total funding</span>
                  <strong>{selectedBatch.quote.totalFundingUsdc.toFixed(2)} USDC</strong>
                </div>
                <div>
                  <span>Total fees</span>
                  <strong>{selectedBatch.quote.totalFeesLocal.toFixed(2)} local</strong>
                </div>
                <div>
                  <span>Expires</span>
                  <strong>{new Date(selectedBatch.quote.expiresAt).toLocaleString()}</strong>
                </div>
              </div>
            ) : null}

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Beneficiary</th>
                    <th>Country</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatch.payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td>{payout.beneficiaryName}</td>
                      <td>{payout.country}</td>
                      <td>
                        {payout.amountLocal} {payout.currency}
                      </td>
                      <td>{payout.status}</td>
                      <td>
                        <button className="ghost" onClick={() => onDispatch(payout.id)}>
                          Dispatch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="split-panel">
              <section>
                <h3>Funding dashboard</h3>
                {selectedBatch.fundingInstruction ? (
                  <>
                    <p>Network: {selectedBatch.fundingInstruction.cluster}</p>
                    <p>Treasury wallet: {selectedBatch.fundingInstruction.recipientAddress}</p>
                    <p>Token account: {selectedBatch.fundingInstruction.recipientTokenAccount}</p>
                    <p>Token mint: {selectedBatch.fundingInstruction.tokenMint}</p>
                    <p>Reference: {selectedBatch.fundingInstruction.reference}</p>
                    {selectedBatch.fundingInstruction.memo ? <p>Memo: {selectedBatch.fundingInstruction.memo}</p> : null}
                    <p>Expected amount: {selectedBatch.fundingInstruction.expectedAmount.toFixed(2)} USDC</p>
                    <p>Status: {selectedBatch.fundingInstruction.status}</p>
                    {selectedBatch.fundingInstruction.lastScanAt ? (
                      <p>Last scan: {new Date(selectedBatch.fundingInstruction.lastScanAt).toLocaleString()}</p>
                    ) : null}
                    {selectedBatch.fundingInstruction.latestSignature ? (
                      <p>Latest signature: {selectedBatch.fundingInstruction.latestSignature}</p>
                    ) : null}
                    <div className="inline-actions">
                      <button className="primary" onClick={() => onRefreshFunding(selectedBatch.fundingInstruction!.id)}>
                        Refresh funding status
                      </button>
                      <button
                        className="ghost"
                        onClick={() =>
                          onRecordFallbackFunding(selectedBatch.fundingInstruction!.id, selectedBatch.fundingInstruction!.expectedAmount)
                        }
                      >
                        Register manual fallback
                      </button>
                    </div>
                    {selectedBatch.fundingTransactions.length ? (
                      <div className="audit-list">
                        {selectedBatch.fundingTransactions.map((transaction) => (
                          <div key={transaction.id} className="audit-item">
                            <strong>{transaction.signature}</strong>
                            <span>
                              {transaction.amountReceived.toFixed(2)} USDC via {transaction.detectionSource}
                            </span>
                            <time>{new Date(transaction.createdAt).toLocaleString()}</time>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p>Generate funding instructions after approval.</p>
                )}
                {!selectedBatch.fundingInstruction && selectedBatch.batch.status === "approved" ? (
                  <button className="primary" onClick={() => onGenerateFunding(selectedBatch.batch.id)}>
                    Generate funding instructions
                  </button>
                ) : null}
              </section>

              <section>
                <h3>Audit trail</h3>
                <div className="audit-list">
                  {selectedBatch.auditTrail.map((entry) => (
                    <div key={entry.id} className="audit-item">
                      <strong>{entry.action}</strong>
                      <span>{entry.actorName}</span>
                      <time>{new Date(entry.createdAt).toLocaleString()}</time>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </article>
    </section>
  );
}
