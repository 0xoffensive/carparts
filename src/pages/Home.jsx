import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, extractRows } from "../api.js";
import { useAuth } from "../auth.jsx";
import { CheckIcon } from "../ui.jsx";
import CarDraw from "../components/CarDraw.jsx";
import { PartRow } from "../components/PartViews.jsx";

export default function Home() {
  const { user } = useAuth();
  const [makers, setMakers] = useState([]);
  const [parts, setParts] = useState([]);

  useEffect(() => {
    api("/manufacturers", { query: { limit: 24 } })
      .then((d) => setMakers(extractRows(d)))
      .catch(() => {});
    api("/catalog", { query: { limit: 30 } })
      .then((d) =>
        setParts(
          extractRows(d).map((r) => r.part).filter((p) => p.part_status === "available").slice(0, 8),
        ),
      )
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>Find the part that fits your car.</h1>
          <p>
            Choose your car once. You only see parts listed for that exact
            make, model, generation and engine.
          </p>
          <p className="hint">
            Know the part already? Press <kbd>/</kbd> to search by name or OE code.
          </p>
        </div>
        <CarPicker />
      </section>

      <section className="band">
        <div className="band-head">
          <h2>Makes in the catalog</h2>
          <Link to="/browse/manufacturers">Browse the full catalog</Link>
        </div>
        <div className="makes">
          {makers.map((m) => (
            <Link key={m.id_Manufacturer} to={`/search?manufacturer=${encodeURIComponent(m.name)}`}>
              {m.name}
            </Link>
          ))}
          {makers.length === 0 && <p className="muted">No manufacturers yet.</p>}
        </div>
      </section>

      <section className="band">
        <div className="band-head">
          <h2>In stock now</h2>
          <Link to="/search">Search all parts</Link>
        </div>
        {parts.length > 0 ? (
          <div className="plist">{parts.map((p) => <PartRow key={p.id_Part} p={p} />)}</div>
        ) : (
          <p className="muted">No parts are listed yet.</p>
        )}
      </section>

      <section className="sell">
        <div>
          <h2>Selling parts?</h2>
          <p>
            List a part against the exact car it fits, change the price any time
            and mark it sold in one click.
          </p>
        </div>
        {user ? (
          <Link className="btn kraft" to="/browse/manufacturers">Open the catalog</Link>
        ) : (
          <Link className="btn kraft" to="/login?mode=register">Create a seller account</Link>
        )}
      </section>
    </>
  );
}

const ROWS = [
  { key: "m", label: "Make" },
  { key: "mo", label: "Model" },
  { key: "g", label: "Generation" },
  { key: "c", label: "Engine" },
];
const ORDER = ROWS.map((r) => r.key);

// manufacturer → model → generation → car; every choice inks part of the drawing
function CarPicker() {
  const nav = useNavigate();
  const [sel, setSel] = useState({ m: "", mo: "", g: "", c: "" });
  const [opts, setOpts] = useState({ m: [], mo: [], g: [], c: [] });

  const load = (key, path) =>
    api(path, { query: { limit: 100 } })
      .then((d) => setOpts((o) => ({ ...o, [key]: extractRows(d) })))
      .catch(() => setOpts((o) => ({ ...o, [key]: [] })));

  useEffect(() => { load("m", "/manufacturers"); }, []);
  useEffect(() => { if (sel.m) load("mo", `/manufacturers/${sel.m}/models`); }, [sel.m]);
  useEffect(() => { if (sel.mo) load("g", `/manufacturers/${sel.m}/models/${sel.mo}/generations`); }, [sel.mo]);
  useEffect(() => {
    if (sel.g) load("c", `/manufacturers/${sel.m}/models/${sel.mo}/generations/${sel.g}/cars`);
  }, [sel.g]);

  const pick = (level) => (e) => {
    const next = { ...sel };
    ORDER.forEach((k, i) => { if (i > ORDER.indexOf(level)) next[k] = ""; });
    next[level] = e.target.value;
    setSel(next);
  };

  const find = (k, idKey, text) => {
    const it = opts[k].find((x) => String(x[idKey]) === String(sel[k]));
    return it ? text(it) : "";
  };
  const labels = {
    make: find("m", "id_Manufacturer", (x) => x.name),
    model: find("mo", "id_Model", (x) => x.model_name),
    gen: find("g", "id_Generation", (x) => x.code || x.generation_name),
    engine: find("c", "id_Car", (x) => x.modification_name),
  };

  const text = {
    m: (x) => x.name,
    mo: (x) => x.model_name,
    g: (g) => `${g.generation_name} (${g.year_from}–${g.year_to ?? "now"})`,
    c: (c) => `${c.modification_name}, ${c.power_kw} kW, ${c.fuel}`,
  };
  const ids = { m: "id_Manufacturer", mo: "id_Model", g: "id_Generation", c: "id_Car" };

  const go = () =>
    nav(`/browse/manufacturers/${sel.m}/models/${sel.mo}/generations/${sel.g}/cars/${sel.c}/parts`);
  const reset = () => setSel({ m: "", mo: "", g: "", c: "" });

  const seeAll = labels.make
    ? `/search?manufacturer=${encodeURIComponent(labels.make)}${labels.model ? `&model=${encodeURIComponent(labels.model)}` : ""}`
    : null;

  return (
    <div className="fit">
      <div className="draw"><CarDraw sel={labels} /></div>
      <div className="block">
        {ROWS.map((r, idx) => {
          const prev = idx === 0 ? true : sel[ORDER[idx - 1]];
          return (
            <label key={r.key} className={`brow ${sel[r.key] ? "done" : ""} ${prev ? "" : "off"}`}>
              <span className="bstep">{idx + 1}</span>
              <span className="blabel">{r.label}</span>
              <select value={sel[r.key]} onChange={pick(r.key)} disabled={!prev} aria-label={r.label}>
                <option value="">Choose {r.label.toLowerCase()}</option>
                {opts[r.key].map((o) => (
                  <option key={o[ids[r.key]]} value={o[ids[r.key]]}>{text[r.key](o)}</option>
                ))}
              </select>
              <span className="bmark">{sel[r.key] && <CheckIcon />}</span>
            </label>
          );
        })}
        <div className="bfoot">
          <button className="btn primary wide" disabled={!sel.c} onClick={go}>
            Show parts for this car
          </button>
          <div className="bfoot-links">
            {seeAll && (
              <Link to={seeAll}>
                See every part for {labels.make}{labels.model ? ` ${labels.model}` : ""}
              </Link>
            )}
            {sel.m && <button className="linkbtn" onClick={reset}>Start over</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
