import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RatingsPage from "./pages/RatingsPage";
import AdminPage from "./pages/AdminPage";
import api from "./utils/api";

// ─── RATER LAYOUT (rating only, no dashboard) ────────────────────────────────
function RaterLayout({ user, logout }) {
  const [currentMonth, setCurrentMonth] = useState(null);
  useEffect(() => { api.get("/months/current").then(r => setCurrentMonth(r.data)).catch(() => {}); }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
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
              📅 {currentMonth.month_label}{currentMonth.is_locked && " 🔒"}
            </span>
          )}
          <span style={{ color:"rgba(255,255,255,0.9)", fontSize:13 }}>⭐ {user.full_name || user.username}</span>
          <button onClick={logout} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"5px 12px", color:"#fff", fontSize:12, cursor:"pointer" }}>Sign Out</button>
        </div>
      </div>
      <div style={{ background:"#f0fdfa", borderBottom:"1px solid #99f6e4", padding:"10px 28px" }}>
        <span style={{ fontSize:13, color:"#0f766e" }}>⭐ <strong>Rater Access</strong> — Enter grades and save. Ratings lock after submission. Contact admin to make changes.</span>
      </div>
      <div style={{ padding:28 }}><RatingsPage currentMonth={currentMonth} initialAreaId={null} /></div>
    </div>
  );
}

// ─── VIEWER LAYOUT (dashboard + ratings read-only, NO admin) ─────────────────
function ViewerLayout({ user, logout }) {
  const [page, setPage] = useState("dashboard");
  const [currentMonth, setCurrentMonth] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonthId, setSelectedMonthId] = useState(null);

  useEffect(() => {
    api.get("/months").then(r => {
      setMonths(r.data);
      const cur = r.data.find(m => m.is_current);
      if (cur) { setSelectedMonthId(cur.id); setCurrentMonth(cur); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedMonthId && months.length) setCurrentMonth(months.find(m => m.id === selectedMonthId) || null);
  }, [selectedMonthId, months]);

  const NAV = [
    { id:"dashboard", label:"Dashboard", icon:"▦" },
    { id:"ratings", label:"View Ratings", icon:"★" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width:220, background:"#1e4d8c", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"24px 20px 20px", borderBottom:"1px solid #2a5fa8" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, background:"#f59e0b", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚙</div>
            <div><div style={{ color:"#fff", fontWeight:800, fontSize:14 }}>SAI WARDHA</div><div style={{ color:"#93b8e8", fontSize:10, letterSpacing:0.8 }}>VIEWER PORTAL</div></div>
          </div>
          <div style={{ background:"#163a6e", borderRadius:8, padding:"6px 10px" }}>
            <p style={{ margin:0, fontSize:10, color:"#f59e0b", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>👁 View Only</p>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"#93b8e8" }}>Read-only access</p>
          </div>
        </div>

        {/* Month selector */}
        <div style={{ padding:"16px 16px 0" }}>
          <label style={{ display:"block", fontSize:10, color:"#93b8e8", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Assessment Month</label>
          <select value={selectedMonthId || ""} onChange={e => setSelectedMonthId(parseInt(e.target.value))}
            style={{ width:"100%", background:"#163a6e", border:"1px solid #2a5fa8", borderRadius:6, padding:"8px 10px", color:"#c8dff0", fontSize:12, outline:"none" }}>
            {months.map(m => <option key={m.id} value={m.id}>{m.month_label}{m.is_current?" ★":""}{m.is_locked?" 🔒":""}</option>)}
          </select>
        </div>

        <nav style={{ padding:"16px 10px", flex:1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:12,
              padding:"10px 12px", borderRadius:8, border:"none", cursor:"pointer", marginBottom:4,
              background: page === n.id ? "#fff" : "transparent",
              color: page === n.id ? "#1e4d8c" : "#93b8e8",
              fontWeight: page === n.id ? 700 : 400, fontSize:14,
            }}>
              <span style={{ fontSize:16 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding:"16px 12px", borderTop:"1px solid #2a5fa8" }}>
          <div style={{ marginBottom:8 }}>
            <div style={{ color:"#fff", fontSize:13, fontWeight:600 }}>{user.full_name || user.username}</div>
            <div style={{ color:"#93b8e8", fontSize:11 }}>{user.role_name}</div>
          </div>
          <button onClick={logout} style={{ width:"100%", background:"#163a6e", border:"1px solid #2a5fa8", borderRadius:6, padding:"7px", color:"#93b8e8", fontSize:12, cursor:"pointer" }}>Sign Out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 28px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:"#1a2744" }}>{NAV.find(n=>n.id===page)?.label}</h1>
            {currentMonth && <p style={{ margin:0, fontSize:12, color:"#6b7a99" }}>{currentMonth.month_label}{currentMonth.is_locked && <span style={{ marginLeft:8, color:"#f59e0b", fontWeight:600 }}>🔒 Locked</span>}</p>}
          </div>
          <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:6, padding:"4px 12px", fontSize:12, color:"#0369a1", fontWeight:600 }}>
            👁 View Only — No editing allowed
          </div>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:28 }}>
          {page==="dashboard" && <DashboardPage currentMonth={currentMonth} months={months} onNavigateRatings={() => setPage("ratings")} />}
          {page==="ratings" && <RatingsPage currentMonth={currentMonth} initialAreaId={null} />}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN LAYOUT (full access) ───────────────────────────────────────────────
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
      if (!selectedMonthId && cur) { setSelectedMonthId(cur.id); setCurrentMonth(cur); }
    }).catch(() => {});
  }
  useEffect(() => { loadMonths(); }, []);
  useEffect(() => {
    if (selectedMonthId && months.length) setCurrentMonth(months.find(m => m.id === selectedMonthId) || null);
  }, [selectedMonthId, months]);

  const NAV = [
    { id:"dashboard", label:"Dashboard", icon:"▦" },
    { id:"ratings", label:"Ratings", icon:"★" },
    { id:"admin", label:"Admin", icon:"⚙" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width: sidebarOpen?240:64, background:"#1a3a6b", display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0, position:"relative" }}>
        <div style={{ padding: sidebarOpen?"24px 20px 20px":"24px 12px 20px", borderBottom:"1px solid #2a5490" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"#f59e0b", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>⚙</div>
            {sidebarOpen && <div><div style={{ color:"#fff", fontWeight:800, fontSize:14 }}>SAI WARDHA</div><div style={{ color:"#93b4d4", fontSize:10, letterSpacing:0.8 }}>ADMIN PORTAL</div></div>}
          </div>
        </div>
        {sidebarOpen && (
          <div style={{ padding:"16px 16px 0" }}>
            <label style={{ display:"block", fontSize:10, color:"#93b4d4", textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Assessment Month</label>
            <select value={selectedMonthId||""} onChange={e=>setSelectedMonthId(parseInt(e.target.value))}
              style={{ width:"100%", background:"#0f2a55", border:"1px solid #2a5490", borderRadius:6, padding:"8px 10px", color:"#c8dff0", fontSize:12, outline:"none" }}>
              {months.map(m=><option key={m.id} value={m.id}>{m.month_label}{m.is_current?" ★":""}{m.is_locked?" 🔒":""}</option>)}
            </select>
          </div>
        )}
        <nav style={{ padding:"16px 10px", flex:1 }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:12,
              padding: sidebarOpen?"10px 12px":"10px", borderRadius:8, border:"none", cursor:"pointer", marginBottom:4,
              background: page===n.id?"#fff":"transparent",
              color: page===n.id?"#1a3a6b":"#93b4d4",
              fontWeight: page===n.id?700:400, fontSize:14,
              justifyContent: sidebarOpen?"flex-start":"center"
            }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
              {sidebarOpen && <span>{n.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"16px 12px", borderTop:"1px solid #2a5490" }}>
          {sidebarOpen && (
            <div style={{ padding:"8px 12px", background:"#0f2a55", borderRadius:8, marginBottom:8 }}>
              <p style={{ margin:0, fontSize:11, color:"#f59e0b", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>🔑 Administrator</p>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"#93b4d4" }}>{user.full_name||user.username}</p>
            </div>
          )}
          <button onClick={logout} style={{ width:"100%", background:"#0f2a55", border:"1px solid #2a5490", borderRadius:6, padding:"7px", color:"#93b4d4", fontSize:12, cursor:"pointer" }}>
            {sidebarOpen?"Sign Out":"⏏"}
          </button>
        </div>
        <button onClick={()=>setSidebarOpen(o=>!o)} style={{ position:"absolute", top:20, right:-12, width:24, height:24, background:"#1a3a6b", border:"2px solid #2a5490", borderRadius:"50%", cursor:"pointer", color:"#93b4d4", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {sidebarOpen?"◀":"▶"}
        </button>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 28px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h1 style={{ margin:0, fontSize:17, fontWeight:700, color:"#1a2744" }}>{NAV.find(n=>n.id===page)?.label}</h1>
            {currentMonth && <p style={{ margin:0, fontSize:12, color:"#6b7a99" }}>{currentMonth.month_label}{currentMonth.is_locked&&<span style={{ marginLeft:8, color:"#f59e0b", fontWeight:600 }}>🔒 Locked</span>}</p>}
          </div>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:28 }}>
          {page==="dashboard" && <DashboardPage currentMonth={currentMonth} months={months} onNavigateRatings={id=>{setRatingAreaId(id);setPage("ratings");}} />}
          {page==="ratings" && <RatingsPage currentMonth={currentMonth} initialAreaId={ratingAreaId} />}
          {page==="admin" && <AdminPage currentMonth={currentMonth} months={months} onMonthChange={loadMonths} />}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT: route by role ──────────────────────────────────────────────────────
function Layout() {
  const { user, logout, can } = useAuth();
  if (!user) return <LoginPage />;

  // Admin — full access
  if (user.is_admin || can("can_manage_users") || can("can_manage_settings")) {
    return <AdminLayout user={user} logout={logout} can={can} />;
  }
  // Viewer — dashboard + read-only ratings, NO admin
  if (can("can_view_penalties") || can("can_export")) {
    return <ViewerLayout user={user} logout={logout} />;
  }
  // Rater — ratings only
  return <RaterLayout user={user} logout={logout} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style:{ background:"#1a3a6b", color:"#fff", borderRadius:8 } }} />
      <Layout />
    </AuthProvider>
  );
}