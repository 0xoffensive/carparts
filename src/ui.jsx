import { createContext, useCallback, useContext, useEffect, useState } from "react";

/* ---------------- icons ---------------- */
const svg = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
export const HeartIcon = ({ filled }) => (
  <svg {...svg} fill={filled ? "currentColor" : "none"}><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.700 3.900 4.500 7.200 4.500c1.900 0 3.500 1 4.800 2.800 1.300-1.800 2.900-2.800 4.800-2.800 3.300 0 5.500 3.200 4.400 6.600-1.700 4.800-9.200 9.400-9.200 9.400z" /></svg>
);
export const SearchIcon = () => (<svg {...svg}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.500-3.500" /></svg>);
export const SunIcon = () => (<svg {...svg}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400" /></svg>);
export const MoonIcon = () => (<svg {...svg}><path d="M21 12.800A9 9 0 1111.200 3a7 7 0 009.800 9.800z" /></svg>);
export const ListIcon = () => (<svg {...svg}><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
export const GridIcon = () => (<svg {...svg}><rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /></svg>);
export const CheckIcon = () => (<svg {...svg} strokeWidth={2.600}><path d="M5 12.500l4.500 4.500L19 7.500" /></svg>);

/* ---------------- formatting ---------------- */
const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });
export const eur = (n) => fmt.format(Number(n) || 0);

/* ---------------- toasts ---------------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, text, kind }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- theme ---------------- */
const ThemeCtx = createContext({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light",
  );
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("carparts.theme", next); } catch { /* private mode */ }
      return next;
    });
  }, []);
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="icon-btn" onClick={toggle} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/* ---------------- saved + recently viewed ---------------- */
const SavedCtx = createContext({ saved: [], recent: [], has: () => false, toggle() {}, view() {} });
export const useSaved = () => useContext(SavedCtx);

const read = (k) => {
  try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};
const snap = (p) => ({
  id_Part: p.id_Part,
  name: p.name,
  price: p.price,
  OE_code: p.OE_code,
  part_status: p.part_status,
  fits: p.fits || (p.MANUFACTURER ? [p.MANUFACTURER, p.MODEL, p.GENERATION].filter(Boolean).join(" ") : ""),
});

export function SavedProvider({ children }) {
  const toast = useToast();
  const [saved, setSaved] = useState(() => read("carparts.saved"));
  const [recent, setRecent] = useState(() => read("carparts.recent"));
  useEffect(() => write("carparts.saved", saved), [saved]);
  useEffect(() => write("carparts.recent", recent), [recent]);

  const has = (id) => saved.some((x) => x.id_Part === id);
  const toggle = (p) => {
    if (has(p.id_Part)) {
      setSaved((l) => l.filter((x) => x.id_Part !== p.id_Part));
      toast("Removed from saved parts");
    } else {
      setSaved((l) => [snap(p), ...l]);
      toast("Saved. Find it under Saved.");
    }
  };
  const view = (p) =>
    setRecent((l) => [snap(p), ...l.filter((x) => x.id_Part !== p.id_Part)].slice(0, 8));

  return <SavedCtx.Provider value={{ saved, recent, has, toggle, view }}>{children}</SavedCtx.Provider>;
}

/* ---------------- small building blocks ---------------- */
export function Modal({ open, onClose, title, side = false, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${side ? "drawer" : "dialog"}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Skeleton = ({ h = 16, w = "100%" }) => (
  <span className="skel" style={{ height: h, width: w }} />
);

export const StatusTag = ({ status }) => <span className={`status ${status}`}>{status}</span>;

export function CodeChip({ code }) {
  const toast = useToast();
  return (
    <button
      className="code"
      title="Copy OE code"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(code);
          toast("OE code copied");
        } catch {
          toast("Could not copy. Select the code and copy it manually.", "err");
        }
      }}
    >
      {code}
    </button>
  );
}

export function HeartButton({ part }) {
  const { has, toggle } = useSaved();
  const on = has(part.id_Part);
  return (
    <button
      className={`icon-btn heart ${on ? "on" : ""}`}
      aria-pressed={on}
      aria-label={on ? "Remove from saved parts" : "Save part"}
      onClick={(e) => { e.preventDefault(); toggle(part); }}
    >
      <HeartIcon filled={on} />
    </button>
  );
}

export const Empty = ({ title, children }) => (
  <div className="empty">
    <h3>{title}</h3>
    <div>{children}</div>
  </div>
);
