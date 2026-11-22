import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { ErrorBox } from "./Login.jsx";

// _links hrefs are absolute; turn them back into an /api-relative path
const relPath = (href) => new URL(href, window.location.origin).pathname.replace(/^\/api/, "");

export default function PartPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [part, setPart] = useState(null);
  const [car, setCar] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setPart(null);
    setCar(null);
    api(`/parts/${id}`)
      .then(async (p) => {
        if (!live) return;
        setPart(p);
        const href = p._links?.parent?.flat?.href;
        if (href) {
          try {
            const c = await api(relPath(href));
            if (live) setCar(c);
          } catch { /* car info is a nice-to-have */ }
        }
      })
      .catch((e) => live && setError(e));
    return () => { live = false; };
  }, [id]);

  async function remove() {
    if (!confirm("Delete this part?")) return;
    try {
      await api(`/parts/${id}`, { method: "DELETE" });
      nav("/search");
    } catch (e) {
      setError(e);
    }
  }

  if (error && !part) return <><ErrorBox error={error} /><Link to="/search">← Back to search</Link></>;
  if (!part) return <p className="muted">Loading…</p>;

  const canModify = user && (user.role === "admin" || (user.role === "seller" && (part.id_User === undefined || part.id_User === user.id)));

  return (
    <>
      <Link to="/search" className="muted">← Back to search</Link>
      <div className="detail">
        <div className="detail-main">
          <span className={`tag ${part.part_status}`}>{part.part_status}</span>
          <h1>{part.name}</h1>
          <p className="muted">OE code <strong>{part.OE_code}</strong></p>
          <p>{part.description || <span className="muted">No description provided.</span>}</p>
          {part.added_at && (
            <p className="muted">Listed {new Date(part.added_at).toLocaleDateString()}</p>
          )}
        </div>
        <aside className="detail-side">
          <div className="price big">€{Number(part.price).toFixed(2)}</div>
          {car && (
            <div className="fitbox">
              <strong>Fits</strong>
              <div>{car.modification_name}</div>
              <div className="muted">
                {car.car_year} · {car.fuel} · {car.transmission} · {car.power_kw} kW · {car.displacement_cc} cc
              </div>
            </div>
          )}
          {canModify && (
            <div className="row">
              <button className="danger" onClick={remove}>Delete listing</button>
            </div>
          )}
          <ErrorBox error={error} />
        </aside>
      </div>
    </>
  );
}
