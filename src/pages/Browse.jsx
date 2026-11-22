import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, extractRows } from "../api.js";
import { useAuth } from "../auth.jsx";
import { COLS, NAMES, RESOURCES } from "../resources.js";
import { CodeChip, Empty, Modal, Skeleton, StatusTag, eur, useToast } from "../ui.jsx";
import RecordForm from "../components/RecordForm.jsx";
import { ErrorBox } from "./Login.jsx";

const LIMIT = 20;

export default function Browse() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const segs = pathname.replace(/^\/browse\/?/, "").split("/").filter(Boolean);
  const apiPath = "/" + segs.join("/");
  const resName = segs[segs.length - 1];
  const res = RESOURCES[resName];

  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | row
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    if (!res) return Promise.resolve();
    setLoading(true);
    setError(null);
    return api(apiPath, { query: { name: appliedName, page, limit: LIMIT } })
      .then((d) => setRows(extractRows(d)))
      .catch((e) => { setRows([]); setError(e); })
      .finally(() => setLoading(false));
  }, [apiPath, appliedName, page, res]);

  useEffect(() => { setName(""); setAppliedName(""); setPage(1); setEditing(null); setDeleting(null); }, [apiPath]);
  useEffect(() => { load(); }, [load]);

  // filter while typing
  useEffect(() => {
    const t = setTimeout(() => { if (name.trim() !== appliedName) { setPage(1); setAppliedName(name.trim()); } }, 300);
    return () => clearTimeout(t);
  }, [name]);

  if (!res) return <Empty title="That collection doesn't exist"><Link className="btn" to="/browse/manufacturers">Back to manufacturers</Link></Empty>;

  const canWrite = user && res.writeRoles.includes(user.role);
  const isMine = (row) => res.ownerField && user && row[res.ownerField] === user.id;
  // Sellers may only touch their own parts. If the API doesn't expose the
  // owner, show the buttons and let the server decide.
  const canModify = (row) =>
    canWrite &&
    (!res.ownerField || user.role === "admin" || row[res.ownerField] === undefined || isMine(row));

  async function toggleSold(row) {
    const next = row.part_status === "sold" ? "available" : "sold";
    try {
      await api(`${apiPath}/${row[res.id]}`, { method: "PATCH", body: { part_status: next } });
      toast(next === "sold" ? "Marked as sold" : "Listed again");
      load();
    } catch (e) { setError(e); }
  }

  async function confirmDelete() {
    const row = deleting;
    setDeleting(null);
    try {
      await api(`${apiPath}/${row[res.id]}`, { method: "DELETE" });
      toast(`Deleted ${res.singular}`);
      load();
    } catch (e) {
      toast(
        e.status === 409
          ? `This ${res.singular} still has items under it. Delete those first.`
          : e.message,
        "err",
      );
    }
  }

  const crumbs = segs.map((s, i) =>
    NAMES.includes(s)
      ? { text: RESOURCES[s].title, to: "/browse/" + segs.slice(0, i + 1).join("/") }
      : { text: `#${s}`, to: null },
  );

  const cell = (r, c) => {
    if (c === "part_status") return <StatusTag status={r[c]} />;
    if (c === "price") return eur(r[c]);
    if (c === "OE_code") return <CodeChip code={r[c]} />;
    if (c === "year_to") return r[c] ?? "present";
    return r[c] ?? "–";
  };

  return (
    <>
      <nav className="crumbs" aria-label="Where you are">
        {crumbs.map((c, i) => (
          <span key={i}>
            {c.to && i < crumbs.length - 1 ? <Link to={c.to}>{c.text}</Link> : <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.text}</span>}
          </span>
        ))}
      </nav>

      <div className="titlebar">
        <h1 className="page-title">{res.title}</h1>
        <input className="filter" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={`Filter ${res.title.toLowerCase()} by name`} aria-label="Filter by name" />
        {canWrite && <button className="btn primary" onClick={() => setEditing("new")}>Add {res.singular}</button>}
      </div>

      <ErrorBox error={error} />
      {!user && <p className="muted note">Log in to add or edit entries.</p>}

      <div className="ledger-wrap">
        <table className="ledger">
          <thead>
            <tr>
              <th>{res.fields[0].label}</th>
              {(res.columns || []).map((c) => <th key={c}>{COLS[c] || c}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td><Skeleton h={18} w="50%" /></td>
                {(res.columns || []).map((c) => <td key={c}><Skeleton h={18} w={64} /></td>)}
                <td />
              </tr>
            ))}
            {!loading && rows.map((r) => (
              <tr key={r[res.id]}>
                <td>
                  {res.child ? (
                    <Link className="rowlink" to={`/browse${apiPath}/${r[res.id]}/${res.child}`}>{r[res.label]}</Link>
                  ) : (
                    <Link className="rowlink" to={`/part/${r[res.id]}`}>{r[res.label]}</Link>
                  )}
                  {isMine(r) && <span className="mine">yours</span>}
                </td>
                {(res.columns || []).map((c) => <td key={c}>{cell(r, c)}</td>)}
                <td className="actions">
                  {canModify(r) && (
                    <>
                      {resName === "parts" && (
                        <button className="btn small" onClick={() => toggleSold(r)}>
                          {r.part_status === "sold" ? "List again" : "Mark sold"}
                        </button>
                      )}
                      <button className="btn small" onClick={() => setEditing(r)}>Edit</button>
                      <button className="btn small danger" onClick={() => setDeleting(r)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && !error && (
          <Empty title={appliedName ? `No ${res.title.toLowerCase()} match “${appliedName}”` : `No ${res.title.toLowerCase()} yet`}>
            {canWrite ? <button className="btn primary" onClick={() => setEditing("new")}>Add {res.singular}</button>
              : <p>Nothing has been added here.</p>}
          </Empty>
        )}
      </div>

      <div className="pager">
        <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="muted">Page {page}</span>
        <button className="btn" disabled={rows.length < LIMIT} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      <Modal open={!!editing} side onClose={() => setEditing(null)}
        title={editing === "new" ? `Add ${res.singular}` : `Edit ${res.singular}`}>
        {editing && (
          <RecordForm res={res} apiPath={apiPath} row={editing === "new" ? null : editing}
            onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        )}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${res.singular}?`}>
        <div className="form">
          <p>“{deleting?.[res.label]}” will be removed. This can't be undone.</p>
          <div className="form-actions">
            <button className="btn danger solid" onClick={confirmDelete}>Delete {res.singular}</button>
            <button className="btn" onClick={() => setDeleting(null)}>Keep it</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
