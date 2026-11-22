import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, extractRows } from "../api.js";
import { ErrorBox } from "./Login.jsx";

const LIMIT = 20;

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initial = {
    manufacturer: params.get("manufacturer") || "",
    model: params.get("model") || "",
    generation: params.get("generation") || "",
  };
  const [filters, setFilters] = useState(initial);
  const [applied, setApplied] = useState(initial);

  // follow the URL when it changes (e.g. clicking a manufacturer tile)
  const urlKey = params.toString();
  useEffect(() => {
    const next = {
      manufacturer: params.get("manufacturer") || "",
      model: params.get("model") || "",
      generation: params.get("generation") || "",
    };
    setFilters(next);
    setApplied(next);
    setPage(1);
  }, [urlKey]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    api("/catalog", { query: { ...applied, page, limit: LIMIT } })
      .then((d) => live && setRows(extractRows(d)))
      .catch((e) => live && setError(e))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [applied, page]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <>
      <h2>Find parts</h2>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          setParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
        }}
      >
        <input placeholder="Manufacturer" value={filters.manufacturer} onChange={set("manufacturer")} />
        <input placeholder="Model" value={filters.model} onChange={set("model")} />
        <input placeholder="Generation" value={filters.generation} onChange={set("generation")} />
        <button>Search</button>
      </form>

      <ErrorBox error={error} />
      {loading && <p className="muted">Loading…</p>}

      <table>
        <thead>
          <tr>
            <th>Part</th><th>OE code</th><th>Price</th><th>Status</th>
            <th>Manufacturer</th><th>Model</th><th>Generation</th><th>Car</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ part: p }) => (
            <tr key={p.id_Part}>
              <td><Link to={`/part/${p.id_Part}`}>{p.name}</Link></td>
              <td>{p.OE_code}</td>
              <td>€{Number(p.price).toFixed(2)}</td>
              <td><span className={`tag ${p.part_status}`}>{p.part_status}</span></td>
              <td>{p.MANUFACTURER}</td>
              <td>{p.MODEL}</td>
              <td>{p.GENERATION}</td>
              <td>{p.CAR}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={8} className="muted">No parts found.</td></tr>
          )}
        </tbody>
      </table>

      <Pager page={page} setPage={setPage} hasNext={rows.length === LIMIT} />
    </>
  );
}

export function Pager({ page, setPage, hasNext }) {
  return (
    <div className="row pager">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
      <span className="muted">Page {page}</span>
      <button disabled={!hasNext} onClick={() => setPage(page + 1)}>Next →</button>
    </div>
  );
}
