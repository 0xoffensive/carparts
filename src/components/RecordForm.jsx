import { useState } from "react";
import { api } from "../api.js";
import { useToast } from "../ui.jsx";
import { ErrorBox } from "../pages/Login.jsx";

const cap = (s) => s[0].toUpperCase() + s.slice(1);

// Create or edit one record. `apiPath` is the collection path for creating
// and the same collection path + /id for editing.
export default function RecordForm({ res, apiPath, row, onClose, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState(() =>
    Object.fromEntries(res.fields.map((f) => [f.name, row?.[f.name] ?? ""])),
  );
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (name) => (e) => setValues({ ...values, [name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {};
    for (const f of res.fields) {
      const v = values[f.name];
      if (v === "" || v == null) continue;
      body[f.name] = f.type === "number" ? Number(v) : v;
    }
    try {
      if (row) await api(`${apiPath}/${row[res.id]}`, { method: "PATCH", body });
      else await api(apiPath, { method: "POST", body });
      toast(row ? "Changes saved" : `${cap(res.singular)} added`);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {res.fields.map((f, i) => (
        <label key={f.name}>
          {f.label}
          {f.type === "select" ? (
            <select value={values[f.name]} required={f.required} onChange={set(f.name)} autoFocus={i === 0}>
              <option value="">Choose…</option>
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : f.type === "textarea" ? (
            <textarea rows={4} value={values[f.name]} onChange={set(f.name)} />
          ) : (
            <input type={f.type || "text"} step={f.step} required={f.required}
              value={values[f.name]} onChange={set(f.name)} autoFocus={i === 0} />
          )}
        </label>
      ))}
      <ErrorBox error={error} />
      <div className="form-actions">
        <button className="btn primary" disabled={busy}>
          {row ? "Save changes" : `Add ${res.singular}`}
        </button>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
