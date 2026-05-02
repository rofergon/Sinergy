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
            <span className="brand-logo-crop">
              <img className="brand-logo" src="/Logoname.png" alt="Sinergy Sol" />
            </span>
          </div>
          <div className="hero-copy">
            <p className="eyebrow">Global Payroll Payouts</p>
            <h1>Login to console</h1>
            <div className="login-rule" />
            <p className="lede">Access your Sinergy Sol workspace to manage payouts, approvals, and funding workflows.</p>
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

        <aside className="login-visual">
          <div className="demo-visual-shell">
            <div className="request-demo-card" aria-label="Request a demo">
              <div className="demo-spark" aria-hidden="true">
                <span />
              </div>
              <h2>Request a demo</h2>
              <div className="demo-rule" />
              <p>See how Sinergy Sol simplifies payroll payout operations across Latin America.</p>

              <label className="demo-email-field">
                <span className="demo-field-label">Work email</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                <input aria-label="Work email" defaultValue="work@email.com" />
              </label>

              <button className="demo-button" type="button">
                Request demo
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>

              <div className="demo-proof-row" aria-label="Demo highlights">
                <div>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 5 6v5c0 4.2 2.8 7.7 7 9 4.2-1.3 7-4.8 7-9V6z" />
                    <path d="m9 12 2 2 4-5" />
                  </svg>
                  <span>Secure<br />by design</span>
                </div>
                <div>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21" />
                    <path d="M12 3c-2.4 2.5-3.6 5.5-3.6 9S9.6 18.5 12 21" />
                  </svg>
                  <span>Global<br />reach</span>
                </div>
                <div>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13 2 5 14h6l-1 8 9-13h-6z" />
                  </svg>
                  <span>Built<br />for scale</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
