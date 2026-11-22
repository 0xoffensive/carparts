import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { RESOURCES } from "../resources.js";
import { CodeChip, HeartButton, Modal, Skeleton, StatusTag, eur, useSaved, useToast } from "../ui.jsx";
import RecordForm from "../components/RecordForm.jsx";
import { ErrorBox } from "./Login.jsx";

// _links hrefs are absolute; turn them back into an /api-relative path
const relPath = (href) => new URL(href, window.location.origin).pathname.replace(/^\/api/, "");

// Decorative stock-tag barcode drawn from the OE code. Not scannable.
function Barcode({ value }) {
  const bars = [];
  let x = 0;
  for (const ch of String(value).toUpperCase()) {
    const c = ch.charCodeAt(0);
    for (let b = 0; b < 6; b++) {
      const w = (c >> b) & 1 ? 3 : 1.5;
      if (b % 2 === 0) bars.push(<rect key={bars.length} x={x} y="0" width={w} height="70" />);
      x += w + 1.5;
    }
    x += 3;
  }
  return (
    <svg className="barcode" viewBox={`0 0 ${x} 70`} preserveAspectRatio="none" aria-hidden="true">{bars}</svg>
  );
}

export default function PartPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const { view } = useSaved();
  const [part, setPart] = useState(null);
  const [car, setCar] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api(`/parts/${id}`);
      setPart(p);
      setError(null);
      const href = p._links?.parent?.flat?.href;
      if (href) {
        try { setCar(await api(relPath(href))); } catch { /* car info is optional */ }
      }
    } catch (e) { setError(e); }
  }, [id]);

  useEffect(() => { setPart(null); setCar(null); setError(null); load(); }, [load]);
  useEffect(() => {
    if (part) view({ ...part, fits: car?.modification_name || "" });
  }, [part?.id_Part, car?.id_Car]);

  if (error && !part)
    return (
      <div className="empty">
        <h3>{error.status === 404 ? "This part is no longer listed" : "We couldn't load this part"}</h3>
        <p>{error.message}</p>
        <Link className="btn" to="/search">Back to search</Link>
      </div>
    );
  if (!part)
    return (
      <div className="partpage" aria-busy="true">
        <Skeleton h={280} />
        <div><Skeleton h={44} w="70%" /><p /><Skeleton h={22} w="40%" /></div>
      </div>
    );

  const canModify =
    user && (user.role === "admin" || (user.role === "seller" && (part.id_User === undefined || part.id_User === user.id)));

  async function toggleSold() {
    const next = part.part_status === "sold" ? "available" : "sold";
    try {
      await api(`/parts/${id}`, { method: "PATCH", body: { part_status: next } });
      toast(next === "sold" ? "Marked as sold" : "Listed again");
      load();
    } catch (e) { setError(e); }
  }
  async function remove() {
    setConfirming(false);
    try {
      await api(`/parts/${id}`, { method: "DELETE" });
      toast("Deleted part");
      nav("/search");
    } catch (e) { setError(e); }
  }

  return (
    <>
      <nav className="crumbs" aria-label="Where you are">
        <span><Link to="/search">Search parts</Link></span>
        <span aria-current="page">{part.name}</span>
      </nav>

      <div className="partpage">
        <div className="plate">
          <Barcode value={part.OE_code} />
          <div className="plate-code">{part.OE_code}</div>
          <div className="plate-note">OE code. Use it to match this part to your car.</div>
        </div>

        <div className="pinfo">
          <div className="pinfo-top">
            <StatusTag status={part.part_status} />
            {part.added_at && <span className="muted">Listed {new Date(part.added_at).toLocaleDateString("en-GB")}</span>}
          </div>
          <h1>{part.name}</h1>
          <div className="pricetag">{eur(part.price)}</div>
          <p className="desc">{part.description || <span className="muted">The seller didn't add a description.</span>}</p>

          {car && (
            <div className="fitbox">
              <strong>Fits</strong>
              <div>{car.modification_name}</div>
              <div className="muted">
                {car.car_year}, {car.fuel}, {car.transmission}, {car.power_kw} kW, {car.displacement_cc} cc
              </div>
            </div>
          )}

          <div className="row">
            <CodeChip code={part.OE_code} />
            <HeartButton part={{ ...part, fits: car?.modification_name || "" }} />
          </div>

          {canModify && (
            <div className="row owner">
              <button className="btn" onClick={() => setEditing(true)}>Edit listing</button>
              <button className="btn" onClick={toggleSold}>{part.part_status === "sold" ? "List again" : "Mark sold"}</button>
              <button className="btn danger" onClick={() => setConfirming(true)}>Delete</button>
            </div>
          )}
          <ErrorBox error={error} />
        </div>
      </div>

      <Modal open={editing} side onClose={() => setEditing(false)} title="Edit listing">
        <RecordForm res={RESOURCES.parts} apiPath="/parts" row={part}
          onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />
      </Modal>
      <Modal open={confirming} onClose={() => setConfirming(false)} title="Delete this part?">
        <div className="form">
          <p>“{part.name}” will be removed. This can't be undone.</p>
          <div className="form-actions">
            <button className="btn danger solid" onClick={remove}>Delete part</button>
            <button className="btn" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
