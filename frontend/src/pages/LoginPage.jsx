import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username:"", password:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!form.username || !form.password) { setErr("Enter username and password"); return; }
    setLoading(true); setErr("");
    try {
      await login(form.username, form.password);
      toast.success("Welcome!");
    } catch(e) {
      setErr(e.response?.data?.error || "Invalid credentials");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0f4ff 0%,#e8f4f0 50%,#fef9f0 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif", padding:20 }}>

      {/* Logo + Title */}
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ marginBottom:12 }}>
          <img src="/oeg-logo.jpeg" alt="OEG India Logo"
            style={{ width:130, height:130, objectFit:"contain", background:"transparent" }}
          />
        </div>
        <h1 style={{ margin:"0 0 4px", fontSize:38, fontWeight:900, color:"#1a2744", letterSpacing:"-1px", lineHeight:1 }}>OEG INDIA</h1>
        <h2 style={{ margin:"0 0 12px", fontSize:13, fontWeight:600, color:"#1a3a6b", letterSpacing:"0.3px" }}>Sai Wardha Power Generation Pvt. Ltd.</h2>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#1a3a6b,#2563eb)", borderRadius:20, padding:"6px 20px" }}>
          <span style={{ color:"#f59e0b", fontSize:13 }}>⭐</span>
          <span style={{ color:"#fff", fontSize:12, fontWeight:700, letterSpacing:"0.8px" }}>KD3 HOUSEKEEPING PORTAL</span>
          <span style={{ color:"#f59e0b", fontSize:13 }}>⭐</span>
        </div>
      </div>

      {/* Login card */}
      <div style={{ width:"100%", maxWidth:420, background:"#fff", borderRadius:20, padding:"32px 28px", boxShadow:"0 8px 40px rgba(26,58,107,0.12)", border:"1px solid #e2e8f0" }}>
        <h3 style={{ margin:"0 0 6px", fontSize:22, fontWeight:700, color:"#1a2744" }}>Sign In</h3>
        <p style={{ margin:"0 0 24px", fontSize:13, color:"#6b7a99" }}>Enter your credentials provided by admin</p>

        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Username</label>
          <input
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter your username"
            autoCapitalize="none" autoCorrect="off"
            style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 14px", fontSize:15, color:"#1a2744", outline:"none", boxSizing:"border-box", transition:"border 0.2s" }}
            onFocus={e => e.target.style.borderColor="#1a3a6b"}
            onBlur={e => e.target.style.borderColor="#e2e8f0"}
          />
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 14px", fontSize:15, color:"#1a2744", outline:"none", boxSizing:"border-box", transition:"border 0.2s" }}
            onFocus={e => e.target.style.borderColor="#1a3a6b"}
            onBlur={e => e.target.style.borderColor="#e2e8f0"}
          />
        </div>

        {err && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", marginBottom:16, color:"#dc2626", fontSize:13 }}>
            ⚠ {err}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width:"100%", background:"linear-gradient(135deg,#1a3a6b,#2563eb)", border:"none", borderRadius:10, padding:"14px", color:"#fff", fontSize:16, fontWeight:700, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, letterSpacing:"0.3px" }}
        >
          {loading ? "Signing in…" : "Sign In →"}
        </button>

        <p style={{ margin:"20px 0 0", fontSize:12, color:"#94a3b8", textAlign:"center" }}>
          Contact your administrator for login credentials
        </p>
      </div>

      <p style={{ marginTop:24, fontSize:11, color:"#94a3b8" }}>© 2026 Sai Wardha Power Generation Pvt Ltd</p>
    </div>
  );
}