import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("select");
  const [form, setForm] = useState({ username:"", password:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!form.username || !form.password) { setErr("Enter username and password"); return; }
    setLoading(true); setErr("");
    try {
      const user = await login(form.username, form.password);
      if (mode==="admin" && !user.is_admin && !user.can_manage_users) { setErr("No admin access."); setLoading(false); return; }
      toast.success("Welcome!");
    } catch(e) { setErr(e.response?.data?.error || "Invalid credentials"); }
    finally { setLoading(false); }
  }

  const modeConfig = {
    admin: { color:"#1a3a6b", label:"Admin", icon:"🔑", desc:"Full administrative control" },
    viewer: { color:"#1e4d8c", label:"Viewer", icon:"👁️", desc:"View dashboard and ratings" },
    rater: { color:"#0f766e", label:"Rater", icon:"⭐", desc:"Enter weekly housekeeping grades" },
  };

  if (mode==="select") return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif", padding:20 }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ width:56, height:56, background:"#f59e0b", borderRadius:14, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:12 }}>⚙</div>
        <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:"#1a2744" }}>SAI WARDHA</h1>
        <p style={{ margin:0, fontSize:12, color:"#6b7a99", textTransform:"uppercase", letterSpacing:1 }}>Power Generation Pvt Ltd · KD3 Portal</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:340 }}>
        {[
          { mode:"admin", icon:"🔑", label:"Admin Login", desc:"Manage users, months, view all data", color:"#1a3a6b", btnColor:"#f59e0b", btnText:"#1a2744" },
          { mode:"viewer", icon:"👁️", label:"Viewer Login", desc:"View dashboard & ratings (read only)", color:"#1e4d8c", btnColor:"#fff", btnText:"#1e4d8c" },
          { mode:"rater", icon:"⭐", label:"Rater Login", desc:"Enter weekly housekeeping grades", color:"#0f766e", btnColor:"#fff", btnText:"#0f766e" },
        ].map(c => (
          <button key={c.mode} onClick={()=>setMode(c.mode)} style={{
            background:"#fff", border:`2px solid ${c.color}22`, borderRadius:14, padding:"16px 20px",
            cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14,
            boxShadow:"0 2px 12px rgba(0,0,0,0.06)", transition:"all 0.15s"
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=c.color}
          onMouseLeave={e=>e.currentTarget.style.borderColor=`${c.color}22`}>
            <div style={{ width:44, height:44, background:c.color, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{c.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#1a2744", marginBottom:2 }}>{c.label}</div>
              <div style={{ fontSize:12, color:"#6b7a99" }}>{c.desc}</div>
            </div>
            <span style={{ color:c.color, fontSize:18 }}>→</span>
          </button>
        ))}
      </div>

      <p style={{ marginTop:24, fontSize:11, color:"#94a3b8" }}>Sai Wardha Housekeeping Quality Portal · KD3</p>
    </div>
  );

  const cfg = modeConfig[mode];
  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", flexDirection:"column", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:cfg.color, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>{setMode("select");setErr("");setForm({username:"",password:""});}} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:13, cursor:"pointer" }}>← Back</button>
        <div style={{ fontSize:22 }}>{cfg.icon}</div>
        <div>
          <div style={{ color:"#fff", fontWeight:800, fontSize:16 }}>SAI WARDHA — {cfg.label}</div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>{cfg.desc}</div>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ width:"100%", maxWidth:380, background:"#fff", borderRadius:16, padding:"28px 24px", boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin:"0 0 6px", fontSize:20, fontWeight:700, color:"#1a2744" }}>Sign in</h2>
          <p style={{ margin:"0 0 24px", fontSize:13, color:"#6b7a99" }}>Enter your credentials to continue</p>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Username</label>
            <input value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              placeholder="Enter username" autoCapitalize="none" autoCorrect="off"
              style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"12px 14px", fontSize:16, color:"#1a2744", outline:"none", boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor=cfg.color} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Password</label>
            <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              placeholder="••••••••"
              style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"12px 14px", fontSize:16, color:"#1a2744", outline:"none", boxSizing:"border-box" }}
              onFocus={e=>e.target.style.borderColor=cfg.color} onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
          </div>

          {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:16, color:"#dc2626", fontSize:13 }}>⚠ {err}</div>}

          <button onClick={handleLogin} disabled={loading} style={{ width:"100%", background:cfg.color, border:"none", borderRadius:10, padding:"14px", color:"#fff", fontSize:16, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
            {loading ? "Signing in…" : `Sign In as ${cfg.label} →`}
          </button>

          {mode==="admin" && (
            <div style={{ marginTop:20, padding:"12px 16px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>
              <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase" }}>Default</p>
              <p style={{ margin:0, fontSize:13, color:"#475569" }}>admin / admin123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}