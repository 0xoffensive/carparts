import { Link } from "react-router-dom";
import { Empty, useSaved } from "../ui.jsx";
import { PartRow } from "../components/PartViews.jsx";

export default function Saved() {
  const { saved, recent } = useSaved();
  return (
    <>
      <h1 className="page-title">Saved parts</h1>
      {saved.length > 0 ? (
        <div className="plist">{saved.map((p) => <PartRow key={p.id_Part} p={p} />)}</div>
      ) : (
        <Empty title="No saved parts yet">
          <p>Select the heart on any part to keep it here. Saved parts stay on this device.</p>
          <Link className="btn primary" to="/search">Search parts</Link>
        </Empty>
      )}
      {recent.length > 0 && (
        <>
          <h2 className="subtitle">Recently viewed</h2>
          <div className="plist">{recent.map((p) => <PartRow key={p.id_Part} p={p} />)}</div>
        </>
      )}
    </>
  );
}
