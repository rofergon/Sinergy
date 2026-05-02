import type { CountryCode, CreateBeneficiaryDto } from "@latam-payouts/contracts";

type CountryOption = {
  code: CountryCode;
  label: string;
  currency: string;
  summary: string;
  researchNote: string;
};

type BeneficiaryFormFieldsProps = {
  form: CreateBeneficiaryDto;
  setForm: (next: CreateBeneficiaryDto) => void;
  projectOptions?: Array<{ id: string; name: string }>;
  compact?: boolean;
};

export const beneficiaryCountryOptions: CountryOption[] = [
  {
    code: "CO",
    label: "Colombia",
    currency: "COP",
    summary: "Account number, account type, ID, and the holder's phone number.",
    researchNote: "Local COP payouts commonly require bank name, account number, account type, ID information, and phone number.",
  },
  {
    code: "MX",
    label: "Mexico",
    currency: "MXN",
    summary: "18-digit CLABE and the holder's core banking details.",
    researchNote: "SPEI transfers most commonly use an 18-digit CLABE together with the bank name and account holder.",
  },
  {
    code: "AR",
    label: "Argentina",
    currency: "ARS",
    summary: "CBU, CVU, or alias plus CUIT/CUIL or DNI identification.",
    researchNote: "ARS payouts commonly request a CBU/CVU or alias together with beneficiary identification.",
  },
];

export function getCountryOption(country: CountryCode) {
  return beneficiaryCountryOptions.find((option) => option.code === country) ?? beneficiaryCountryOptions[0];
}

export function applyBeneficiaryCountryDefaults(form: CreateBeneficiaryDto, country: CountryCode): CreateBeneficiaryDto {
  const base: CreateBeneficiaryDto = {
    ...form,
    country,
    bankName: "",
    accountHolderName: "",
    phoneNumber: "",
    accountNumber: "",
    accountType: "",
    bankKey: "",
    bankKeyType: "",
    clabe: "",
    documentType: "",
    documentNumber: "",
  };

  if (country === "CO") {
    return {
      ...base,
      accountType: "savings",
      documentType: "CC",
    };
  }

  if (country === "MX") {
    return {
      ...base,
      bankKeyType: "CLABE",
    };
  }

  return {
    ...base,
    bankKeyType: "CBU",
    documentType: "CUIT",
  };
}

function updateField(form: CreateBeneficiaryDto, setForm: (next: CreateBeneficiaryDto) => void, field: keyof CreateBeneficiaryDto, value: string) {
  const next = { ...form, [field]: value };

  if (field === "bankKey" && form.country === "MX") {
    next.clabe = value;
  }

  setForm(next);
}

export function BeneficiaryFormFields({ form, setForm, projectOptions = [], compact = false }: BeneficiaryFormFieldsProps) {
  const countryOption = getCountryOption(form.country);
  const bankKeyLabel = form.country === "MX" ? "CLABE" : form.country === "AR" ? "Bank key" : "Bank detail";
  const bankKeyPlaceholder =
    form.country === "MX"
      ? "18 digits"
      : form.country === "AR"
        ? form.bankKeyType === "ALIAS"
          ? "Ex. my.alias.payments"
          : "22 digits"
        : "";

  return (
    <div className={`form-grid beneficiary-form-grid ${compact ? "compact-person-form" : ""}`}>
      <label>
        Name
        <input value={form.name} onChange={(event) => updateField(form, setForm, "name", event.target.value)} />
      </label>
      <label>
        Email
        <input value={form.email} onChange={(event) => updateField(form, setForm, "email", event.target.value)} />
      </label>
      <label>
        Project
        <select
          value={form.projectId ?? ""}
          onChange={(event) => {
            const selectedProject = projectOptions.find((option) => option.id === event.target.value);
            setForm({
              ...form,
              projectId: event.target.value,
              projectName: selectedProject?.name ?? "",
            });
          }}
        >
          <option value="">No project assigned</option>
          {projectOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Type
        <select value={form.kind} onChange={(event) => updateField(form, setForm, "kind", event.target.value)}>
          <option value="employee">Employee</option>
          <option value="contractor">Contractor</option>
        </select>
      </label>
      <label>
        Bank
        <input value={form.bankName} onChange={(event) => updateField(form, setForm, "bankName", event.target.value)} />
      </label>
      <label>
        Account holder
        <input value={form.accountHolderName} onChange={(event) => updateField(form, setForm, "accountHolderName", event.target.value)} />
      </label>

      {form.country === "CO" ? (
        <>
          <label>
            Phone number
            <input value={form.phoneNumber ?? ""} onChange={(event) => updateField(form, setForm, "phoneNumber", event.target.value)} />
          </label>
          <label>
            ID type
            <select value={form.documentType ?? "CC"} onChange={(event) => updateField(form, setForm, "documentType", event.target.value)}>
              <option value="CC">National ID</option>
              <option value="CE">Foreign ID</option>
              <option value="NIT">NIT</option>
              <option value="PP">Passport</option>
            </select>
          </label>
          <label>
            ID number
            <input value={form.documentNumber ?? ""} onChange={(event) => updateField(form, setForm, "documentNumber", event.target.value)} />
          </label>
          <label>
            Account type
            <select value={form.accountType ?? "savings"} onChange={(event) => updateField(form, setForm, "accountType", event.target.value)}>
              <option value="savings">Savings</option>
              <option value="checking">Checking</option>
            </select>
          </label>
          <label>
            Account number
            <input value={form.accountNumber ?? ""} onChange={(event) => updateField(form, setForm, "accountNumber", event.target.value)} />
          </label>
        </>
      ) : null}

      {form.country === "MX" ? (
        <label>
          {bankKeyLabel}
          <input
            placeholder={bankKeyPlaceholder}
            value={form.bankKey ?? form.clabe ?? ""}
            onChange={(event) => updateField(form, setForm, "bankKey", event.target.value)}
          />
        </label>
      ) : null}

      {form.country === "AR" ? (
        <>
          <label>
            Key type
            <select value={form.bankKeyType ?? "CBU"} onChange={(event) => updateField(form, setForm, "bankKeyType", event.target.value)}>
              <option value="CBU">CBU</option>
              <option value="CVU">CVU</option>
              <option value="ALIAS">Alias</option>
            </select>
          </label>
          <label>
            {bankKeyLabel}
            <input
              placeholder={bankKeyPlaceholder}
              value={form.bankKey ?? ""}
              onChange={(event) => updateField(form, setForm, "bankKey", event.target.value)}
            />
          </label>
          <label>
            ID type
            <select value={form.documentType ?? "CUIT"} onChange={(event) => updateField(form, setForm, "documentType", event.target.value)}>
              <option value="CUIT">CUIT</option>
              <option value="CUIL">CUIL</option>
              <option value="DNI">DNI</option>
            </select>
          </label>
          <label>
            ID number
            <input value={form.documentNumber ?? ""} onChange={(event) => updateField(form, setForm, "documentNumber", event.target.value)} />
          </label>
        </>
      ) : null}

      {!compact ? (
        <div className="beneficiary-country-note">
          <strong>{countryOption.label}</strong>
          <span>
            {countryOption.summary} {countryOption.researchNote}
          </span>
        </div>
      ) : null}
    </div>
  );
}
