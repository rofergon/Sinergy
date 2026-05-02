import { useState } from "react";
import type { CreateBeneficiaryDto } from "@latam-payouts/contracts";
import { BeneficiaryFormFields, applyBeneficiaryCountryDefaults, beneficiaryCountryOptions, getCountryOption } from "../components/forms/BeneficiaryFormFields";
import type { BootstrapPayload } from "../lib/api";

type BeneficiariesPageProps = {
  data: BootstrapPayload | null;
  form: CreateBeneficiaryDto;
  setForm: (next: CreateBeneficiaryDto) => void;
  onCreate: () => void;
};

export function BeneficiariesPage({ data, form, setForm, onCreate }: BeneficiariesPageProps) {
  const [countryConfirmed, setCountryConfirmed] = useState(false);
  const selectedCountry = getCountryOption(form.country);
  const projectOptions = (data?.batches ?? []).map((batch) => ({ id: batch.id, name: batch.name }));

  return (
    <section className="operations-page beneficiaries-page">
      <div className="page-grid two-columns">
        <article className="panel ops-panel beneficiary-form-panel">
          {!countryConfirmed ? (
            <div className="country-gate">
              <div className="panel-title-row">
                <div>
                  <h2>People onboarding</h2>
                  <span className="helper">Start by choosing the country so we only show the banking details that actually matter.</span>
                </div>
                <span className="pill neutral">1 of 2</span>
              </div>

              <div className="country-gate-grid">
                {beneficiaryCountryOptions.map((option) => {
                  const isActive = option.code === form.country;
                  return (
                    <button
                      key={option.code}
                      className={`country-choice ${isActive ? "active" : ""}`}
                      onClick={() => setForm(applyBeneficiaryCountryDefaults(form, option.code))}
                    >
                      <strong>
                        {option.label} <span>{option.currency}</span>
                      </strong>
                      <p>{option.summary}</p>
                    </button>
                  );
                })}
              </div>

              <div className="beneficiary-country-note gate-note">
                <strong>Research basis</strong>
                <span>{selectedCountry.researchNote}</span>
              </div>

              <button className="primary" onClick={() => setCountryConfirmed(true)}>
                Continue with {selectedCountry.label}
              </button>
            </div>
          ) : (
            <>
              <div className="panel-title-row">
                <div>
                  <h2>People</h2>
                  <span className="helper">Form tailored to {selectedCountry.label} to reduce operational rework.</span>
                </div>
                <button className="outline" onClick={() => setCountryConfirmed(false)}>
                  Change country
                </button>
              </div>

              <div className="info-strip beneficiary-country-strip">
                <div>
                  <strong>{selectedCountry.label}</strong>
                  <span>{selectedCountry.summary}</span>
                </div>
                <span className="pill neutral">{selectedCountry.currency}</span>
              </div>

              <BeneficiaryFormFields form={form} setForm={setForm} projectOptions={projectOptions} />

              <button className="primary" onClick={onCreate}>
                Create beneficiary
              </button>
            </>
          )}
        </article>

        <article className="panel ops-panel">
          <div className="panel-title-row">
            <div>
              <h2>Registered beneficiaries</h2>
              <span className="helper">Beneficiaries ready to be used in projects and payment batches.</span>
            </div>
          </div>
          <div className="table-shell">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Project</th>
                  <th>Country</th>
                  <th>Type</th>
                  <th>Currency</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {data?.beneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id}>
                    <td>{beneficiary.name}</td>
                    <td>{beneficiary.projectName || "No project"}</td>
                    <td>{beneficiary.country}</td>
                    <td>{beneficiary.kind}</td>
                    <td>{beneficiary.currency}</td>
                    <td>
                      <span className={beneficiary.validationStatus === "valid" ? "pill success" : "pill danger"}>
                        {beneficiary.validationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
