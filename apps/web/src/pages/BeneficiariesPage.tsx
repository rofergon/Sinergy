import { useMemo, useState } from "react";
import type { CountryCode, CreateBeneficiaryDto } from "@latam-payouts/contracts";
import { MetricIcon } from "../components/icons";
import {
  BeneficiaryBankingFields,
  BeneficiaryIdentityFields,
  applyBeneficiaryCountryDefaults,
  beneficiaryCountryOptions,
  getBeneficiaryChecklist,
  getCountryOption,
} from "../components/forms/BeneficiaryFormFields";
import type { Beneficiary, BootstrapPayload } from "../lib/api";

type BeneficiariesPageProps = {
  data: BootstrapPayload | null;
  form: CreateBeneficiaryDto;
  setForm: (next: CreateBeneficiaryDto) => void;
  onCreate: () => void;
};

type CountryFilter = "ALL" | CountryCode;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function downloadBeneficiaryRecord(beneficiary: Beneficiary, history: Array<Record<string, string | number>>) {
  const payload = {
    exportedAt: new Date().toISOString(),
    beneficiary,
    history,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${beneficiary.name.toLowerCase().replace(/\s+/g, "-")}-record.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BeneficiariesPage({ data, form, setForm, onCreate }: BeneficiariesPageProps) {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("ALL");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [search, setSearch] = useState("");

  const beneficiaries = data?.beneficiaries ?? [];
  const batches = data?.batches ?? [];
  const payouts = data?.payouts ?? [];
  const selectedCountry = getCountryOption(form.country);
  const projectOptions = batches.map((batch) => ({ id: batch.id, name: batch.name }));
  const checklist = getBeneficiaryChecklist(form);
  const completedChecklist = checklist.filter((item) => item.done).length;
  const isReadyToCreate = checklist.every((item) => item.done);

  const filteredBeneficiaries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return beneficiaries.filter((beneficiary) => {
      const matchesCountry = countryFilter === "ALL" ? true : beneficiary.country === countryFilter;
      const matchesSearch = normalizedSearch
        ? `${beneficiary.name} ${beneficiary.email} ${beneficiary.projectName ?? ""} ${beneficiary.bankName}`.toLowerCase().includes(normalizedSearch)
        : true;
      return matchesCountry && matchesSearch;
    });
  }, [beneficiaries, countryFilter, search]);

  const selectedBeneficiary =
    filteredBeneficiaries.find((beneficiary) => beneficiary.id === selectedBeneficiaryId) ??
    filteredBeneficiaries[0] ??
    null;

  const selectedCountryOption =
    selectedBeneficiary ? beneficiaryCountryOptions.find((option) => option.code === selectedBeneficiary.country) : null;

  const selectedHistory = useMemo(() => {
    if (!selectedBeneficiary) {
      return [];
    }

    return payouts
      .filter((payout) => payout.beneficiaryId === selectedBeneficiary.id)
      .map((payout) => {
        const batch = batches.find((item) => item.id === payout.batchId);
        return {
          id: payout.id,
          project: batch?.name ?? selectedBeneficiary.projectName ?? "No project",
          status: humanize(payout.status),
          approval: humanize(payout.approvalStatus),
          country: payout.country,
          amount: `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(payout.amountLocal)} ${payout.currency}`,
          funding: `${payout.fundingAmountUsdc.toFixed(2)} USDC`,
          createdAt: batch?.createdAt ?? selectedBeneficiary.createdAt,
        };
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [batches, payouts, selectedBeneficiary]);

  return (
    <section className="operations-page beneficiaries-page people-directory-page">
      <div className="people-directory-hero">
        <div>
          <p className="eyebrow">People workspace</p>
          <h2>Employee directory and payout history</h2>
          <span className="helper">Filter by market, review the most important payout details, and open onboarding only when you need to add someone new.</span>
        </div>
        <button className="primary" onClick={() => setIsOnboardingOpen((current) => !current)}>
          {isOnboardingOpen ? "Close onboarding" : "Add employee"}
        </button>
      </div>

      <div className="people-directory-toolbar">
        <div className="market-tabs onboarding-country-tabs" aria-label="People country filter">
          <button className={`market-tab onboarding-country-tab ${countryFilter === "ALL" ? "active" : ""}`} onClick={() => setCountryFilter("ALL")}>
            <span>
              <strong>All markets</strong>
              <small>{beneficiaries.length} people</small>
            </span>
          </button>
          {beneficiaryCountryOptions.map((option) => {
            const count = beneficiaries.filter((beneficiary) => beneficiary.country === option.code).length;
            return (
              <button
                key={option.code}
                className={`market-tab onboarding-country-tab ${countryFilter === option.code ? "active" : ""}`}
                onClick={() => setCountryFilter(option.code)}
              >
                <img src={option.flag} alt="" />
                <span>
                  <strong>{option.label}</strong>
                  <small>{count} people</small>
                </span>
              </button>
            );
          })}
        </div>

        <label className="search-control people-search-control">
          <span className="sr-only">Search employees</span>
          <input value={search} placeholder="Search by name, email, project, or bank..." onChange={(event) => setSearch(event.target.value)} />
          <MetricIcon name="search" className="control-icon" />
        </label>
      </div>

      {isOnboardingOpen ? (
        <article className="panel ops-panel beneficiary-form-panel onboarding-main-panel">
          <div className="onboarding-hero-shell">
            <div>
              <h2>Employee onboarding</h2>
              <span className="helper">Capture the worker profile first, then the payout requirements for the selected market.</span>
            </div>
            <span className="pill neutral">
              {completedChecklist}/{checklist.length} ready
            </span>
          </div>

          <div className="market-tabs onboarding-country-tabs" aria-label="Beneficiary country">
            {beneficiaryCountryOptions.map((option) => {
              const isActive = option.code === form.country;
              return (
                <button
                  key={option.code}
                  className={`market-tab onboarding-country-tab ${isActive ? "active" : ""}`}
                  onClick={() => setForm(applyBeneficiaryCountryDefaults(form, option.code))}
                >
                  <img src={option.flag} alt="" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.currency}</small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="beneficiary-onboarding-layout">
            <div className="beneficiary-flow-grid">
              <section className="onboarding-step-card">
                <div className="onboarding-step-heading">
                  <span className="pill neutral">Step 1</span>
                  <div>
                    <h3>Employee profile</h3>
                    <p>Identity, assignment, and the minimum context operations needs to recognize the person.</p>
                  </div>
                </div>
                <BeneficiaryIdentityFields form={form} setForm={setForm} projectOptions={projectOptions} />
              </section>

              <section className="onboarding-step-card">
                <div className="onboarding-step-heading">
                  <span className="pill neutral">Step 2</span>
                  <div>
                    <h3>{selectedCountry.label} payout details</h3>
                    <p>{selectedCountry.summary}</p>
                  </div>
                </div>
                <BeneficiaryBankingFields form={form} setForm={setForm} />
              </section>
            </div>

            <aside className="onboarding-summary-panel">
              <div className="onboarding-market-card">
                <img src={selectedCountry.flag} alt="" />
                <div>
                  <strong>{selectedCountry.label}</strong>
                  <span>{selectedCountry.currency} payout setup</span>
                </div>
              </div>

              <div className="beneficiary-country-note gate-note">
                <strong>What ops needs for this market</strong>
                <span>{selectedCountry.researchNote}</span>
              </div>

              <div className="onboarding-checklist">
                <div className="panel-title-row">
                  <div>
                    <h2>Readiness checklist</h2>
                    <span className="helper">A quick pass before you save the employee.</span>
                  </div>
                </div>
                <div className="checklist-list">
                  {checklist.map((item) => (
                    <div className={`checklist-row ${item.done ? "done" : ""}`} key={item.label}>
                      <span className="checklist-icon">
                        <MetricIcon name={item.done ? "check" : "clock"} />
                      </span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="onboarding-submit">
                <button className="primary" onClick={onCreate} disabled={!isReadyToCreate}>
                  Create employee
                </button>
                <span className="helper">
                  {isReadyToCreate ? "Everything required is present for the selected country." : "Complete the checklist items to reduce payout rework later."}
                </span>
              </div>
            </aside>
          </div>
        </article>
      ) : null}

      <div className="people-directory-layout">
        <article className="panel ops-panel people-table-panel">
          <div className="panel-title-row">
            <div>
              <h2>Registered people</h2>
              <span className="helper">Most important fields visible first so ops can scan quickly.</span>
            </div>
            <span className="pill neutral">{filteredBeneficiaries.length} results</span>
          </div>
          <div className="table-shell">
            <table className="ops-table people-directory-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Country</th>
                  <th>Project</th>
                  <th>Bank</th>
                  <th>Type</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {filteredBeneficiaries.map((beneficiary) => {
                  const country = beneficiaryCountryOptions.find((option) => option.code === beneficiary.country);
                  const isSelected = selectedBeneficiary?.id === beneficiary.id;
                  return (
                    <tr
                      key={beneficiary.id}
                      className={isSelected ? "selected-row" : ""}
                      onClick={() => setSelectedBeneficiaryId(beneficiary.id)}
                    >
                      <td>
                        <strong>{beneficiary.name}</strong>
                        <span className="cell-subtext">{beneficiary.email}</span>
                      </td>
                      <td>
                        <span className="country-cell">
                          {country ? <img src={country.flag} alt="" /> : null}
                          {country?.label ?? beneficiary.country}
                        </span>
                      </td>
                      <td>{beneficiary.projectName || "No project assigned"}</td>
                      <td>
                        {beneficiary.bankName}
                        <span className="cell-subtext">{beneficiary.accountHolderName}</span>
                      </td>
                      <td>{beneficiary.kind}</td>
                      <td>
                        <span className={beneficiary.validationStatus === "valid" ? "pill success" : "pill danger"}>
                          {beneficiary.validationStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!filteredBeneficiaries.length ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="queue-empty">No employees match this country filter yet.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="panel ops-panel people-history-panel">
          {selectedBeneficiary ? (
            <>
              <div className="panel-title-row">
                <div>
                  <h2>{selectedBeneficiary.name}</h2>
                  <span className="helper">Employee record and payout history</span>
                </div>
                <button
                  className="ghost"
                  onClick={() =>
                    downloadBeneficiaryRecord(
                      selectedBeneficiary,
                      selectedHistory.map((item) => ({
                        project: item.project,
                        status: item.status,
                        approval: item.approval,
                        amount: item.amount,
                        funding: item.funding,
                        createdAt: item.createdAt,
                      })),
                    )
                  }
                >
                  Export record
                </button>
              </div>

              <div className="people-history-summary">
                <div>
                  <span>Country</span>
                  <strong>
                    {selectedCountryOption ? (
                      <span className="country-cell">
                        <img src={selectedCountryOption.flag} alt="" />
                        {selectedCountryOption.label}
                      </span>
                    ) : (
                      selectedBeneficiary.country
                    )}
                  </strong>
                </div>
                <div>
                  <span>Worker type</span>
                  <strong>{selectedBeneficiary.kind}</strong>
                </div>
                <div>
                  <span>Registered</span>
                  <strong>{formatDate(selectedBeneficiary.createdAt)}</strong>
                </div>
                <div>
                  <span>Validation</span>
                  <strong>{selectedBeneficiary.validationStatus}</strong>
                </div>
              </div>

              <div className="people-history-block">
                <h3>Important payout details</h3>
                <div className="people-history-grid">
                  <div>
                    <span>Email</span>
                    <strong>{selectedBeneficiary.email}</strong>
                  </div>
                  <div>
                    <span>Project</span>
                    <strong>{selectedBeneficiary.projectName || "No project assigned"}</strong>
                  </div>
                  <div>
                    <span>Bank</span>
                    <strong>{selectedBeneficiary.bankName}</strong>
                  </div>
                  <div>
                    <span>Account holder</span>
                    <strong>{selectedBeneficiary.accountHolderName}</strong>
                  </div>
                  <div>
                    <span>Document</span>
                    <strong>{selectedBeneficiary.documentType ? `${selectedBeneficiary.documentType} ${selectedBeneficiary.documentNumber ?? ""}` : "Not set"}</strong>
                  </div>
                  <div>
                    <span>Payout key</span>
                    <strong>{selectedBeneficiary.bankKey || selectedBeneficiary.clabe || selectedBeneficiary.accountNumber || "Not set"}</strong>
                  </div>
                </div>
              </div>

              <div className="people-history-block">
                <h3>Historical activity</h3>
                <div className="audit-list compact-audit people-history-list">
                  {selectedHistory.length ? (
                    selectedHistory.map((item) => (
                      <div key={item.id} className="audit-item">
                        <strong>{item.project}</strong>
                        <span>
                          {item.status} · {item.approval}
                        </span>
                        <span>
                          {item.amount} · {item.funding}
                        </span>
                        <time>{formatDate(item.createdAt)}</time>
                      </div>
                    ))
                  ) : (
                    <div className="queue-empty">No payout history yet for this employee.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Select an employee</h2>
              <p>Use the country filter and choose a person to inspect their details and history.</p>
            </div>
          )}
        </aside>
      </div>

    </section>
  );
}
