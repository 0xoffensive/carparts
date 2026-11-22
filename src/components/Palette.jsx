import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractRows } from "../api.js";
import { useAuth } from "../auth.jsx";
import { eur, useTheme } from "../ui.jsx";

// Quick find: Ctrl/Cmd+K or "/" from anywhere.
export default function Palette() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { toggle: toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const [remote, setRemote] = useState({ makers: [], parts: [] });
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !/input|textarea|select/i.test(e.target.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setI(0);
    setRemote({ makers: [], parts: [] });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const s = q.trim();
    setI(0);
    if (s.length < 2) { setRemote({ makers: [], parts: [] }); return; }
    let live = true;
    const t = setTimeout(async () => {
      const [m, p] = await Promise.allSettled([
        api("/manufacturers", { query: { name: s, limit: 5 } }),
        api("/parts", { query: { name: s, limit: 6 } }),
      ]);
      if (!live) return;
      setRemote({
        makers: m.status === "fulfilled" ? extractRows(m.value) : [],
        parts: p.status === "fulfilled" ? extractRows(p.value) : [],
      });
    }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pages = [
      { label: "Home", to: "/" },
      { label: "Search parts", to: "/search" },
      { label: "Browse the catalog", to: "/browse/manufacturers" },
      { label: "Saved parts", to: "/saved" },
      user ? { label: "Log out", run: logout } : { label: "Log in", to: "/login" },
      { label: "Switch light or dark theme", run: toggleTheme },
    ]
      .filter((p) => !s || p.label.toLowerCase().includes(s))
      .map((p) => ({ group: "Go to", ...p }));
    const parts = remote.parts.map((p) => ({
      group: "Parts", label: p.name, hint: `${p.OE_code}  ${eur(p.price)}`, to: `/part/${p.id_Part}`,
    }));
    const makers = remote.makers.map((m) => ({
      group: "Manufacturers", label: m.name, hint: "See all parts",
      to: `/search?manufacturer=${encodeURIComponent(m.name)}`,
    }));
    return [...parts, ...makers, ...pages];
  }, [q, remote, user, logout, toggleTheme]);

  const go = (it) => {
    if (!it) return;
    setOpen(false);
    if (it.to) nav(it.to);
    else it.run?.();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI((n) => Math.min(n + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(items[i]); }
    else if (e.key === "Escape") setOpen(false);
  };

  if (!open) return null;
  let last = "";
  return (
    <div className="overlay top" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Quick find">
        <input ref={inputRef} autoFocus className="palette-input" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Search parts, manufacturers and pages" aria-label="Quick find" />
        <ul className="palette-list">
          {items.map((it, idx) => {
            const head = it.group !== last;
            last = it.group;
            return (
              <li key={`${it.group}-${it.label}-${idx}`}>
                {head && <div className="pgroup">{it.group}</div>}
                <button className={`pitem ${idx === i ? "on" : ""}`}
                  onMouseEnter={() => setI(idx)} onClick={() => go(it)}>
                  <span>{it.label}</span>
                  {it.hint && <span className="muted">{it.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {items.length === 0 && (
          <p className="palette-empty">Nothing found. Try a part name, an OE code or a manufacturer.</p>
        )}
      </div>
    </div>
  );
}
