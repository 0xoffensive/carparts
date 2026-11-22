import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, decodeJwt, loadTokens, saveTokens } from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const userFrom = (tokens) => {
  const p = tokens?.token && decodeJwt(tokens.token);
  return p ? { id: Number(p.sub), role: p.role } : null;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => userFrom(loadTokens()));

  useEffect(() => {
    const sync = () => setUser(userFrom(loadTokens()));
    window.addEventListener("auth:refreshed", sync);
    window.addEventListener("auth:expired", sync);
    return () => {
      window.removeEventListener("auth:refreshed", sync);
      window.removeEventListener("auth:expired", sync);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const t = await api("/auth/login", { method: "POST", body: { email, password } });
    saveTokens(t);
    setUser(userFrom(t));
  }, []);

  const register = useCallback(
    async (form) => {
      await api("/auth/register", { method: "POST", body: form });
      await login(form.email, form.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    const t = loadTokens();
    try {
      await api("/auth/logout", {
        method: "POST",
        body: { refresh_token: t?.refresh_token },
        retry: false,
      });
    } catch {
      /* token may already be expired; local sign-out is what matters */
    }
    saveTokens(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}
