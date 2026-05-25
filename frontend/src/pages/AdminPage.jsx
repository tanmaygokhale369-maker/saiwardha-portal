import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

const PERMS = [
  { key:"can_rate", label:"Rate Areas" },
  { key:"can_view_penalties", label:"View Penalties" },
  { key:"can_add_remarks", label:"Add Remarks" },
  { key:"can_export", label:"Export Data" },
  { key:"can_manage_users", label:"Manage Users" },
  { key:"can_manage_settings", label:"Manage Settings" },
  { key:"is_admin", label:"Full Admin" }
];

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,30,60,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(2px)" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:560, maxWidth:"90vw", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:"#1a2744" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#94a3b8" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"9px 12px", fontSize:14, color:"#1a2744", outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
const btnP = { padding:"9px 20px", background:"#1a3a6b", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" };
const btnD = { padding:"9px 20px", background:"#fff", border:"1.5px solid #fecaca", borderRadius:8, color:"#dc2626", fontSize:13, fontWeight:600, cursor:"pointer" };
const btnS = { padding:"9px 20px", background:"#fff", border:"1.5px solid #bbf7d0", borderRadius:8, color:"#16a34a", fontSize:13, fontWeight:600, cursor:"pointer" };
const th = { padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.6, background:"#f8fafc", borderBottom:"1px solid #f1f5f9" };
const td = { padding:"12px 16px", fontSize:13, borderBottom:"1px solid #f8fafc" };
const card = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", marginBottom:20 };
const cardHead = { padding:"14px 24px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc", display:"flex", justifyContent:"space-between", alignItems:"center" };

export default function AdminPage({ currentMonth, months, onMonthChange }) {
  const { can, user } = useAuth();
  const [tab, setTab] = useState("users");
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [plantInfo, setPlantInfo] = useState({});
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  function load() {
    api.get("/users/roles").then(r => setRoles(r.data));
    if (can("can_manage_users")) api.get("/users/users").then(r => setUsers(r.data));
    api.get("/settings/plant-info").then(r => setPlantInfo(r.data));
    api.get("/areas").then(r => setAreas(r.data));
  }

  useEffect(() => { load(); }, []);
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function saveRole() {
    try {
      if (form.id) await api.put(`/users/roles/${form.id}`, form);
      else await api.post("/users/roles", form);
      toast.success("Role saved"); setModal(null); load();
    } catch(e) { toast.error(e.response?.data?.error || "Failed"); }
  }

  async function saveUser() {
    try {
      if (form.id) await api.put(`/users/users/${form.id}`, form);
      else await api.post("/users/users", form);
      toast.success("User saved"); setModal(null); load();
    } catch(e) { toast.error(e.response?.data?.error || "Failed"); }
  }

  async function savePlant() {
    try { await api.put("/settings/plant-info", plantInfo); toast.success("Plant info saved"); }
    catch { toast.error("Failed"); }
  }

  async function createMonth() {
    if (!form.month_label || !form.month_date) { toast.error("Fill all fields"); return; }
    try { await api.post("/months", form); toast.success("New month created"); setModal(null); onMonthChange(); }
    catch(e) { toast.error(e.response?.data?.error || "Failed"); }
  }

  async function toggleLock(m) {
    try {
      if (m.is_locked) await api.put(`/months/${m.id}/unlock`);
      else await api.put(`/months/${m.id}/lock`);
      toast.success(m.is_locked ? "Month unlocked" : "Month locked");
      onMonthChange();
    } catch { toast.error("Failed"); }
  }

  const tabs = [
    { id:"users", label:"👤 Users", show: can("can_manage_users") },
    { id:"roles", label:"🔑 Roles", show: user?.is_admin },
    { id:"months", label:"📅 Months", show: user?.is_admin },
    { id:"settings", label:"⚙ Settings", show: user?.is_admin }
  ].filter(t => t.show);

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:24, background:"#fff", padding:6, borderRadius:10, border:"1px solid #e2e8f0", width:"fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"8px 18px", borderRadius:7, border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
            background: tab===t.id ? "#1a3a6b" : "transparent",
            color: tab===t.id ? "#fff" : "#6b7a99"
          }}>{t.label}</button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab==="users" && (
        <div style={card}>
          <div style={cardHead}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1a2744" }}>User Management</h3>
            <button style={btnP} onClick={() => { setForm({}); setModal("user"); }}>+ New User</button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["Username","Full Name","Role","Assigned Area","Status","Actions"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                return (
                  <tr key={u.id} style={{ borderBottom:"1px solid #f8fafc" }}>
                    <td style={{ ...td, fontWeight:700, color:"#1a2744" }}>{u.username}</td>
                    <td style={{ ...td, color:"#374151" }}>{u.full_name || "—"}</td>
                    <td style={td}>
                      <span style={{ padding:"3px 10px", borderRadius:20, background:"#eef4ff", color:"#1a3a6b", fontSize:12, fontWeight:600, border:"1px solid #bdd0f0" }}>
                        {u.role_name || "—"}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize:12, color:"#374151" }}>
                      {u.assigned_areas
                        ? u.assigned_areas.split(",").filter(Boolean).map(id => {
                            const a = areas.find(x => x.id === parseInt(id));
                            return a ? `${a.area_number}.${a.area_name.substring(0,15)}` : "";
                          }).filter(Boolean).join(", ")
                        : "—"}
                    </td>
                    <td style={td}>
                      <span style={{ color: u.is_active ? "#16a34a" : "#dc2626", fontWeight:600, fontSize:13 }}>
                        {u.is_active ? "● Active" : "● Inactive"}
                      </span>
                    </td>
                    <td style={{ ...td, display:"flex", gap:8 }}>
                      <button style={{ ...btnP, padding:"6px 14px" }} onClick={() => { setForm({...u, password:""}); setModal("user"); }}>Edit</button>
                      {u.id !== user.id && (
                        <button style={{ ...btnD, padding:"6px 14px" }} onClick={async () => {
                          if(window.confirm("Deactivate this user?")) {
                            await api.delete(`/users/users/${u.id}`);
                            toast.success("Deactivated");
                            load();
                          }
                        }}>Deactivate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ROLES TAB */}
      {tab==="roles" && user?.is_admin && (
        <div style={card}>
          <div style={cardHead}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1a2744" }}>Role Management</h3>
            <button style={btnP} onClick={() => { setForm({}); setModal("role"); }}>+ New Role</button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>{["Role", ...PERMS.map(p=>p.label), "Actions"].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id} style={{ borderBottom:"1px solid #f8fafc" }}>
                  <td style={{ ...td, fontWeight:700, color:"#1a2744" }}>{r.name}</td>
                  {PERMS.map(p => (
                    <td key={p.key} style={{ ...td, textAlign:"center" }}>
                      {r[p.key] ? <span style={{ color:"#16a34a", fontSize:16, fontWeight:700 }}>✓</span> : <span style={{ color:"#e2e8f0" }}>—</span>}
                    </td>
                  ))}
                  <td style={{ ...td, display:"flex", gap:8 }}>
                    <button style={{ ...btnP, padding:"6px 14px" }} onClick={() => { setForm({...r}); setModal("role"); }}>Edit</button>
                    <button style={{ ...btnD, padding:"6px 14px" }} onClick={async () => {
                      try { await api.delete(`/users/roles/${r.id}`); toast.success("Deleted"); load(); }
                      catch(e) { toast.error(e.response?.data?.error || "Cannot delete"); }
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MONTHS TAB */}
      {tab==="months" && user?.is_admin && (
        <div style={card}>
          <div style={cardHead}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1a2744" }}>Assessment Months</h3>
            <button style={btnP} onClick={() => { setForm({}); setModal("month"); }}>+ New Month</button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>{["Month","Date","Current","Lock Status","Actions"].map(h=><th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.id} style={{ borderBottom:"1px solid #f8fafc" }}>
                  <td style={{ ...td, fontWeight: m.is_current?700:400, color:"#1a2744" }}>{m.month_label}</td>
                  <td style={{ ...td, color:"#6b7a99" }}>{m.month_date?.split("T")[0]}</td>
                  <td style={td}>{m.is_current ? <span style={{ color:"#16a34a", fontWeight:700 }}>★ Active</span> : <span style={{ color:"#94a3b8" }}>—</span>}</td>
                  <td style={td}>
                    <span style={{ padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600,
                      background: m.is_locked?"#fef2f2":"#f0fdf4",
                      color: m.is_locked?"#dc2626":"#16a34a",
                      border:`1px solid ${m.is_locked?"#fecaca":"#bbf7d0"}`
                    }}>
                      {m.is_locked ? "🔒 Locked" : "🔓 Open"}
                    </span>
                  </td>
                  <td style={td}>
                    <button style={m.is_locked ? btnS : btnD} onClick={() => toggleLock(m)}>
                      {m.is_locked ? "Unlock" : "Lock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab==="settings" && user?.is_admin && (
        <div style={card}>
          <div style={cardHead}><h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1a2744" }}>Plant Information</h3></div>
          <div style={{ padding:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {[
              { k:"package_name", label:"Package Name" },
              { k:"benchmark", label:"Benchmark Grade", type:"number" },
              { k:"key_deliverable_no", label:"Key Deliverable No." },
              { k:"grade", label:"Grade Label" },
              { k:"sla_description", label:"SLA Description" }
            ].map(f => (
              <div key={f.k}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>{f.label}</label>
                <input type={f.type||"text"} style={inp} value={plantInfo[f.k]||""} onChange={e => setPlantInfo(p => ({ ...p, [f.k]: f.type==="number" ? parseFloat(e.target.value) : e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ padding:"0 24px 24px" }}>
            <button style={btnP} onClick={savePlant}>Save Plant Info</button>
          </div>
        </div>
      )}

      {/* MODAL: Role */}
      {modal==="role" && (
        <Modal title={form.id ? "Edit Role" : "New Role"} onClose={() => setModal(null)}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Role Name</label>
            <input style={inp} value={form.name||""} onChange={e=>setF("name",e.target.value)} placeholder="e.g. Area Inspector" />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:10 }}>Permissions</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {PERMS.map(p => (
                <label key={p.key} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"8px 12px", borderRadius:8, border:`1px solid ${form[p.key]?"#bdd0f0":"#e2e8f0"}`, background:form[p.key]?"#eef4ff":"#fff" }}>
                  <input type="checkbox" checked={!!form[p.key]} onChange={e=>setF(p.key,e.target.checked?1:0)} />
                  <span style={{ fontSize:13, color:"#374151" }}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={btnP} onClick={saveRole}>Save Role</button>
            <button style={btnD} onClick={() => setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* MODAL: User */}
      {modal==="user" && (
        <Modal title={form.id ? "Edit User" : "New User"} onClose={() => setModal(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Username</label>
              <input style={{ ...inp, background:form.id?"#f8fafc":"#fff" }} value={form.username||""} onChange={e=>setF("username",e.target.value)} disabled={!!form.id} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>{form.id?"New Password (optional)":"Password"}</label>
              <input type="password" style={inp} value={form.password||""} onChange={e=>setF("password",e.target.value)} placeholder={form.id?"Leave blank to keep":"Min 6 chars"} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Full Name</label>
              <input style={inp} value={form.full_name||""} onChange={e=>setF("full_name",e.target.value)} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Role</label>
              <select style={inp} value={form.role_id||""} onChange={e=>setF("role_id",parseInt(e.target.value))}>
                <option value="">Select role…</option>
                {roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>
                Assigned Areas <span style={{ color:"#94a3b8", fontWeight:400 }}>(select multiple for Raters)</span>
              </label>
              <div style={{ border:"1.5px solid #e2e8f0", borderRadius:8, maxHeight:200, overflowY:"auto", background:"#fff" }}>
                {areas.map(a => {
                  const currentAreas = (form.assigned_areas||"").split(",").filter(Boolean).map(Number);
                  const checked = currentAreas.includes(a.id);
                  return (
                    <label key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", cursor:"pointer", borderBottom:"1px solid #f1f5f9", background:checked?"#eef4ff":"transparent" }}>
                      <input type="checkbox" checked={checked} onChange={e => {
                        const cur = (form.assigned_areas||"").split(",").filter(Boolean).map(Number);
                        const next = e.target.checked ? [...cur, a.id] : cur.filter(x => x !== a.id);
                        setF("assigned_areas", next.join(","));
                      }} />
                      <span style={{ fontSize:13, color:checked?"#1a3a6b":"#374151", fontWeight:checked?600:400 }}>
                        {a.area_number}. {a.area_name}{a.in_charge ? ` — ${a.in_charge}` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
              {form.assigned_areas && (
                <p style={{ margin:"6px 0 0", fontSize:12, color:"#6b7a99" }}>
                  {(form.assigned_areas).split(",").filter(Boolean).length} area(s) selected
                  <button onClick={()=>setF("assigned_areas","")} style={{ marginLeft:8, background:"none", border:"none", color:"#dc2626", fontSize:11, cursor:"pointer" }}>Clear all</button>
                </p>
              )}
            </div>
            {form.id && (
              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Status</label>
                <select style={inp} value={form.is_active?1:0} onChange={e=>setF("is_active",parseInt(e.target.value))}>
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={btnP} onClick={saveUser}>Save User</button>
            <button style={btnD} onClick={() => setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* MODAL: Month */}
      {modal==="month" && (
        <Modal title="Start New Assessment Month" onClose={() => setModal(null)}>
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"12px 16px", marginBottom:20, fontSize:13, color:"#92400e" }}>
            ⚠ Creating a new month will <strong>lock the current month</strong>. Previous data becomes read-only.
          </div>
          <div style={{ display:"grid", gap:16, marginBottom:20 }}>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Month Label</label>
              <input style={inp} value={form.month_label||""} onChange={e=>setF("month_label",e.target.value)} placeholder="e.g. June 2026" />
            </div>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Month Date</label>
              <input type="date" style={inp} value={form.month_date||""} onChange={e=>setF("month_date",e.target.value)} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={btnP} onClick={createMonth}>Create Month</button>
            <button style={btnD} onClick={() => setModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}