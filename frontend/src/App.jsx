import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RatingsPage from "./pages/RatingsPage";
import AdminPage from "./pages/AdminPage";
import api from "./utils/api";

const isMobile = () => window.innerWidth < 768;

// ─── RATER LAYOUT ─────────────────────────────────────────────────────────────
function RaterLayout({ user, logout }) {
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

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Top bar */}
      <div style={{ background:"#0f766e", padding:"0 16px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"#f59e0b", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚙</div>
          <div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:14 }}>OEG PORTAL</div>
            {currentMonth && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11 }}>{currentMonth.month_label}</div>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <select value={selectedMonthId||""} onChange={e=>setSelectedMonthId(parseInt(e.target.value))}
            style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"5px 8px", color:"#fff", fontSize:12, outline:"none", maxWidth:130 }}>
            {months.map(m=><option key={m.id} value={m.id} style={{ background:"#0f766e", color:"#fff" }}>{m.month_label}{m.is_locked?" 🔒":""}</option>)}
          </select>
          <button onClick={logout} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"5px 10px", color:"#fff", fontSize:12, cursor:"pointer" }}>Out</button>
        </div>
      </div>
      <div style={{ background:"#f0fdfa", borderBottom:"1px solid #99f6e4", padding:"8px 16px" }}>
        <span style={{ fontSize:12, color:"#0f766e" }}>⭐ Rater — Enter grades and submit. Locked after save.</span>
      </div>
      <div style={{ padding:"16px 12px" }}>
        <RatingsPage currentMonth={currentMonth} initialAreaId={null} />
      </div>
    </div>
  );
}

// ─── VIEWER LAYOUT ────────────────────────────────────────────────────────────
function ViewerLayout({ user, logout }) {
  const [page, setPage] = useState("dashboard");
  const [currentMonth, setCurrentMonth] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonthId, setSelectedMonthId] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

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

  const NAV = [{ id:"dashboard", label:"Dashboard", icon:"▦" }, { id:"ratings", label:"View Ratings", icon:"★" }];

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Mobile top bar */}
      <div style={{ background:"#1e4d8c", padding:"0 16px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => setNavOpen(o => !o)} style={{ background:"none", border:"none", color:"#fff", fontSize:20, cursor:"pointer", padding:4 }}>☰</button>
          <div style={{ color:"#fff", fontWeight:800, fontSize:15 }}>OEG PORTAL</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}>👁 {user.full_name?.split(" ")[0] || user.username}</span>
          <button onClick={logout} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:6, padding:"5px 10px", color:"#fff", fontSize:12, cursor:"pointer" }}>Out</button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }}>
          <div onClick={() => setNavOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:260, background:"#1e4d8c", padding:"20px 0", zIndex:201 }}>
            <div style={{ padding:"0 20px 20px", borderBottom:"1px solid #2a5fa8" }}>
              <div style={{ color:"#fff", fontWeight:800, fontSize:16 }}>OEG PORTAL</div>
              <div style={{ color:"#93b8e8", fontSize:11, marginTop:2 }}>VIEWER PORTAL</div>
              <select value={selectedMonthId||""} onChange={e=>{setSelectedMonthId(parseInt(e.target.value));setNavOpen(false);}}
                style={{ width:"100%", marginTop:12, background:"#163a6e", border:"1px solid #2a5fa8", borderRadius:6, padding:"8px 10px", color:"#c8dff0", fontSize:12, outline:"none" }}>
                {months.map(m=><option key={m.id} value={m.id}>{m.month_label}{m.is_current?" ★":""}</option>)}
              </select>
            </div>
            <nav style={{ padding:"12px 10px" }}>
              {NAV.map(n=>(
                <button key={n.id} onClick={()=>{setPage(n.id);setNavOpen(false);}} style={{
                  width:"100%", display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:8, border:"none", cursor:"pointer", marginBottom:4,
                  background: page===n.id?"#fff":"transparent", color: page===n.id?"#1e4d8c":"#93b8e8", fontWeight: page===n.id?700:400, fontSize:15,
                }}>
                  <span>{n.icon}</span><span>{n.label}</span>
                </button>
              ))}
            </nav>
            <div style={{ position:"absolute", bottom:20, left:0, right:0, padding:"0 16px" }}>
              <button onClick={logout} style={{ width:"100%", background:"#163a6e", border:"1px solid #2a5fa8", borderRadius:8, padding:"10px", color:"#93b8e8", fontSize:14, cursor:"pointer" }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding:"16px 12px" }}>
        <div style={{ marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1a2744" }}>{NAV.find(n=>n.id===page)?.label}</h2>
          {currentMonth && <span style={{ fontSize:11, color:"#6b7a99" }}>{currentMonth.month_label}</span>}
        </div>
        <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:6, padding:"6px 12px", marginBottom:16, fontSize:12, color:"#0369a1" }}>👁 View Only</div>
        {page==="dashboard" && <DashboardPage currentMonth={currentMonth} months={months} onNavigateRatings={()=>setPage("ratings")} />}
        {page==="ratings" && <RatingsPage currentMonth={currentMonth} initialAreaId={null} />}
      </div>
    </div>
  );
}

// ─── ADMIN LAYOUT ─────────────────────────────────────────────────────────────
function AdminLayout({ user, logout, can }) {
  const [page, setPage] = useState("dashboard");
  const [ratingAreaId, setRatingAreaId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonthId, setSelectedMonthId] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  function loadMonths() {
    api.get("/months").then(r => {
      setMonths(r.data);
      const cur = r.data.find(m => m.is_current);
      if (!selectedMonthId && cur) { setSelectedMonthId(cur.id); setCurrentMonth(cur); }
    }).catch(() => {});
  }
  useEffect(() => { loadMonths(); }, []);
  useEffect(() => {
    if (selectedMonthId && months.length) setCurrentMonth(months.find(m=>m.id===selectedMonthId)||null);
  }, [selectedMonthId, months]);

  const NAV = [
    { id:"dashboard", label:"Dashboard", icon:"▦" },
    { id:"ratings", label:"Ratings", icon:"★" },
    { id:"admin", label:"Admin", icon:"⚙" },
  ];

  const NavContent = () => (
    <>
      <div style={{ padding:"16px 20px 16px", borderBottom:"1px solid #2a5490" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <img src="/oeg-logo.jpeg" alt="OEG" style={{ width:38, height:38, objectFit:"contain", borderRadius:8, background:"#fff", padding:2, flexShrink:0 }} />
          <div><div style={{ color:"#fff", fontWeight:800, fontSize:14 }}>OEG PORTAL</div><div style={{ color:"#93b4d4", fontSize:10, letterSpacing:0.8 }}>ADMIN PORTAL</div></div>
        </div>
        <select value={selectedMonthId||""} onChange={e=>{setSelectedMonthId(parseInt(e.target.value));setNavOpen(false);}}
          style={{ width:"100%", background:"#0f2a55", border:"1px solid #2a5490", borderRadius:6, padding:"8px 10px", color:"#c8dff0", fontSize:12, outline:"none" }}>
          {months.map(m=><option key={m.id} value={m.id}>{m.month_label}{m.is_current?" ★":""}{m.is_locked?" 🔒":""}</option>)}
        </select>
      </div>
      <nav style={{ padding:"12px 10px", flex:1 }}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>{setPage(n.id);setNavOpen(false);}} style={{
            width:"100%", display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:8, border:"none", cursor:"pointer", marginBottom:4,
            background: page===n.id?"#fff":"transparent", color: page===n.id?"#1a3a6b":"#93b4d4", fontWeight: page===n.id?700:400, fontSize:15,
          }}>
            <span>{n.icon}</span><span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ padding:"16px 12px", borderTop:"1px solid #2a5490" }}>
        <div style={{ padding:"8px 12px", background:"#0f2a55", borderRadius:8, marginBottom:8 }}>
          <p style={{ margin:0, fontSize:11, color:"#f59e0b", fontWeight:700, textTransform:"uppercase" }}>🔑 Admin</p>
          <p style={{ margin:"2px 0 0", fontSize:12, color:"#93b4d4" }}>{user.full_name||user.username}</p>
        </div>
        <button onClick={logout} style={{ width:"100%", background:"#0f2a55", border:"1px solid #2a5490", borderRadius:6, padding:"10px", color:"#93b4d4", fontSize:13, cursor:"pointer" }}>Sign Out</button>
      </div>
    </>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* CSS for responsive */}
      <style>{`
        @media (max-width: 768px) { .desktop-sidebar { display: none !important; } }
        @media (min-width: 769px) { .mobile-topbar { display: none !important; } .hamburger-btn { display: none !important; } }
      `}</style>

      {/* Mobile top bar */}
      <div style={{ background:"#1a3a6b", padding:"0 16px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={()=>setNavOpen(o=>!o)} style={{ background:"none", border:"none", color:"#fff", fontSize:22, cursor:"pointer", padding:4 }}>☰</button>
          <div style={{ color:"#fff", fontWeight:800, fontSize:15 }}>OEG PORTAL</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}>🔑 {user.full_name?.split(" ")[0]||user.username}</span>
        </div>
      </div>

      <div style={{ display:"flex", minHeight:"calc(100vh - 56px)" }}>
        {/* Sidebar - desktop only */}
        <div className="desktop-sidebar" style={{ width:240, background:"#1a3a6b", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <NavContent />
        </div>

        {/* Mobile nav drawer */}
        {navOpen && (
          <div style={{ position:"fixed", inset:0, zIndex:200 }}>
            <div onClick={()=>setNavOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:280, background:"#1a3a6b", display:"flex", flexDirection:"column", zIndex:201 }}>
              <NavContent />
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex:1, overflow:"auto" }}>
          <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h1 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1a2744" }}>{NAV.find(n=>n.id===page)?.label}</h1>
              {currentMonth && <p style={{ margin:0, fontSize:11, color:"#6b7a99" }}>{currentMonth.month_label}{currentMonth.is_locked&&<span style={{ marginLeft:6, color:"#f59e0b" }}>🔒</span>}</p>}
            </div>
          </div>
          <div style={{ padding:"16px 12px" }}>
            {page==="dashboard" && <DashboardPage currentMonth={currentMonth} months={months} onNavigateRatings={id=>{setRatingAreaId(id);setPage("ratings");}} />}
            {page==="ratings" && <RatingsPage currentMonth={currentMonth} initialAreaId={ratingAreaId} />}
            {page==="admin" && <AdminPage currentMonth={currentMonth} months={months} onMonthChange={loadMonths} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
function Layout() {
  const { user, logout, can } = useAuth();
  if (!user) return <LoginPage />;
  if (user.is_admin || can("can_manage_users") || can("can_manage_settings")) return <AdminLayout user={user} logout={logout} can={can} />;
  if (can("can_view_penalties") || can("can_export")) return <ViewerLayout user={user} logout={logout} />;
  return <RaterLayout user={user} logout={logout} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ style:{ background:"#1a3a6b", color:"#fff", borderRadius:8, fontSize:13 } }} />
      <Layout />
    </AuthProvider>
  );
}