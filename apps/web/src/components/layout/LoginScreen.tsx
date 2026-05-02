type LoginForm = {
  email: string;
  password: string;
};

type LoginScreenProps = {
  form: LoginForm;
  loading: boolean;
  message: string;
  onFormChange: (form: LoginForm) => void;
  onLogin: () => void;
};

export function LoginScreen({ form, loading, message, onFormChange, onLogin }: LoginScreenProps) {
  return (
    <div className="login-shell">
      <section className="login-card login-hero">
        <div className="login-copy">
          <div className="brand-lockup">
            <img className="brand-logo" src="/Logoname.png" alt="Sinergy Sol" />
            <p className="eyebrow">Global Payroll Payouts</p>
          </div>
          <div className="hero-copy">
            <h1>LatAm payout operations console</h1>
            <p className="lede">
              Run beneficiary onboarding, batch approvals, USDC funding, payout tracking, and exception handling from one place.
            </p>
          </div>

          <div className="login-form-shell">
            <label>
              Email
              <input value={form.email} onChange={(event) => onFormChange({ ...form, email: event.target.value })} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(event) => onFormChange({ ...form, password: event.target.value })}
              />
            </label>
            <button className="primary" onClick={onLogin} disabled={loading}>
              {loading ? "Signing in..." : "Enter workspace"}
            </button>
            <p className="helper">Demo users: finance, approver, compliance. Password: demo123</p>
            {message ? <p className="message">{message}</p> : null}
          </div>
        </div>

        <aside className="login-visual" aria-hidden="true">
          <div className="banner-frame">
            <img className="hero-banner" src="/banner.png" alt="" />
          </div>
        </aside>
      </section>
    </div>
  );
}
