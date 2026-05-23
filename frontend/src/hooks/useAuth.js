import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sw_user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sw_token");
    if (token) {
      api.get("/auth/me").then(r => {
        setUser(r.data);
        localStorage.setItem("sw_user", JSON.stringify(r.data));
      }).catch(() => {
        localStorage.removeItem("sw_token");
        localStorage.removeItem("sw_user");
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(username, password) {
    const r = await api.post("/auth/login", { username, password });
    localStorage.setItem("sw_token", r.data.token);
    localStorage.setItem("sw_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  }

  function logout() {
    localStorage.removeItem("sw_token");
    localStorage.removeItem("sw_user");
    setUser(null);
  }

  const can = (perm) => user?.is_admin || user?.[perm];

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
