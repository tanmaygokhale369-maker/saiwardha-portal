import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("select"); // "select" | "admin" | "rater"
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!form.username || !form.password) { setErr("Enter username and password"); return; }
    setLoading(true); setErr("");
    try {
      const user = await login(form.username, form.password);
      // Validate role matches selected mode
      if (mode === "admin" && !user.is_admin && !user.can_manage_users) {
        setErr("This account does not have admin access.");
        setLoading(false);
        return;
      }
      if (mode === "rater" && user.is_admin) {
        setErr("Admins should use the Admin Login.");
        setLoading(false);
        return;
      }
      toast.success("Welcome!");
    } catch (e) {
      setErr(e.response?.data?.error || "Invalid credentials");
    } finally { setLoading(false); }
  }

  // Selection screen
  if (mode === "select") {
    return (
      <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ width:60, height:60, background:"#f59e0b", borderRadius:16, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:16 }}>⚙</div>
          <h1 style={{ margin:"0 0 6px", fontSize:26, fontWeight:800, color:"#1a2744" }}>SAI WARDHA</h1>
          <p style={{ margin:0, fontSize:13, color:"#6b7a99", letterSpacing:1, textTransform:"uppercase" }}>Power Generation Pvt Ltd — KD3 Portal</p>
        </div>

        {/* Two cards */}
        <div style={{ display:"flex", gap:24, flexWrap:"wrap", justifyContent:"center" }}>
          {/* Admin card */}
          <div
            onClick={() => setMode("admin")}
            style={{ width:260, background:"#1a3a6b", borderRadius:16, padding:"32px 28px", cursor:"pointer", textAlign:"center", boxShadow:"0 8px 32px rgba(26,58,107,0.25)", transition:"transform 0.15s", position:"relative", overflow:"hidden" }}
            onMouseEnter={e => e.currentTarget.style.transform="translateY(-4px)"}
            onMouseLeave={e => e.currentTarget.style.transform="translateY(0)"}
          >
            <div style={{ fontSize:48, marginBottom:16 }}>🔑</div>
            <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#fff" }}>Admin Login</h2>
            <p style={{ margin:"0 0 24px", fontSize:13, color:"#93b4d4", lineHeight:1.6 }}>
              Full control — manage users, months, settings, view all reports & penalties
            </p>
            <div style={{ background:"#f59e0b", borderRadius:8, padding:"10px 20px", color:"#1a2744", fontWeight:700, fontSize:14 }}>
              Login as Admin →
            </div>
          </div>

          {/* Rater card */}
          <div
            onClick={() => setMode("rater")}
            style={{ width:260, background:"#fff", border:"2px solid #e2e8f0", borderRadius:16, padding:"32px 28px", cursor:"pointer", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", transition:"transform 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.borderColor="#1a3a6b"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.borderColor="#e2e8f0"; }}
          >
            <div style={{ fontSize:48, marginBottom:16 }}>⭐</div>
            <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#1a2744" }}>Rater Login</h2>
            <p style={{ margin:"0 0 24px", fontSize:13, color:"#6b7a99", lineHeight:1.6 }}>
              Rate housekeeping quality for assigned plant areas each week
            </p>
            <div style={{ background:"#1a3a6b", borderRadius:8, padding:"10px 20px", color:"#fff", fontWeight:700, fontSize:14 }}>
              Login as Rater →
            </div>
          </div>
        </div>

        <p style={{ marginTop:32, fontSize:12, color:"#94a3b8" }}>
          Sai Wardha Housekeeping Quality Portal · KD3
        </p>
      </div>
    );
  }

  // Login form
  const isAdmin = mode === "admin";
  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Left panel */}
      <div style={{ width:"45%", background: isAdmin ? "#1a3a6b" : "#0f766e", display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 64px" }}>
        <button
          onClick={() => { setMode("select"); setErr(""); setForm({ username:"", password:"" }); }}
          style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.3)", borderRadius:8, padding:"8px 16px", color:"rgba(255,255,255,0.8)", fontSize:13, cursor:"pointer", marginBottom:40, width:"fit-content" }}
        >
          ← Back
        </button>
        <div style={{ fontSize:48, marginBottom:20 }}>{isAdmin ? "🔑" : "⭐"}</div>
        <h1 style={{ color:"#fff", fontSize:28, fontWeight:800, margin:"0 0 12px" }}>
          {isAdmin ? "Admin Portal" : "Rater Portal"}
        </h1>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:14, lineHeight:1.8, margin:"0 0 32px" }}>
          {isAdmin
            ? "Full administrative access to manage users, assessment months, plant settings and view all performance data."
            : "Enter your weekly housekeeping grades for your assigned plant areas. Once saved, ratings are locked."
          }
        </p>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.2)", paddingTop:28 }}>
          {isAdmin ? (
            <>
              {[
                "Manage users & roles",
                "Lock/unlock assessment months",
                "View penalties & export reports",
                "Edit plant settings"
              ].map(t => (
                <div key={t} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <span style={{ color:"#f59e0b", fontSize:16 }}>✓</span>
                  <span style={{ color:"rgba(255,255,255,0.8)", fontSize:13 }}>{t}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                "Rate assigned plant areas",
                "Enter grades for all 4 weeks",
                "Add OEG & general remarks",
                "Ratings lock after submission"
              ].map(t => (
                <div key={t} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <span style={{ color:"#f59e0b", fontSize:16 }}>✓</span>
                  <span style={{ color:"rgba(255,255,255,0.8)", fontSize:13 }}>{t}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:48 }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          <div style={{ marginBottom:32 }}>
            <span style={{ display:"inline-block", padding:"4px 12px", borderRadius:20, background: isAdmin ? "#eef4ff" : "#f0fdfa", color: isAdmin ? "#1a3a6b" : "#0f766e", fontSize:12, fontWeight:700, marginBottom:16, border: `1px solid ${isAdmin ? "#bdd0f0" : "#99f6e4"}` }}>
              {isAdmin ? "🔑 ADMINISTRATOR" : "⭐ RATER"}
            </span>
            <h2 style={{ fontSize:24, fontWeight:700, color:"#1a2744", margin:"0 0 6px" }}>Sign in</h2>
            <p style={{ color:"#6b7a99", fontSize:14, margin:0 }}>Enter your credentials to continue</p>
          </div>

          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Username</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter username"
              style={{ width:"100%", border:"1.5px solid #d1d9e6", borderRadius:8, padding:"11px 14px", fontSize:14, color:"#1a2744", outline:"none", boxSizing:"border-box", background:"#fff" }}
              onFocus={e => e.target.style.borderColor = isAdmin ? "#1a3a6b" : "#0f766e"}
              onBlur={e => e.target.style.borderColor="#d1d9e6"}
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
              style={{ width:"100%", border:"1.5px solid #d1d9e6", borderRadius:8, padding:"11px 14px", fontSize:14, color:"#1a2744", outline:"none", boxSizing:"border-box", background:"#fff" }}
              onFocus={e => e.target.style.borderColor = isAdmin ? "#1a3a6b" : "#0f766e"}
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
            style={{ width:"100%", background: isAdmin ? "#1a3a6b" : "#0f766e", border:"none", borderRadius:8, padding:"13px", color:"#fff", fontSize:15, fontWeight:700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in…" : `Sign In as ${isAdmin ? "Admin" : "Rater"} →`}
          </button>

          {isAdmin && (
            <div style={{ marginTop:24, padding:"14px 18px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>
              <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.5 }}>Default Admin</p>
              <p style={{ margin:0, fontSize:13, color:"#475569" }}>admin / admin123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}