import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!form.username || !form.password) { setErr("Enter username and password"); return; }
    setLoading(true); setErr("");
    try {
      await login(form.username, form.password);
      toast.success("Welcome!");
    } catch (e) {
      setErr(e.response?.data?.error || "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Left panel */}
      <div style={{ width:"45%", background:"#1a3a6b", display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 64px" }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
            <div style={{ width:44, height:44, background:"#f59e0b", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>⚙</div>
            <div>
              <div style={{ color:"#fff", fontWeight:800, fontSize:20, letterSpacing:"-0.3px" }}>SAI WARDHA</div>
              <div style={{ color:"#93b4d4", fontSize:12, letterSpacing:1 }}>POWER GENERATION PVT LTD</div>
            </div>
          </div>
          <h1 style={{ color:"#fff", fontSize:32, fontWeight:700, lineHeight:1.2, margin:"0 0 16px" }}>
            Housekeeping<br />Quality Portal
          </h1>
          <p style={{ color:"#93b4d4", fontSize:15, lineHeight:1.7, margin:0 }}>
            KD3 — Track, rate and monitor housekeeping standards across all plant areas with weekly and monthly performance metrics.
          </p>
        </div>
        <div style={{ borderTop:"1px solid #2a5490", paddingTop:32 }}>
          {[
            { icon:"📊", text:"Real-time weekly & monthly averages" },
            { icon:"🏭", text:"20 plant areas with sub-area tracking" },
            { icon:"📄", text:"Export to Excel & PDF instantly" },
          ].map(f => (
            <div key={f.text} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <span style={{ fontSize:18 }}>{f.icon}</span>
              <span style={{ color:"#b8d0e8", fontSize:14 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:48 }}>
        <div style={{ width:"100%", maxWidth:420 }}>
          <h2 style={{ fontSize:26, fontWeight:700, color:"#1a2744", margin:"0 0 8px" }}>Sign in</h2>
          <p style={{ color:"#6b7a99", fontSize:14, margin:"0 0 36px" }}>Enter your credentials to access the portal</p>

          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Username</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter username"
              style={{ width:"100%", border:"1.5px solid #d1d9e6", borderRadius:8, padding:"11px 14px", fontSize:14, color:"#1a2744", outline:"none", boxSizing:"border-box", background:"#fff", transition:"border 0.2s" }}
              onFocus={e => e.target.style.borderColor="#1a3a6b"}
              onBlur={e => e.target.style.borderColor="#d1d9e6"}
            />
          </div>
          <div style={{ marginBottom:28 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              style={{ width:"100%", border:"1.5px solid #d1d9e6", borderRadius:8, padding:"11px 14px", fontSize:14, color:"#1a2744", outline:"none", boxSizing:"border-box", background:"#fff" }}
              onFocus={e => e.target.style.borderColor="#1a3a6b"}
              onBlur={e => e.target.style.borderColor="#d1d9e6"}
            />
          </div>

          {err && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:20, color:"#dc2626", fontSize:13 }}>
              ⚠ {err}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width:"100%", background: loading ? "#6b8cc7" : "#1a3a6b", border:"none", borderRadius:8, padding:"13px", color:"#fff", fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", letterSpacing:0.3, transition:"background 0.2s" }}
            onMouseEnter={e => !loading && (e.target.style.background="#0f2a55")}
            onMouseLeave={e => !loading && (e.target.style.background="#1a3a6b")}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          <div style={{ marginTop:32, padding:"16px 20px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>
            <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>Default Credentials</p>
            <p style={{ margin:"0 0 4px", fontSize:13, color:"#475569" }}><strong>Admin:</strong> admin / admin123</p>
            <p style={{ margin:0, fontSize:13, color:"#475569" }}><strong>Viewer:</strong> viewer / view123</p>
          </div>
        </div>
      </div>
    </div>
  );
}