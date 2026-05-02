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
        <h2>Personas</h2>
        <div className="form-grid">
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
                Tipo de cuenta
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
        <button className="primary" onClick={onCreate}>
          Crear persona
        </button>
      </article>
      <article className="panel">
        <h2>Personas registradas</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>País</th>
                <th>Tipo</th>
                <th>Moneda</th>
                <th>Validación</th>
              </tr>
            </thead>
            <tbody>
              {data?.beneficiaries.map((beneficiary) => (
                <tr key={beneficiary.id}>
                  <td>{beneficiary.name}</td>
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
    </section>
  );
}
