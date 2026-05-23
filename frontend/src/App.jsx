import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RatingsPage from "./pages/RatingsPage";
import AdminPage from "./pages/AdminPage";
import api from "./utils/api";

function RaterLayout({ user, logout }) {
  const [currentMonth, setCurrentMonth] = useState(null);

  useEffect(() => {
    api.get("/months/current").then(r => setCurrentMonth(r.data)).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Simple top bar */}
      <div style={{ background:"#0f766e", padding:"0 28px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:32, height:32, background:"#f59e0b", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚙</div>
          <div>
            <span style={{ color:"#fff", fontWeight:800, fontSize:15 }}>SAI WARDHA</span>
            <span style={{ color:"rgba(255,255,255,0.6)", fontSize:12, marginLeft:8 }}>Housekeeping Ratings</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {currentMonth && (
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.8)", background:"rgba(255,255,255,0.15)", padding:"4px 12px", borderRadius:20 }}>
              📅 {currentMonth.month_label}
              {currentMonth.is_locked && " 🔒"}
            </span>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center", color:"#1a2744", fontWeight:800, fontSize:12 }}>
              {(user.full_name || user.username)[0].toUpperCase()}
            </div>
            <span style={{ color:"rgba(255,255,255,0.9)", fontSize:13 }}>{user.full_name || user.username}</span>
          </div>
          <button onClick={logout} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"5px 12px", color:"#fff", fontSize:12, cursor:"pointer" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Rater notice */}
      <div style={{ background:"#f0fdfa", borderBottom:"1px solid #99f6e4", padding:"10px 28px", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:13, color:"#0f766e" }}>
          ⭐ <strong>Rater Access</strong> — Enter grades below. Once saved, ratings are submitted and locked. Contact admin to make changes.
        </span>
      </div>

      <div style={{ padding:28 }}>
        <RatingsPage currentMonth={currentMonth} initialAreaId={null} />
      </div>
    </div>
  );
}

function AdminLayout({ user, logout, can }) {
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

  useEffect(() => { loadMonths(); }, []);

  useEffect(() => {
    if (selectedMonthId && months.length) setCurrentMonth(months.find(m => m.id === selectedMonthId) || null);
  }, [selectedMonthId, months]);

  const NAV = [
    { id:"dashboard", label:"Dashboard", icon:"▦" },
    { id:"ratings", label:"Ratings", icon:"★" },
    { id:"admin", label:"Admin", icon:"⚙", show: user.is_admin || can("can_manage_users") },
  ].filter(n => n.show !== false);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 240 : 64, background:"#1a3a6b", display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0, position:"relative" }}>
        <div style={{ padding: sidebarOpen ? "24px 20px 20px" : "24px 12px 20px", borderBottom:"1px solid #2a5490" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"#f59e0b", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>⚙</div>
            {sidebarOpen && <div><div style={{ color:"#fff", fontWeight:800, fontSize:14 }}>SAI WARDHA</div><div style={{ color:"#93b4d4", fontSize:10, letterSpacing:0.8 }}>ADMIN PORTAL</div></div>}
          </div>
        </div>

        {sidebarOpen && (
          <div style={{ padding:"16px 16px 0" }}>
            <label style={{ display:"block", fontSize:10, color:"#93b4d4", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Assessment Month</label>
            <select value={selectedMonthId || ""} onChange={e => setSelectedMonthId(parseInt(e.target.value))}
              style={{ width:"100%", background:"#0f2a55", border:"1px solid #2a5490", borderRadius:6, padding:"8px 10px", color:"#c8dff0", fontSize:12, outline:"none" }}>
              {months.map(m => <option key={m.id} value={m.id}>{m.month_label}{m.is_current?" ★":""}{m.is_locked?" 🔒":""}</option>)}
            </select>
          </div>
        )}

        <nav style={{ padding:"16px 10px", flex:1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:12,
              padding: sidebarOpen ? "10px 12px" : "10px", borderRadius:8, border:"none", cursor:"pointer", marginBottom:4,
              background: page === n.id ? "#fff" : "transparent",
              color: page === n.id ? "#1a3a6b" : "#93b4d4",
              fontWeight: page === n.id ? 700 : 400, fontSize:14,
              justifyContent: sidebarOpen ? "flex-start" : "center"
            }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
              {sidebarOpen && <span>{n.label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding:"16px 12px", borderBottom:"1px solid #2a5490" }}>
          {sidebarOpen ? (
            <div style={{ padding:"8px 12px", background:"#0f2a55", borderRadius:8, marginBottom:8 }}>
              <p style={{ margin:0, fontSize:11, color:"#f59e0b", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>🔑 Administrator</p>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#93b4d4" }}>{user.full_name || user.username}</p>
            </div>
          ) : null}
          <button onClick={logout} style={{ width:"100%", background:"#0f2a55", border:"1px solid #2a5490", borderRadius:6, padding:"7px", color:"#93b4d4", fontSize:12, cursor:"pointer" }}>
            {sidebarOpen ? "Sign Out" : "⏏"}
          </button>
        </div>

        <button onClick={() => setSidebarOpen(o => !o)} style={{ position:"absolute", top:20, right:-12, width:24, height:24, background:"#1a3a6b", border:"2px solid #2a5490", borderRadius:"50%", cursor:"pointer", color:"#93b4d4", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {sidebarOpen ? "◀" : "▶"}
        </button>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 28px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:"#1a2744" }}>{NAV.find(n=>n.id===page)?.label}</h1>
            {currentMonth && <p style={{ margin:0, fontSize:12, color:"#6b7a99" }}>{currentMonth.month_label}{currentMonth.is_locked && <span style={{ marginLeft:8, color:"#f59e0b", fontWeight:600 }}>🔒 Locked</span>}</p>}
          </div>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:28 }}>
          {page==="dashboard" && <DashboardPage currentMonth={currentMonth} months={months} onNavigateRatings={id => { setRatingAreaId(id); setPage("ratings"); }} />}
          {page==="ratings" && <RatingsPage currentMonth={currentMonth} initialAreaId={ratingAreaId} />}
          {page==="admin" && <AdminPage currentMonth={currentMonth} months={months} onMonthChange={loadMonths} />}
        </div>
      </div>
    </div>
  );
}

function Layout() {
  const { user, logout, can } = useAuth();
  if (!user) return <LoginPage />;
  // Raters get minimal layout
  if (!user.is_admin && !can("can_manage_users") && !can("can_view_penalties") && !can("can_export")) {
    return <RaterLayout user={user} logout={logout} />;
  }
  return <AdminLayout user={user} logout={logout} can={can} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { background:"#1a3a6b", color:"#fff", borderRadius:8 } }} />
      <Layout />
    </AuthProvider>
  );
}