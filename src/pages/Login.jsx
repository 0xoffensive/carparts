import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useToast } from "../ui.jsx";

export default function Login() {
  const { login, register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
      toast(mode === "login" ? "Logged in" : "Account created. You're logged in.");
      nav("/");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="seg wide" role="tablist" aria-label="Account">
        <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""}
          onClick={() => { setMode("login"); setError(null); }}>Log in</button>
        <button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "on" : ""}
          onClick={() => { setMode("register"); setError(null); }}>Create account</button>
      </div>
      <form className="form" onSubmit={submit}>
        {mode === "register" && (
          <label>Name<input value={form.name} onChange={set("name")} required autoComplete="name" /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set("email")} required autoComplete="email" /></label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set("password")} required maxLength={72}
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "register" && <span className="muted">At least 8 characters.</span>}
        </label>
        {mode === "register" && (
          <label>Phone (optional)<input value={form.phone} onChange={set("phone")} autoComplete="tel" /></label>
        )}
        <ErrorBox error={error} />
        <button className="btn primary wide" disabled={busy}>{mode === "login" ? "Log in" : "Create account"}</button>
      </form>
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="error" role="alert">
      {error.message}
      {error.details?.length > 0 && (
        <ul>
          {error.details.map((d, i) => (
            <li key={i}>{d.field}: {d.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
