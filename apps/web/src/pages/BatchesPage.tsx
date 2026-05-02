import { useMemo, useState } from "react";
import type { CreateBatchDto, CreateBeneficiaryDto, Payout, UpdatePayoutDto } from "@latam-payouts/contracts";
import type { BatchDetail, Beneficiary, BootstrapPayload } from "../lib/api";

type BatchesPageProps = {
  data: BootstrapPayload | null;
  selectedBatch: BatchDetail | null;
  batchForm: CreateBatchDto;
  setBatchForm: (next: CreateBatchDto) => void;
  csvImport: string;
  setCsvImport: (next: string) => void;
  personForm: CreateBeneficiaryDto;
  setPersonForm: (next: CreateBeneficiaryDto) => void;
  openBatch: (id: string) => void;
  onCreateBatch: () => void;
  onImportBatch: () => void;
  onCreatePerson: () => void;
  onUpdatePerson: (id: string, body: Partial<CreateBeneficiaryDto>) => void;
  onUpdatePayout: (payoutId: string, body: UpdatePayoutDto) => void;
  onQuote: (batchId: string) => void;
  onApprove: (batchId: string) => void;
  onGenerateFunding: (batchId: string) => void;
  onRefreshFunding: (instructionId: string) => void;
  onRecordFallbackFunding: (instructionId: string, amount: number) => void;
  onDispatch: (payoutId: string) => void;
  onSendApproved: (batchId: string) => void;
};

const editableProjectStatuses = ["draft", "validated", "quoted", "awaiting_approval", "approved"];

function formatMoney(value: number, currency: string) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function getPersonForm(beneficiary: Beneficiary): CreateBeneficiaryDto {
  return {
    name: beneficiary.name,
    email: beneficiary.email,
    country: beneficiary.country,
    kind: beneficiary.kind,
    bankName: beneficiary.bankName,
    accountHolderName: beneficiary.accountHolderName,
    accountNumber: beneficiary.accountNumber ?? "",
    accountType: beneficiary.accountType ?? "",
    clabe: beneficiary.clabe ?? "",
    documentNumber: beneficiary.documentNumber ?? "",
  };
}

function getApprovalTone(status: Payout["approvalStatus"]) {
  if (status === "approved") {
    return "success";
  }
  if (status === "excluded") {
    return "danger";
  }
  return "warning";
}

export function BatchesPage({
  data,
  selectedBatch,
  batchForm,
  setBatchForm,
  csvImport,
  setCsvImport,
  personForm,
  setPersonForm,
  openBatch,
  onCreateBatch,
  onImportBatch,
  onCreatePerson,
  onUpdatePerson,
  onUpdatePayout,
  onQuote,
  onApprove,
  onGenerateFunding,
  onRefreshFunding,
  onRecordFallbackFunding,
  onDispatch,
  onSendApproved,
}: BatchesPageProps) {
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const beneficiaries = data?.beneficiaries ?? [];
  const batches = data?.batches ?? [];
  const selectedProjectPayouts = selectedBatch?.payouts ?? [];
  const canEditProject = selectedBatch ? editableProjectStatuses.includes(selectedBatch.batch.status) : false;

  const selectedProjectStats = useMemo(() => {
    const approved = selectedProjectPayouts.filter((payout) => payout.approvalStatus === "approved");
    const excluded = selectedProjectPayouts.filter((payout) => payout.approvalStatus === "excluded");
    const pending = selectedProjectPayouts.filter((payout) => payout.approvalStatus === "pending");
    const paid = selectedProjectPayouts.filter((payout) => payout.status === "paid");
    const failed = selectedProjectPayouts.filter((payout) => payout.status === "failed");
    return { approved, excluded, pending, paid, failed };
  }, [selectedProjectPayouts]);

  function addDraftPayout(beneficiaryId: string) {
    if (!beneficiaryId || batchForm.payouts.some((payout) => payout.beneficiaryId === beneficiaryId)) {
      return;
    }
    setBatchForm({ ...batchForm, payouts: [...batchForm.payouts, { beneficiaryId, amountLocal: 0 }] });
  }

  function updateDraftAmount(index: number, amountLocal: number) {
    const next = [...batchForm.payouts];
    next[index] = { ...next[index], amountLocal };
    setBatchForm({ ...batchForm, payouts: next });
  }

  function removeDraftPayout(index: number) {
    setBatchForm({ ...batchForm, payouts: batchForm.payouts.filter((_, itemIndex) => itemIndex !== index) });
  }

  return (
    <section className="project-workspace">
      <aside className="project-rail">
        <article className="panel ops-panel">
          <div className="panel-title-row">
            <h2>Proyectos</h2>
            <span className="pill neutral">{batches.length} activos</span>
          </div>
          <div className="project-list">
            {batches.map((batch) => {
              const projectPayouts = data?.payouts.filter((payout) => payout.batchId === batch.id) ?? [];
              const approvedCount = projectPayouts.filter((payout) => payout.approvalStatus === "approved").length;
              const paidCount = projectPayouts.filter((payout) => payout.status === "paid").length;
              return (
                <button
                  key={batch.id}
                  className={`project-list-item ${selectedBatch?.batch.id === batch.id ? "active" : ""}`}
                  onClick={() => openBatch(batch.id)}
                >
                  <span>
                    <strong>{batch.name}</strong>
                    <small>
                      {approvedCount}/{projectPayouts.length} aprobadas · {paidCount} pagadas
                    </small>
                  </span>
                  <span className="pill neutral">{humanize(batch.status)}</span>
                </button>
              );
            })}
          </div>
        </article>

        <article className="panel ops-panel">
          <h2>Crear proyecto</h2>
          <label>
            Nombre del proyecto
            <input value={batchForm.name} onChange={(event) => setBatchForm({ ...batchForm, name: event.target.value })} />
          </label>
          <label>
            Agregar persona existente
            <select value="" onChange={(event) => addDraftPayout(event.target.value)}>
              <option value="">Seleccionar persona</option>
              {beneficiaries.map((beneficiary) => (
                <option key={beneficiary.id} value={beneficiary.id}>
                  {beneficiary.name} ({beneficiary.country})
                </option>
              ))}
            </select>
          </label>
          <div className="draft-payout-list">
            {batchForm.payouts.map((payout, index) => {
              const beneficiary = beneficiaries.find((item) => item.id === payout.beneficiaryId);
              return (
                <div className="draft-payout-row" key={`${payout.beneficiaryId}-${index}`}>
                  <span>{beneficiary?.name ?? payout.beneficiaryId}</span>
                  <input
                    type="number"
                    min="0"
                    value={payout.amountLocal}
                    onChange={(event) => updateDraftAmount(index, Number(event.target.value))}
                  />
                  <button className="ghost icon-button" onClick={() => removeDraftPayout(index)} aria-label="Remove person">
                    x
                  </button>
                </div>
              );
            })}
          </div>
          <button className="primary" onClick={onCreateBatch}>
            Crear proyecto
          </button>
          <details className="compact-details">
            <summary>Importar CSV</summary>
            <textarea value={csvImport} onChange={(event) => setCsvImport(event.target.value)} rows={5} />
            <button className="ghost" onClick={onImportBatch}>
              Importar como proyecto
            </button>
          </details>
        </article>

        <article className="panel ops-panel">
          <h2>Crear persona</h2>
          <PersonForm form={personForm} setForm={setPersonForm} />
          <button className="ghost" onClick={onCreatePerson}>
            Guardar persona
          </button>
        </article>
      </aside>

      <article className="panel ops-panel project-detail-panel">
        {!selectedBatch ? (
          <div className="empty-state">
            <h2>Selecciona un proyecto</h2>
            <p>Revisa personas, aprobaciones, fondeo y pagos desde un solo lugar.</p>
          </div>
        ) : (
          <>
            <div className="detail-header project-detail-header">
              <div>
                <p className="eyebrow">Proyecto</p>
                <h2>{selectedBatch.batch.name}</h2>
                <span className="pill neutral">{humanize(selectedBatch.batch.status)}</span>
              </div>
              <div className="inline-actions project-actions">
                <button className="ghost" onClick={() => onQuote(selectedBatch.batch.id)}>
                  Cotizar aprobados
                </button>
                <button className="ghost" onClick={() => onApprove(selectedBatch.batch.id)}>
                  Aprobar proyecto
                </button>
                {!selectedBatch.fundingInstruction && selectedBatch.batch.status === "approved" ? (
                  <button className="primary" onClick={() => onGenerateFunding(selectedBatch.batch.id)}>
                    Generar fondeo
                  </button>
                ) : null}
                {["funded", "dispatching", "failed"].includes(selectedBatch.batch.status) ? (
                  <button className="primary" onClick={() => onSendApproved(selectedBatch.batch.id)}>
                    Enviar pagos aprobados
                  </button>
                ) : null}
              </div>
            </div>

            <div className="project-stat-grid">
              <div>
                <span>Personas</span>
                <strong>{selectedProjectPayouts.length}</strong>
              </div>
              <div>
                <span>Aprobadas</span>
                <strong>{selectedProjectStats.approved.length}</strong>
              </div>
              <div>
                <span>Pendientes</span>
                <strong>{selectedProjectStats.pending.length}</strong>
              </div>
              <div>
                <span>Fondeo requerido</span>
                <strong>{selectedBatch.batch.totalFundingUsdc.toFixed(2)} USDC</strong>
              </div>
            </div>

            <section className="project-section">
              <div className="panel-title-row">
                <h2>Personas del proyecto</h2>
                <span className="helper">
                  {selectedProjectStats.excluded.length} excluidas · {selectedProjectStats.failed.length} fallidas
                </span>
              </div>
              <div className="table-shell">
                <table className="ops-table project-people-table">
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Banco</th>
                      <th>Monto</th>
                      <th>Aprobación</th>
                      <th>Pago</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProjectPayouts.map((payout) => {
                      const beneficiary = beneficiaries.find((item) => item.id === payout.beneficiaryId);
                      return (
                        <tr key={payout.id}>
                          <td>
                            <strong>{payout.beneficiaryName}</strong>
                            <span className="cell-subtext">
                              {payout.country} · {beneficiary?.email ?? "sin email"}
                            </span>
                          </td>
                          <td>
                            {beneficiary?.bankName ?? "N/A"}
                            <span className="cell-subtext">{beneficiary?.validationStatus ?? "unknown"}</span>
                          </td>
                          <td>
                            {canEditProject ? (
                              <input
                                className="amount-cell-input"
                                type="number"
                                min="0"
                                defaultValue={payout.amountLocal}
                                onBlur={(event) => {
                                  const amountLocal = Number(event.target.value);
                                  if (amountLocal !== payout.amountLocal) {
                                    onUpdatePayout(payout.id, { amountLocal });
                                  }
                                }}
                              />
                            ) : (
                              formatMoney(payout.amountLocal, payout.currency)
                            )}
                            <span className="cell-subtext">{payout.fundingAmountUsdc.toFixed(2)} USDC</span>
                          </td>
                          <td>
                            <span className={`pill ${getApprovalTone(payout.approvalStatus)}`}>{humanize(payout.approvalStatus)}</span>
                          </td>
                          <td>
                            <span className="pill neutral">{humanize(payout.status)}</span>
                            {payout.validationErrors.length ? <span className="cell-subtext danger-text">{payout.validationErrors[0]}</span> : null}
                          </td>
                          <td>
                            <div className="row-actions">
                              {canEditProject ? (
                                <>
                                  <button className="ghost" onClick={() => onUpdatePayout(payout.id, { approvalStatus: "approved" })}>
                                    Aprobar
                                  </button>
                                  <button className="ghost" onClick={() => onUpdatePayout(payout.id, { approvalStatus: "excluded" })}>
                                    Excluir
                                  </button>
                                </>
                              ) : null}
                              {selectedBatch.batch.status === "funded" && payout.approvalStatus === "approved" && payout.status === "funded" ? (
                                <button className="ghost" onClick={() => onDispatch(payout.id)}>
                                  Enviar
                                </button>
                              ) : null}
                              {beneficiary ? (
                                <button
                                  className="ghost"
                                  onClick={() => {
                                    setEditingPersonId(beneficiary.id);
                                    setPersonForm(getPersonForm(beneficiary));
                                  }}
                                >
                                  Editar
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {editingPersonId ? (
              <section className="project-section inline-editor">
                <div className="panel-title-row">
                  <h2>Editar persona</h2>
                  <button className="ghost" onClick={() => setEditingPersonId(null)}>
                    Cerrar
                  </button>
                </div>
                <PersonForm form={personForm} setForm={setPersonForm} />
                <button className="primary" onClick={() => onUpdatePerson(editingPersonId, personForm)}>
                  Guardar cambios
                </button>
              </section>
            ) : null}

            <div className="project-sections-grid">
              <section className="project-section">
                <h2>Fondeo</h2>
                {selectedBatch.quote ? (
                  <div className="info-strip">
                    <div>
                      <span>Total USDC</span>
                      <strong>{selectedBatch.quote.totalFundingUsdc.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Fees locales</span>
                      <strong>{selectedBatch.quote.totalFeesLocal.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Expira</span>
                      <strong>{new Date(selectedBatch.quote.expiresAt).toLocaleString()}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="helper">Cotiza las personas aprobadas para calcular el fondeo del contrato.</p>
                )}
                {selectedBatch.fundingInstruction ? (
                  <div className="funding-card">
                    <p>Estado: {humanize(selectedBatch.fundingInstruction.status)}</p>
                    <p>Wallet: {selectedBatch.fundingInstruction.recipientAddress}</p>
                    <p>Token account: {selectedBatch.fundingInstruction.recipientTokenAccount}</p>
                    <p>Referencia: {selectedBatch.fundingInstruction.reference}</p>
                    <p>Esperado: {selectedBatch.fundingInstruction.expectedAmount.toFixed(2)} USDC</p>
                    <div className="inline-actions">
                      <button className="ghost" onClick={() => onRefreshFunding(selectedBatch.fundingInstruction!.id)}>
                        Revisar fondeo
                      </button>
                      <button
                        className="ghost"
                        onClick={() => onRecordFallbackFunding(selectedBatch.fundingInstruction!.id, selectedBatch.fundingInstruction!.expectedAmount)}
                      >
                        Registrar fondeo manual
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="project-section">
                <h2>Auditoría</h2>
                <div className="audit-list compact-audit">
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
        )}
      </article>
    </section>
  );
}

function PersonForm({ form, setForm }: { form: CreateBeneficiaryDto; setForm: (next: CreateBeneficiaryDto) => void }) {
  return (
    <div className="form-grid compact-person-form">
      <label>
        Nombre
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>
      <label>
        Email
        <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      </label>
      <label>
        País
        <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value as "CO" | "MX" })}>
          <option value="CO">Colombia</option>
          <option value="MX">Mexico</option>
        </select>
      </label>
      <label>
        Tipo
        <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as "employee" | "contractor" })}>
          <option value="employee">Empleado</option>
          <option value="contractor">Contratista</option>
        </select>
      </label>
      <label>
        Banco
        <input value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
      </label>
      <label>
        Titular
        <input value={form.accountHolderName} onChange={(event) => setForm({ ...form, accountHolderName: event.target.value })} />
      </label>
      {form.country === "CO" ? (
        <>
          <label>
            Cuenta
            <input value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} />
          </label>
          <label>
            Tipo cuenta
            <input value={form.accountType} onChange={(event) => setForm({ ...form, accountType: event.target.value })} />
          </label>
          <label>
            Documento
            <input value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} />
          </label>
        </>
      ) : (
        <label>
          CLABE
          <input value={form.clabe} onChange={(event) => setForm({ ...form, clabe: event.target.value })} />
        </label>
      )}
    </div>
  );
}
