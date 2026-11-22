import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, extractRows } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function Home() {
  const { user } = useAuth();
  const [makers, setMakers] = useState([]);
  const [parts, setParts] = useState([]);

  useEffect(() => {
    api("/manufacturers", { query: { limit: 12 } })
      .then((d) => setMakers(extractRows(d)))
      .catch(() => {});
    api("/catalog", { query: { limit: 24 } })
      .then((d) =>
        setParts(
          extractRows(d)
            .map((r) => r.part)
            .filter((p) => p.part_status === "available")
            .slice(0, 6),
        ),
      )
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Used &amp; new car parts</span>
          <h1>Find the right part for <em>your</em> car.</h1>
          <p>
            Pick your exact car — manufacturer, model, generation and engine —
            and see only the parts that fit.
          </p>
        </div>
        <CarPicker />
      </section>

      <section>
        <div className="section-head">
          <h2>Browse by manufacturer</h2>
          <Link to="/browse/manufacturers">See all →</Link>
        </div>
        <div className="tiles">
          {makers.map((m) => (
            <Link key={m.id_Manufacturer} className="tile" to={`/search?manufacturer=${encodeURIComponent(m.name)}`}>
              <span className="avatar">{m.name.slice(0, 1).toUpperCase()}</span>
              {m.name}
            </Link>
          ))}
          {makers.length === 0 && <p className="muted">No manufacturers yet.</p>}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Available now</h2>
          <Link to="/search">Search all parts →</Link>
        </div>
        <div className="cards">
          {parts.map((p) => <PartCard key={p.id_Part} p={p} />)}
          {parts.length === 0 && <p className="muted">No parts listed yet.</p>}
        </div>
      </section>

      <section className="cta">
        <div>
          <h2>Got parts to sell?</h2>
          <p>
            Sellers can list parts against an exact car, edit their listings
            and mark them sold in one click.
          </p>
        </div>
        {user ? (
          <Link className="btn" to="/browse/manufacturers">Open the catalog</Link>
        ) : (
          <Link className="btn" to="/login">Create a free account</Link>
        )}
      </section>
    </>
  );
}

export function PartCard({ p }) {
  return (
    <Link to={`/part/${p.id_Part}`} className="part-card">
      <div className="part-top">
        <span className={`tag ${p.part_status}`}>{p.part_status}</span>
        <span className="price">€{Number(p.price).toFixed(2)}</span>
      </div>
      <h3>{p.name}</h3>
      <div className="muted">OE {p.OE_code}</div>
      {p.MANUFACTURER && (
        <div className="fits">
          Fits {p.MANUFACTURER} {p.MODEL} · {p.GENERATION}
        </div>
      )}
    </Link>
  );
}

// manufacturer → model → generation → car, then jump to that car's parts
function CarPicker() {
  const nav = useNavigate();
  const [sel, setSel] = useState({ m: "", mo: "", g: "", c: "" });
  const [opts, setOpts] = useState({ m: [], mo: [], g: [], c: [] });

  const load = (key, path) =>
    api(path, { query: { limit: 100 } })
      .then((d) => setOpts((o) => ({ ...o, [key]: extractRows(d) })))
      .catch(() => setOpts((o) => ({ ...o, [key]: [] })));

  useEffect(() => { load("m", "/manufacturers"); }, []);
  useEffect(() => {
    if (sel.m) load("mo", `/manufacturers/${sel.m}/models`);
  }, [sel.m]);
  useEffect(() => {
    if (sel.mo) load("g", `/manufacturers/${sel.m}/models/${sel.mo}/generations`);
  }, [sel.mo]);
  useEffect(() => {
    if (sel.g)
      load("c", `/manufacturers/${sel.m}/models/${sel.mo}/generations/${sel.g}/cars`);
  }, [sel.g]);

  // choosing a level clears everything below it
  const pick = (level) => (e) => {
    const order = ["m", "mo", "g", "c"];
    const next = { ...sel };
    order.forEach((k, i) => { if (i > order.indexOf(level)) next[k] = ""; });
    next[level] = e.target.value;
    setSel(next);
  };

  const go = () =>
    nav(
      `/browse/manufacturers/${sel.m}/models/${sel.mo}/generations/${sel.g}/cars/${sel.c}/parts`,
    );

  return (
    <div className="picker">
      <h3>Select your car</h3>
      <Select label="Manufacturer" value={sel.m} onChange={pick("m")} items={opts.m} id="id_Manufacturer" text="name" />
      <Select label="Model" value={sel.mo} onChange={pick("mo")} items={opts.mo} id="id_Model" text="model_name" disabled={!sel.m} />
      <Select label="Generation" value={sel.g} onChange={pick("g")} items={opts.g}
        id="id_Generation" text={(g) => `${g.generation_name} (${g.year_from}–${g.year_to ?? "now"})`} disabled={!sel.mo} />
      <Select label="Engine / version" value={sel.c} onChange={pick("c")} items={opts.c}
        id="id_Car" text={(c) => `${c.modification_name} · ${c.power_kw} kW · ${c.fuel}`} disabled={!sel.g} />
      <button disabled={!sel.c} onClick={go}>Show parts for this car</button>
    </div>
  );
}

function Select({ label, value, onChange, items, id, text, disabled }) {
  return (
    <label>
      {label}
      <select value={value} onChange={onChange} disabled={disabled}>
        <option value="">Select…</option>
        {items.map((i) => (
          <option key={i[id]} value={i[id]}>
            {typeof text === "function" ? text(i) : i[text]}
          </option>
        ))}
      </select>
    </label>
  );
}
