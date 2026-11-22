import { useEffect } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { HeartIcon, SearchIcon, ThemeToggle, useSaved } from "./ui.jsx";
import Palette from "./components/Palette.jsx";
import Login from "./pages/Login.jsx";
import Search from "./pages/Search.jsx";
import Browse from "./pages/Browse.jsx";
import Home from "./pages/Home.jsx";
import PartPage from "./pages/PartPage.jsx";
import Saved from "./pages/Saved.jsx";

const Wheel = () => (
  <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round">
    <circle cx="16" cy="16" r="12" /><circle cx="16" cy="16" r="3.500" />
    <path d="M16 4v9M16 19v9M4 16h9M19 16h9" />
  </svg>
);

export default function App() {
  const { user, logout } = useAuth();
  const { saved } = useSaved();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand"><Wheel /> <span>Car Parts</span></Link>
          <NavLink className="navlink navhome" to="/" end>Home</NavLink>
          <NavLink className="navlink" to="/search">Search</NavLink>
          <NavLink className="navlink" to="/browse/manufacturers">Catalog</NavLink>
          <span className="spacer" />
          <button className="quick" onClick={() => window.dispatchEvent(new Event("palette:open"))}>
            <SearchIcon /> <span>Quick find</span> <kbd>Ctrl K</kbd>
          </button>
          <NavLink className="icon-btn saved-link" to="/saved" aria-label={`Saved parts (${saved.length})`}>
            <HeartIcon filled={saved.length > 0} />
            {saved.length > 0 && <span className="count">{saved.length}</span>}
          </NavLink>
          <ThemeToggle />
          {user ? (
            <>
              <span className="role">{user.role}</span>
              <button className="btn small" onClick={logout}>Log out</button>
            </>
          ) : (
            <Link to="/login" className="btn small primary">Log in</Link>
          )}
        </div>
      </header>

      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/part/:id" element={<PartPage />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/login" element={<Login />} />
          <Route path="/browse" element={<Navigate to="/browse/manufacturers" replace />} />
          <Route path="/browse/*" element={<Browse />} />
          <Route path="*" element={<p>Page not found. <Link to="/">Go to the home page</Link>.</p>} />
        </Routes>
      </main>
      <footer className="foot">Car Parts. Parts listed against the exact car they fit.</footer>
      <Palette />
    </>
  );
}
