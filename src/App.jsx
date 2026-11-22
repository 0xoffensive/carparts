import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Login from "./pages/Login.jsx";
import Search from "./pages/Search.jsx";
import Browse from "./pages/Browse.jsx";
import Home from "./pages/Home.jsx";
import PartPage from "./pages/PartPage.jsx";

export default function App() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link to="/" className="brand"><span className="logo">⚙</span> Car Parts</Link>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/browse/manufacturers">Browse</NavLink>
          <span className="spacer" />
          {user ? (
            <>
              <span className={`tag role ${user.role}`}>{user.role}</span>
              <button className="ghost" onClick={logout}>Log out</button>
            </>
          ) : (
            <Link to="/login" className="btn">Log in</Link>
          )}
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/part/:id" element={<PartPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/browse" element={<Navigate to="/browse/manufacturers" replace />} />
          <Route path="/browse/*" element={<Browse />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <footer className="foot muted">Car Parts catalog</footer>
    </>
  );
}
