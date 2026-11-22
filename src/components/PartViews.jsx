import { Link } from "react-router-dom";
import { CodeChip, HeartButton, Skeleton, StatusTag, eur } from "../ui.jsx";

export const fitsOf = (p) =>
  p.fits || (p.MANUFACTURER ? [p.MANUFACTURER, p.MODEL, p.GENERATION].filter(Boolean).join(" ") : "");

// one line of the stock sheet
export function PartRow({ p }) {
  const fits = fitsOf(p);
  return (
    <div className="prow">
      <Link className="prow-main" to={`/part/${p.id_Part}`}>
        <span className="pname">{p.name}</span>
        {fits && <span className="pfits">{fits}</span>}
      </Link>
      <CodeChip code={p.OE_code} />
      <StatusTag status={p.part_status} />
      <span className="pprice">{eur(p.price)}</span>
      <HeartButton part={p} />
    </div>
  );
}

export function PartTile({ p }) {
  const fits = fitsOf(p);
  return (
    <article className="ptile">
      <HeartButton part={p} />
      <StatusTag status={p.part_status} />
      <Link to={`/part/${p.id_Part}`} className="pname">{p.name}</Link>
      {fits && <span className="pfits">{fits}</span>}
      <div className="ptile-foot">
        <CodeChip code={p.OE_code} />
        <span className="pprice">{eur(p.price)}</span>
      </div>
    </article>
  );
}

export function RowSkeletons({ n = 6 }) {
  return (
    <div className="plist" aria-busy="true">
      {Array.from({ length: n }).map((_, i) => (
        <div className="prow" key={i}>
          <div><Skeleton h={18} w="55%" /></div>
          <Skeleton h={22} w={96} />
          <Skeleton h={22} w={72} />
          <Skeleton h={22} w={72} />
          <span />
        </div>
      ))}
    </div>
  );
}
