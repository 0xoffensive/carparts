import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, extractRows } from "../api.js";
import { useAuth } from "../auth.jsx";
import { ErrorBox } from "./Login.jsx";
import { Pager } from "./Search.jsx";

const LIMIT = 20;

// One config per collection. The URL under /browse mirrors the API path,
// e.g. /browse/manufacturers/1/models  ->  GET /api/manufacturers/1/models
const RESOURCES = {
  manufacturers: {
    title: "Manufacturers", id: "id_Manufacturer", label: "name", child: "models",
    writeRoles: ["admin"],
    fields: [{ name: "name", label: "Name", required: true }],
  },
  models: {
    title: "Models", id: "id_Model", label: "model_name", child: "generations",
    writeRoles: ["admin"],
    fields: [{ name: "model_name", label: "Model name", required: true }],
  },
  generations: {
    title: "Generations", id: "id_Generation", label: "generation_name", child: "cars",
    writeRoles: ["admin"],
    columns: ["code", "year_from", "year_to"],
    fields: [
      { name: "generation_name", label: "Name", required: true },
      { name: "code", label: "Code", required: true },
      { name: "year_from", label: "Year from", type: "number", required: true },
      { name: "year_to", label: "Year to", type: "number" },
    ],
  },
  cars: {
    title: "Cars", id: "id_Car", label: "modification_name", child: "parts",
    writeRoles: ["admin"],
    columns: ["car_year", "fuel", "transmission", "power_kw", "displacement_cc"],
    fields: [
      { name: "modification_name", label: "Modification", required: true },
      { name: "car_year", label: "Year", type: "number", required: true },
      { name: "fuel", label: "Fuel", type: "select", options: ["Petrol", "Diesel"], required: true },
      { name: "transmission", label: "Transmission", type: "select", options: ["manual", "automatic"], required: true },
      { name: "power_kw", label: "Power (kW)", type: "number", required: true },
      { name: "displacement_cc", label: "Displacement (cc)", type: "number", required: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  parts: {
    title: "Parts", id: "id_Part", label: "name", child: null,
    writeRoles: ["seller", "admin"],
    ownerField: "id_User", // needs `id_User: p.fk_User` in serializePart (see README note)
    columns: ["OE_code", "price", "part_status"],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "OE_code", label: "OE code", required: true },
      { name: "price", label: "Price", type: "number", step: "0.01", required: true },
      { name: "part_status", label: "Status", type: "select", options: ["available", "sold"] },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
};

const NAMES = Object.keys(RESOURCES);

export default function Browse() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();

  const segs = pathname.replace(/^\/browse\/?/, "").split("/").filter(Boolean);
  const apiPath = "/" + segs.join("/");
  const resName = segs[segs.length - 1];
  const res = RESOURCES[resName];

  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null | "new" | row

  const load = useCallback(() => {
    if (!res) return Promise.resolve();
    setLoading(true);
    setError(null);
    return api(apiPath, { query: { name: appliedName, page, limit: LIMIT } })
      .then((d) => setRows(extractRows(d)))
      .catch((e) => { setRows([]); setError(e); })
      .finally(() => setLoading(false));
  }, [apiPath, appliedName, page, res]);

  // reset local state when navigating to a different collection
  useEffect(() => { setName(""); setAppliedName(""); setPage(1); setEditing(null); }, [apiPath]);
  useEffect(() => { load(); }, [load]);

  if (!res) return <p>Unknown collection. <Link to="/browse/manufacturers">Start over</Link></p>;

  const canWrite = user && res.writeRoles.includes(user.role);
  const isMine = (row) => res.ownerField && user && row[res.ownerField] === user.id;
  // Sellers may only touch their own parts; admins may touch anything.
  // If the API doesn't expose the owner, show the buttons and let the server decide.
  const canModify = (row) =>
    canWrite &&
    (!res.ownerField ||
      user.role === "admin" ||
      row[res.ownerField] === undefined ||
      isMine(row));

  async function toggleSold(row) {
    try {
      await api(`${apiPath}/${row[res.id]}`, {
        method: "PATCH",
        body: { part_status: row.part_status === "sold" ? "available" : "sold" },
      });
      load();
    } catch (e) {
      setError(e);
    }
  }

  async function remove(row) {
    if (!confirm(`Delete "${row[res.label]}"?`)) return;
    try {
      await api(`${apiPath}/${row[res.id]}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e);
    }
  }

  // breadcrumbs: "manufacturers/1/models" -> Manufacturers / #1 / Models
  const crumbs = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (NAMES.includes(s)) {
      crumbs.push({ text: RESOURCES[s].title, to: "/browse/" + segs.slice(0, i + 1).join("/") });
    } else {
      crumbs.push({ text: `#${s}`, to: null });
    }
  }

  return (
    <>
      <nav className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && " / "}
            {c.to && i < crumbs.length - 1 ? <Link to={c.to}>{c.text}</Link> : c.text}
          </span>
        ))}
      </nav>

      <div className="row">
        <h2>{res.title}</h2>
        <span className="spacer" />
        {canWrite && <button onClick={() => setEditing("new")}>+ Add</button>}
      </div>

      <form className="row" onSubmit={(e) => { e.preventDefault(); setPage(1); setAppliedName(name); }}>
        <input placeholder="Filter by name" value={name} onChange={(e) => setName(e.target.value)} />
        <button>Filter</button>
      </form>

      <ErrorBox error={error} />
      {!user && <p className="muted">Log in to add or edit entries.</p>}

      {editing && (
        <EditForm
          res={res}
          apiPath={apiPath}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <table>
        <thead>
          <tr>
            <th>{res.fields[0].label}</th>
            {(res.columns || []).map((c) => <th key={c}>{c}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[res.id]}>
              <td>
                {res.child ? (
                  <Link to={`/browse${apiPath}/${r[res.id]}/${res.child}`}>{r[res.label]}</Link>
                ) : (
                  r[res.label]
                )}
                {isMine(r) && <span className="tag mine">yours</span>}
              </td>
              {(res.columns || []).map((c) => (
                <td key={c}>
                  {c === "part_status" ? (
                    <span className={`tag ${r[c]}`}>{r[c]}</span>
                  ) : c === "price" ? (
                    `€${Number(r[c]).toFixed(2)}`
                  ) : (
                    r[c] ?? "—"
                  )}
                </td>
              ))}
              <td className="actions">
                {canModify(r) && (
                  <>
                    {resName === "parts" && (
                      <button className="ghost" onClick={() => toggleSold(r)}>
                        {r.part_status === "sold" ? "Relist" : "Mark sold"}
                      </button>
                    )}
                    <button className="ghost" onClick={() => setEditing(r)}>Edit</button>
                    <button className="danger" onClick={() => remove(r)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={3 + (res.columns || []).length} className="muted">Nothing here yet.</td></tr>
          )}
        </tbody>
      </table>

      <Pager page={page} setPage={setPage} hasNext={rows.length === LIMIT} />
      {segs.length > 1 && (
        <button className="link" onClick={() => nav(-1)}>← Back</button>
      )}
    </>
  );
}

function EditForm({ res, apiPath, row, onClose, onSaved }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(res.fields.map((f) => [f.name, row?.[f.name] ?? ""])),
  );
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // drop empty optional values; numbers are sent as numbers
    const body = {};
    for (const f of res.fields) {
      const v = values[f.name];
      if (v === "" || v == null) continue;
      body[f.name] = f.type === "number" ? Number(v) : v;
    }
    try {
      if (row) await api(`${apiPath}/${row[res.id]}`, { method: "PATCH", body });
      else await api(apiPath, { method: "POST", body });
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>{row ? "Edit" : "Add"} {res.title.toLowerCase().replace(/s$/, "")}</h3>
      <div className="grid">
        {res.fields.map((f) => (
          <label key={f.name} className={f.type === "textarea" ? "wide" : ""}>
            {f.label}
            {f.type === "select" ? (
              <select
                value={values[f.name]}
                required={f.required}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              >
                <option value="">—</option>
                {f.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                rows={3}
                value={values[f.name]}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            ) : (
              <input
                type={f.type || "text"}
                step={f.step}
                required={f.required}
                value={values[f.name]}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      <ErrorBox error={error} />
      <div className="row">
        <button disabled={busy}>Save</button>
        <button type="button" className="link" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
