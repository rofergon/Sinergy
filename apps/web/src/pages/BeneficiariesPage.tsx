import type { CreateBeneficiaryDto } from "@latam-payouts/contracts";
import type { BootstrapPayload } from "../lib/api";

type BeneficiariesPageProps = {
  data: BootstrapPayload | null;
  form: CreateBeneficiaryDto;
  setForm: (next: CreateBeneficiaryDto) => void;
  onCreate: () => void;
};

export function BeneficiariesPage({ data, form, setForm, onCreate }: BeneficiariesPageProps) {
  return (
    <section className="page-grid two-columns">
      <article className="panel">
        <h2>Beneficiary management</h2>
        <div className="form-grid">
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Email
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Country
            <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value as "CO" | "MX" })}>
              <option value="CO">Colombia</option>
              <option value="MX">Mexico</option>
            </select>
          </label>
          <label>
            Bank name
            <input value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} />
          </label>
          <label>
            Account holder
            <input value={form.accountHolderName} onChange={(event) => setForm({ ...form, accountHolderName: event.target.value })} />
          </label>
          {form.country === "CO" ? (
            <>
              <label>
                Account number
                <input value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} />
              </label>
              <label>
                Account type
                <input value={form.accountType} onChange={(event) => setForm({ ...form, accountType: event.target.value })} />
              </label>
              <label>
                Document number
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
        <button className="primary" onClick={onCreate}>
          Create beneficiary
        </button>
      </article>
      <article className="panel">
        <h2>Current beneficiaries</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Currency</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>
              {data?.beneficiaries.map((beneficiary) => (
                <tr key={beneficiary.id}>
                  <td>{beneficiary.name}</td>
                  <td>{beneficiary.country}</td>
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
    </section>
  );
}
