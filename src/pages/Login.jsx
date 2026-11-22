import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
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
      nav("/");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h2>{mode === "login" ? "Log in" : "Create account"}</h2>
      {mode === "register" && (
        <label>Name<input value={form.name} onChange={set("name")} required /></label>
      )}
      <label>Email<input type="email" value={form.email} onChange={set("email")} required /></label>
      <label>
        Password
        <input type="password" value={form.password} onChange={set("password")} required maxLength={72} />
      </label>
      {mode === "register" && (
        <label>Phone (optional)<input value={form.phone} onChange={set("phone")} /></label>
      )}
      <ErrorBox error={error} />
      <button disabled={busy}>{mode === "login" ? "Log in" : "Register"}</button>
      <p className="muted">
        {mode === "login" ? "No account? " : "Already registered? "}
        <a href="#" onClick={(e) => { e.preventDefault(); setError(null); setMode(mode === "login" ? "register" : "login"); }}>
          {mode === "login" ? "Register" : "Log in"}
        </a>
      </p>
    </form>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="error">
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
