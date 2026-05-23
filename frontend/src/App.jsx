import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RatingsPage from "./pages/RatingsPage";
import AdminPage from "./pages/AdminPage";
import api from "./utils/api";

const NAV = [
  { id:"dashboard", label:"Dashboard", icon:"▦" },
  { id:"ratings", label:"Ratings", icon:"★" },
  { id:"admin", label:"Admin", icon:"⚙" },
];

function Layout() {
  const { user, logout, can } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [ratingAreaId, setRatingAreaId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonthId, setSelectedMonthId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function loadMonths() {
    api.get("/months").then(r => {
      setMonths(r.data);
      const cur = r.data.find(m => m.is_current);
      if (!selectedMonthId && cur) setSelectedMonthId(cur.id);
      if (!currentMonth && cur) setCurrentMonth(cur);
    }).catch(() => {});
  }

  useEffect(() => { if (user) loadMonths(); }, [user]);

  useEffect(() => {
    if (selectedMonthId && months.length) {
      setCurrentMonth(months.find(m => m.id === selectedMonthId) || null);
    }
  }, [selectedMonthId, months]);

  function navigateRatings(areaId) {
    setRatingAreaId(areaId);
    setPage("ratings");
  }

  if (!user) return <LoginPage />;

  const visibleNav = NAV.filter(n => {
    if (n.id === "admin") return user.is_admin || can("can_manage_users");
    return true;
  });

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 240 : 64, background:"#1a3a6b", display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0, position:"relative" }}>
        {/* Logo */}
        <div style={{ padding: sidebarOpen ? "24px 20px 20px" : "24px 12px 20px", borderBottom:"1px solid #2a5490" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"#f59e0b", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>⚙</div>
            {sidebarOpen && (
              <div>
                <div style={{ color:"#fff", fontWeight:800, fontSize:14, lineHeight:1.2 }}>SAI WARDHA</div>
                <div style={{ color:"#93b4d4", fontSize:10, letterSpacing:0.8 }}>KD3 PORTAL</div>
              </div>
            )}
          </div>
        </div>

        {/* Month selector */}
        {sidebarOpen && (
          <div style={{ padding:"16px 16px 0" }}>
            <label style={{ display:"block", fontSize:10, color:"#93b4d4", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Assessment Month</label>
            <select
              value={selectedMonthId || ""}
              onChange={e => setSelectedMonthId(parseInt(e.target.value))}
              style={{ width:"100%", background:"#0f2a55", border:"1px solid #2a5490", borderRadius:6, padding:"8px 10px", color:"#c8dff0", fontSize:12, outline:"none" }}
            >
              {months.map(m => (
                <option key={m.id} value={m.id}>
                  {m.month_label}{m.is_current ? " ★" : ""}{m.is_locked ? " 🔒" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nav */}
        <nav style={{ padding:"16px 10px", flex:1 }}>
          {visibleNav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:12,
              padding: sidebarOpen ? "10px 12px" : "10px",
              borderRadius:8, border:"none", cursor:"pointer", marginBottom:4,
              background: page === n.id ? "#fff" : "transparent",
              color: page === n.id ? "#1a3a6b" : "#93b4d4",
              fontWeight: page === n.id ? 700 : 400,
              fontSize:14, justifyContent: sidebarOpen ? "flex-start" : "center",
              transition:"all 0.15s"
            }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
              {sidebarOpen && <span>{n.label}</span>}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding:"16px 12px", borderTop:"1px solid #2a5490" }}>
          {sidebarOpen ? (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:13 }}>
                  {(user.full_name || user.username)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ color:"#fff", fontSize:13, fontWeight:600 }}>{user.full_name || user.username}</div>
                  <div style={{ color:"#93b4d4", fontSize:11 }}>{user.role_name}</div>
                </div>
              </div>
              <button onClick={logout} style={{ width:"100%", background:"#0f2a55", border:"1px solid #2a5490", borderRadius:6, padding:"7px", color:"#93b4d4", fontSize:12, cursor:"pointer" }}>
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={logout} title="Sign Out" style={{ width:"100%", background:"transparent", border:"none", color:"#93b4d4", fontSize:18, cursor:"pointer", padding:"8px 0" }}>⏏</button>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ position:"absolute", top:20, right:-12, width:24, height:24, background:"#1a3a6b", border:"2px solid #2a5490", borderRadius:"50%", cursor:"pointer", color:"#93b4d4", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" }}
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Top bar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 28px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:"#1a2744" }}>
              {NAV.find(n => n.id === page)?.label || "Dashboard"}
            </h1>
            {currentMonth && (
              <p style={{ margin:0, fontSize:12, color:"#6b7a99" }}>
                {currentMonth.month_label}
                {currentMonth.is_locked && <span style={{ marginLeft:8, color:"#f59e0b", fontWeight:600 }}>🔒 Locked</span>}
              </p>
            )}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {currentMonth?.is_locked && (
              <div style={{ background:"#fffbeb", border:"1px solid #fbbf24", borderRadius:6, padding:"4px 12px", fontSize:12, color:"#92400e", fontWeight:600 }}>
                Viewing archived data
              </div>
            )}
          </div>
        </div>

        {/* Page */}
        <div style={{ flex:1, overflow:"auto", padding:28 }}>
          {page === "dashboard" && <DashboardPage currentMonth={currentMonth} months={months} onNavigateRatings={navigateRatings} />}
          {page === "ratings" && <RatingsPage currentMonth={currentMonth} initialAreaId={ratingAreaId} />}
          {page === "admin" && <AdminPage currentMonth={currentMonth} months={months} onMonthChange={loadMonths} />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { background:"#1a3a6b", color:"#fff", borderRadius:8 } }} />
      <Layout />
    </AuthProvider>
  );
}