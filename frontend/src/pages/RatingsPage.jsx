import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

const WEEKS = [1,2,3,4];

function GradeInput({ value, onChange, disabled, benchmark }) {
  const v = value !== null && value !== undefined && value !== "" ? parseFloat(value) : null;
  const col = v === null ? "#94a3b8" : v >= benchmark ? "#16a34a" : v >= benchmark - 0.3 ? "#d97706" : "#dc2626";
  const bg = v === null ? "#fff" : v >= benchmark ? "#f0fdf4" : v >= benchmark - 0.3 ? "#fffbeb" : "#fef2f2";
  return (
    <input
      type="number" min="0" max="5" step="0.1"
      value={value === null || value === undefined ? "" : value}
      onChange={e => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
      disabled={disabled}
      style={{
        width:70, padding:"7px 8px", textAlign:"center", borderRadius:8, fontSize:14, fontWeight:700,
        background: disabled ? "#f8fafc" : bg,
        border: `1.5px solid ${col}`,
        color: col, outline:"none",
        cursor: disabled ? "not-allowed" : "text",
        transition:"all 0.2s"
      }}
    />
  );
}

export default function RatingsPage({ currentMonth, initialAreaId }) {
  const { can } = useAuth();
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(initialAreaId || null);
  const [ratingsData, setRatingsData] = useState({});
  const [remarks, setRemarks] = useState({});
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const canEdit = can("can_rate") && currentMonth && !currentMonth.is_locked;

  useEffect(() => {
    api.get("/areas").then(r => {
      setAreas(r.data);
      if (!selectedAreaId && r.data.length) setSelectedAreaId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!currentMonth) return;
    setLoading(true);
    api.get(`/ratings/month/${currentMonth.id}/summary`).then(r => {
      setSummary(r.data);
      const ratingMap = {};
      r.data.summary.forEach(area => {
        area.week_data.forEach(wd => {
          wd.grades.forEach(g => {
            ratingMap[`${area.area_id}_${g.sub_id}_${wd.week}`] = g.grade;
          });
        });
      });
      setRatingsData(ratingMap);
      const remarkMap = {};
      r.data.summary.forEach(area => {
        area.remarks?.forEach(rem => {
          remarkMap[`${area.area_id}_${rem.remark_type}`] = rem.remark_text;
        });
      });
      setRemarks(remarkMap);
    }).catch(() => toast.error("Failed to load ratings"))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const benchmark = summary?.benchmark || 3.5;

  function getRating(areaId, subId, week) { return ratingsData[`${areaId}_${subId}_${week}`] ?? null; }
  function setRating(areaId, subId, week, val) { setRatingsData(prev => ({ ...prev, [`${areaId}_${subId}_${week}`]: val })); }

  function getWeekAvg(areaId, week) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return null;
    const rows = area.sub_areas.length > 0 ? area.sub_areas : [{ id: 0 }];
    const vals = rows.map(s => getRating(areaId, s.id, week)).filter(v => v !== null && v !== "");
    if (!vals.length) return null;
    return vals.reduce((s,n) => s + parseFloat(n), 0) / vals.length;
  }

  function getMonthlyAvg(areaId) {
    const avgs = WEEKS.map(w => getWeekAvg(areaId, w)).filter(v => v !== null);
    if (!avgs.length) return null;
    return avgs.reduce((s,n) => s+n, 0) / avgs.length;
  }

  async function saveArea() {
    if (!canEdit || !selectedArea || !currentMonth) return;
    setSaving(true);
    try {
      const rows = selectedArea.sub_areas.length > 0 ? selectedArea.sub_areas : [{ id: null }];
      const ratings = [];
      rows.forEach(sub => {
        WEEKS.forEach(w => {
          ratings.push({ area_id: selectedAreaId, sub_area_id: sub.id || null, week_number: w, grade: getRating(selectedAreaId, sub.id || 0, w) });
        });
      });
      await api.post("/ratings/bulk", { month_id: currentMonth.id, ratings });
      if (can("can_add_remarks")) {
        await Promise.all([
          api.post("/remarks", { month_id: currentMonth.id, area_id: selectedAreaId, remark_type:"oeg", remark_text: remarks[`${selectedAreaId}_oeg`] || "" }),
          api.post("/remarks", { month_id: currentMonth.id, area_id: selectedAreaId, remark_type:"general", remark_text: remarks[`${selectedAreaId}_general`] || "" })
        ]);
      }
      toast.success("Ratings saved successfully!");
    } catch (e) {
      toast.error(e.response?.data?.error || "Save failed");
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}>
      <p style={{ color:"#6b7a99" }}>Loading ratings…</p>
    </div>
  );

  const monthlyAvg = selectedArea ? getMonthlyAvg(selectedAreaId) : null;
  const avgColor = monthlyAvg === null ? "#94a3b8" : monthlyAvg >= benchmark ? "#16a34a" : "#dc2626";

  return (
    <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
      {/* Area list sidebar */}
      <div style={{ width:220, flexShrink:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc" }}>
          <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.6 }}>Plant Areas</p>
        </div>
        <div style={{ maxHeight:"75vh", overflowY:"auto" }}>
          {areas.map(a => {
            const m = getMonthlyAvg(a.id);
            const dot = m === null ? "#cbd5e1" : m >= benchmark ? "#16a34a" : "#dc2626";
            const isSelected = selectedAreaId === a.id;
            return (
              <button key={a.id} onClick={() => setSelectedAreaId(a.id)} style={{
                width:"100%", textAlign:"left", padding:"10px 16px", border:"none", cursor:"pointer",
                background: isSelected ? "#eef4ff" : "transparent",
                borderLeft: isSelected ? "3px solid #1a3a6b" : "3px solid transparent",
                display:"flex", justifyContent:"space-between", alignItems:"center",
                transition:"all 0.1s"
              }}>
                <span style={{ fontSize:12, color: isSelected ? "#1a3a6b" : "#374151", fontWeight: isSelected ? 700 : 400, lineHeight:1.3 }}>
                  {a.area_number}. {a.area_name.length > 22 ? a.area_name.substring(0,22)+"…" : a.area_name}
                </span>
                <span style={{ width:8, height:8, borderRadius:"50%", background:dot, flexShrink:0, marginLeft:8 }}></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rating panel */}
      {selectedArea ? (
        <div style={{ flex:1 }}>
          {/* Area header */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"20px 24px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h2 style={{ margin:"0 0 4px", fontSize:17, fontWeight:700, color:"#1a2744" }}>{selectedArea.area_name}</h2>
              <p style={{ margin:0, fontSize:13, color:"#6b7a99" }}>
                In-Charge: <strong>{selectedArea.in_charge || "Not assigned"}</strong>
                &nbsp;·&nbsp; Benchmark: <strong style={{ color:"#1a3a6b" }}>{benchmark}</strong>
                {currentMonth?.is_locked && <span style={{ marginLeft:12, color:"#f59e0b", fontWeight:700 }}>🔒 Locked</span>}
              </p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ textAlign:"center", padding:"10px 20px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
                <p style={{ margin:"0 0 2px", fontSize:11, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.5 }}>Monthly Avg</p>
                <p style={{ margin:0, fontSize:24, fontWeight:800, color:avgColor }}>{monthlyAvg?.toFixed(3) || "—"}</p>
              </div>
              {canEdit && (
                <button onClick={saveArea} disabled={saving} style={{
                  padding:"10px 24px", background:"#1a3a6b", border:"none", borderRadius:8,
                  color:"#fff", fontSize:14, fontWeight:700, cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1
                }}>
                  {saving ? "Saving…" : "💾 Save"}
                </button>
              )}
            </div>
          </div>

          {/* Weekly avg summary row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
            {WEEKS.map(w => {
              const avg = getWeekAvg(selectedAreaId, w);
              const col = avg === null ? "#94a3b8" : avg >= benchmark ? "#16a34a" : avg >= benchmark - 0.3 ? "#d97706" : "#dc2626";
              const bg = avg === null ? "#f8fafc" : avg >= benchmark ? "#f0fdf4" : avg >= benchmark - 0.3 ? "#fffbeb" : "#fef2f2";
              return (
                <div key={w} style={{ background:bg, border:`1px solid ${col}40`, borderRadius:10, padding:"12px 16px", textAlign:"center" }}>
                  <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:col, textTransform:"uppercase", letterSpacing:0.5 }}>Week {w}</p>
                  <p style={{ margin:0, fontSize:20, fontWeight:800, color:col }}>{avg?.toFixed(3) || "—"}</p>
                </div>
              );
            })}
          </div>

          {/* Ratings table */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", marginBottom:16 }}>
            <div style={{ padding:"14px 24px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc" }}>
              <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.6 }}>
                {selectedArea.sub_areas.length > 0 ? "Sub-Area Grades" : "Area Grade"}
              </p>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  <th style={{ padding:"10px 24px", textAlign:"left", fontSize:11, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid #f1f5f9" }}>
                    {selectedArea.sub_areas.length > 0 ? "Sub-Area" : "Area"}
                  </th>
                  {WEEKS.map(w => (
                    <th key={w} style={{ padding:"10px 16px", textAlign:"center", fontSize:11, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid #f1f5f9" }}>
                      Week {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(selectedArea.sub_areas.length > 0 ? selectedArea.sub_areas : [{ id: null, name: "Overall Rating" }]).map((sub, si) => (
                  <tr key={sub.id || 0} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"12px 24px", fontSize:13, color:"#374151", fontWeight:500 }}>{sub.name}</td>
                    {WEEKS.map(w => (
                      <td key={w} style={{ padding:"10px 16px", textAlign:"center" }}>
                        <GradeInput
                          value={getRating(selectedAreaId, sub.id || 0, w)}
                          onChange={val => setRating(selectedAreaId, sub.id || 0, w, val)}
                          disabled={!canEdit}
                          benchmark={benchmark}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"20px 24px" }}>
            <p style={{ margin:"0 0 16px", fontSize:12, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.6 }}>Remarks</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {[{key:"oeg",label:"OEG Remark"},{key:"general",label:"General Remark"}].map(t => (
                <div key={t.key}>
                  <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>{t.label}</label>
                  <textarea
                    value={remarks[`${selectedAreaId}_${t.key}`] || ""}
                    onChange={e => setRemarks(prev => ({ ...prev, [`${selectedAreaId}_${t.key}`]: e.target.value }))}
                    disabled={!can("can_add_remarks") || currentMonth?.is_locked}
                    rows={3}
                    placeholder={`Enter ${t.label.toLowerCase()}…`}
                    style={{
                      width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8,
                      padding:"10px 12px", fontSize:13, color:"#374151", resize:"vertical",
                      boxSizing:"border-box", outline:"none", background: !can("can_add_remarks") ? "#f8fafc" : "#fff",
                      fontFamily:"inherit"
                    }}
                    onFocus={e => e.target.style.borderColor="#1a3a6b"}
                    onBlur={e => e.target.style.borderColor="#e2e8f0"}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", height:300, background:"#fff", borderRadius:12, border:"1px solid #e2e8f0" }}>
          <p style={{ color:"#94a3b8", fontSize:15 }}>Select an area from the left to start rating</p>
        </div>
      )}
    </div>
  );
}