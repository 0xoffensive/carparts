import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, extractRows } from "../api.js";
import { Empty, GridIcon, ListIcon, eur } from "../ui.jsx";
import { ErrorBox } from "./Login.jsx";
import { PartRow, PartTile, RowSkeletons, fitsOf } from "../components/PartViews.jsx";

const LIMIT = 40;
const KEYS = ["manufacturer", "model", "generation"];
const KEY_LABEL = { manufacturer: "Make", model: "Model", generation: "Generation" };

export default function Search() {
  const [params, setParams] = useSearchParams();
  const chain = Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ""]));
  const chainKey = KEYS.map((k) => chain[k]).join("|");

  const [draft, setDraft] = useState(chain);
  const [pg, setPg] = useState({ key: "", n: 1 });
  const page = pg.key === chainKey ? pg.n : 1;
  const setPage = (n) => setPg({ key: chainKey, n });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [wide] = useState(() => window.matchMedia("(min-width: 961px)").matches);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("default");
  const [cap, setCap] = useState(null);
  const [view, setView] = useState(() => {
    try { return localStorage.getItem("carparts.view") || "list"; } catch { return "list"; }
  });
  const changeView = (v) => {
    setView(v);
    try { localStorage.setItem("carparts.view", v); } catch { /* ignore */ }
  };

  // URL -> inputs (when a link or a chip changes the URL)
  useEffect(() => {
    setDraft((d) => (KEYS.every((k) => d[k].trim() === chain[k]) ? d : chain));
  }, [chainKey]);

  // inputs -> URL, after the visitor stops typing
  useEffect(() => {
    const t = setTimeout(() => {
      const next = Object.fromEntries(
        KEYS.map((k) => [k, draft[k].trim()]).filter(([, v]) => v),
      );
      if (KEYS.some((k) => (next[k] || "") !== chain[k])) setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [draft]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    api("/catalog", { query: { ...chain, page, limit: LIMIT } })
      .then((d) => live && setRows(extractRows(d).map((r) => r.part)))
      .catch((e) => { if (live) { setRows([]); setError(e); } })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [chainKey, page]);

  const maxPrice = useMemo(
    () => Math.ceil(Math.max(0, ...rows.map((r) => Number(r.price) || 0))),
    [rows],
  );
  const limitPrice = cap == null ? maxPrice : Math.min(cap, maxPrice);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = rows.filter(
      (p) =>
        (!s || `${p.name} ${p.OE_code} ${fitsOf(p)}`.toLowerCase().includes(s)) &&
        (status === "all" || p.part_status === status) &&
        Number(p.price) <= limitPrice,
    );
    const by = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return by ? [...list].sort(by) : list;
  }, [rows, q, status, limitPrice, sort]);

  const clearAll = () => {
    setParams({}, { replace: true });
    setDraft({ manufacturer: "", model: "", generation: "" });
    setQ(""); setStatus("all"); setCap(null); setSort("default");
  };
  const clearKey = (k) => {
    const next = { ...chain };
    delete next[k];
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });
  };
  const active = KEYS.filter((k) => chain[k]);
  const filtered = active.length > 0 || q || status !== "all" || cap != null;
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  return (
    <>
      <h1 className="page-title">Search parts</h1>
      <div className="search">
        <details className="rail" open={wide}>
          <summary>{filtered ? "Filters (active)" : "Filters"}</summary>
          <div className="rail-body">
          <label>Make<input value={draft.manufacturer} onChange={set("manufacturer")} placeholder="For example Audi" /></label>
          <label>Model<input value={draft.model} onChange={set("model")} placeholder="For example A4" /></label>
          <label>Generation<input value={draft.generation} onChange={set("generation")} placeholder="For example B8" /></label>
          <label>Part name or OE code<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filters the results below" /></label>

          <div className="field">
            <span className="field-label">Status</span>
            <div className="seg" role="group" aria-label="Status">
              {["all", "available", "sold"].map((s) => (
                <button key={s} className={status === s ? "on" : ""} aria-pressed={status === s} onClick={() => setStatus(s)}>
                  {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {maxPrice > 0 && (
            <label>
              Up to €{limitPrice}
              <input type="range" min="0" max={maxPrice} step="1" value={limitPrice}
                onChange={(e) => setCap(Number(e.target.value))} />
            </label>
          )}
          {filtered && <button className="linkbtn" onClick={clearAll}>Clear all filters</button>}
          </div>
        </details>

        <section className="results">
          <div className="results-bar">
            <strong>{loading ? "Searching…" : `${shown.length} ${shown.length === 1 ? "part" : "parts"}`}</strong>
            <div className="chips">
              {active.map((k) => (
                <button key={k} className="chip" onClick={() => clearKey(k)} aria-label={`Remove ${KEY_LABEL[k]} filter`}>
                  {KEY_LABEL[k]}: {chain[k]} ×
                </button>
              ))}
            </div>
            <span className="spacer" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort parts" className="compact">
              <option value="default">Catalog order</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
              <option value="name">Name, A to Z</option>
            </select>
            <div className="seg icons" role="group" aria-label="Layout">
              <button className={view === "list" ? "on" : ""} aria-pressed={view === "list"} aria-label="List" onClick={() => changeView("list")}><ListIcon /></button>
              <button className={view === "grid" ? "on" : ""} aria-pressed={view === "grid"} aria-label="Grid" onClick={() => changeView("grid")}><GridIcon /></button>
            </div>
          </div>

          <ErrorBox error={error} />
          {loading ? (
            <RowSkeletons />
          ) : shown.length === 0 ? (
            <Empty title="No parts match these filters">
              <p>Remove a filter or check the spelling of the make.</p>
              {filtered && <button className="btn" onClick={clearAll}>Clear all filters</button>}
            </Empty>
          ) : view === "grid" ? (
            <div className="tiles">{shown.map((p) => <PartTile key={p.id_Part} p={p} />)}</div>
          ) : (
            <div className="plist">{shown.map((p) => <PartRow key={p.id_Part} p={p} />)}</div>
          )}

          <div className="pager">
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="muted">Page {page}</span>
            <button className="btn" disabled={rows.length < LIMIT} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </section>
      </div>
    </>
  );
}
