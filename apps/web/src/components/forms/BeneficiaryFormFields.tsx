import type { CountryCode, CreateBeneficiaryDto } from "@latam-payouts/contracts";

type CountryOption = {
  code: CountryCode;
  label: string;
  currency: string;
  flag: string;
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
    flag: "/flags/co.svg",
    summary: "Account number, account type, ID, and the holder's phone number.",
    researchNote: "Local COP payouts commonly require bank name, account number, account type, ID information, and phone number.",
  },
  {
    code: "MX",
    label: "Mexico",
    currency: "MXN",
    flag: "/flags/mx.svg",
    summary: "18-digit CLABE and the holder's core banking details.",
    researchNote: "SPEI transfers most commonly use an 18-digit CLABE together with the bank name and account holder.",
  },
  {
    code: "AR",
    label: "Argentina",
    currency: "ARS",
    flag: "/flags/ar.svg",
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

function getBankKeyLabel(form: CreateBeneficiaryDto) {
  return form.country === "MX" ? "CLABE" : form.country === "AR" ? "Bank key" : "Bank detail";
}

function getBankKeyPlaceholder(form: CreateBeneficiaryDto) {
  return form.country === "MX"
    ? "18 digits"
    : form.country === "AR"
      ? form.bankKeyType === "ALIAS"
        ? "Ex. my.alias.payments"
        : "22 digits"
      : "";
}

export function getBeneficiaryChecklist(form: CreateBeneficiaryDto) {
  const items = [
    { label: "Full name", done: Boolean(form.name.trim()) },
    { label: "Work email", done: Boolean(form.email.trim()) },
    { label: "Worker type", done: Boolean(form.kind) },
    { label: "Bank name", done: Boolean(form.bankName.trim()) },
    { label: "Account holder", done: Boolean(form.accountHolderName.trim()) },
  ];

  if (form.country === "CO") {
    items.push(
      { label: "Phone number", done: Boolean(form.phoneNumber?.trim()) },
      { label: "ID details", done: Boolean(form.documentType?.trim()) && Boolean(form.documentNumber?.trim()) },
      { label: "Account setup", done: Boolean(form.accountType?.trim()) && Boolean(form.accountNumber?.trim()) },
    );
  }

  if (form.country === "MX") {
    items.push({ label: "CLABE", done: Boolean((form.bankKey ?? form.clabe ?? "").trim()) });
  }

  if (form.country === "AR") {
    items.push(
      { label: "Key type", done: Boolean(form.bankKeyType?.trim()) },
      { label: "CBU/CVU/Alias", done: Boolean(form.bankKey?.trim()) },
      { label: "ID details", done: Boolean(form.documentType?.trim()) && Boolean(form.documentNumber?.trim()) },
    );
  }

  return items;
}

export function BeneficiaryIdentityFields({ form, setForm, projectOptions = [], compact = false }: BeneficiaryFormFieldsProps) {
  return (
    <div className={`form-grid beneficiary-form-grid ${compact ? "compact-person-form" : ""}`}>
      <label>
        Full name
        <input value={form.name} placeholder="Ex. Camila Torres" onChange={(event) => updateField(form, setForm, "name", event.target.value)} />
      </label>
      <label>
        Work email
        <input value={form.email} placeholder="name@company.com" onChange={(event) => updateField(form, setForm, "email", event.target.value)} />
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
          <option value="">No project assigned yet</option>
          {projectOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Worker type
        <select value={form.kind} onChange={(event) => updateField(form, setForm, "kind", event.target.value)}>
          <option value="employee">Employee</option>
          <option value="contractor">Contractor</option>
        </select>
      </label>
      <label>
        Bank name
        <input value={form.bankName} placeholder="Receiving bank" onChange={(event) => updateField(form, setForm, "bankName", event.target.value)} />
      </label>
      <label>
        Account holder
        <input
          value={form.accountHolderName}
          placeholder="Legal account holder name"
          onChange={(event) => updateField(form, setForm, "accountHolderName", event.target.value)}
        />
      </label>
    </div>
  );
}

export function BeneficiaryBankingFields({ form, setForm, compact = false }: Omit<BeneficiaryFormFieldsProps, "projectOptions">) {
  const bankKeyLabel = getBankKeyLabel(form);
  const bankKeyPlaceholder = getBankKeyPlaceholder(form);

  return (
    <div className={`form-grid beneficiary-form-grid ${compact ? "compact-person-form" : ""}`}>
      {form.country === "CO" ? (
        <>
          <label>
            Phone number
            <input placeholder="+57 300 123 4567" value={form.phoneNumber ?? ""} onChange={(event) => updateField(form, setForm, "phoneNumber", event.target.value)} />
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
            <input placeholder="Document number" value={form.documentNumber ?? ""} onChange={(event) => updateField(form, setForm, "documentNumber", event.target.value)} />
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
            <input placeholder="Bank account number" value={form.accountNumber ?? ""} onChange={(event) => updateField(form, setForm, "accountNumber", event.target.value)} />
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
            <input placeholder="Tax or national ID number" value={form.documentNumber ?? ""} onChange={(event) => updateField(form, setForm, "documentNumber", event.target.value)} />
          </label>
        </>
      ) : null}
    </div>
  );
}

export function BeneficiaryFormFields({ form, setForm, projectOptions = [], compact = false }: BeneficiaryFormFieldsProps) {
  const countryOption = getCountryOption(form.country);

  return (
    <div className="stack">
      <BeneficiaryIdentityFields form={form} setForm={setForm} projectOptions={projectOptions} compact={compact} />
      <BeneficiaryBankingFields form={form} setForm={setForm} compact={compact} />
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
