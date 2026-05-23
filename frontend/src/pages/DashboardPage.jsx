import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import { exportToExcel, exportToPDF } from "../utils/export";
import toast from "react-hot-toast";

function gradeColor(val, bm) {
  if (val === null || val === undefined) return { bg:"#f8fafc", text:"#94a3b8", border:"#e2e8f0" };
  if (val >= bm) return { bg:"#f0fdf4", text:"#16a34a", border:"#bbf7d0" };
  if (val >= bm - 0.3) return { bg:"#fffbeb", text:"#d97706", border:"#fde68a" };
  return { bg:"#fef2f2", text:"#dc2626", border:"#fecaca" };
}

function GradeBadge({ val, bm }) {
  if (val === null || val === undefined) return <span style={{ color:"#94a3b8", fontSize:13 }}>—</span>;
  const c = gradeColor(val, bm);
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, background:c.bg, color:c.text, border:`1px solid ${c.border}`, fontWeight:700, fontSize:12 }}>
      {val.toFixed(3)}
    </span>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"20px 24px", borderLeft:`4px solid ${color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:600, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.6 }}>{label}</p>
          <p style={{ margin:0, fontSize:28, fontWeight:800, color:"#1a2744", lineHeight:1 }}>{value}</p>
          {sub && <p style={{ margin:"6px 0 0", fontSize:12, color:"#94a3b8" }}>{sub}</p>}
        </div>
        <span style={{ fontSize:28, opacity:0.6 }}>{icon}</span>
      </div>
    </div>
  );
}

export default function DashboardPage({ currentMonth, onNavigateRatings }) {
  const { can } = useAuth();
  const [summary, setSummary] = useState(null);
  const [plantInfo, setPlantInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentMonth) return;
    setLoading(true);
    Promise.all([
      api.get(`/ratings/month/${currentMonth.id}/summary`),
      api.get("/settings/plant-info")
    ]).then(([s, p]) => { setSummary(s.data); setPlantInfo(p.data); })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, [currentMonth]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:16 }}>⚙</div>
        <p style={{ color:"#6b7a99", fontSize:15 }}>Loading dashboard…</p>
      </div>
    </div>
  );

  if (!summary) return (
    <div style={{ textAlign:"center", padding:80, color:"#94a3b8" }}>No data for this month.</div>
  );

  const { grand_avg, total_penalty, benchmark } = summary;
  const aboveCount = summary.summary.filter(a => a.monthly_avg !== null && a.monthly_avg >= benchmark).length;
  const belowCount = summary.summary.filter(a => a.monthly_avg !== null && a.monthly_avg < benchmark).length;
  const pendingCount = summary.summary.filter(a => a.monthly_avg === null).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:20, fontWeight:700, color:"#1a2744" }}>Performance Overview</h2>
          <p style={{ margin:0, fontSize:13, color:"#6b7a99" }}>
            {plantInfo?.package_name || "SWPGPL Plant"} · Benchmark: <strong style={{ color:"#1a3a6b" }}>{benchmark}</strong>
          </p>
        </div>
        {can("can_export") && (
          <div style={{ display:"flex", gap:8 }}>
            <button
              onClick={() => { try { exportToExcel(summary, currentMonth?.month_label, plantInfo); toast.success("Excel downloaded!"); } catch { toast.error("Export failed"); } }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#fff", border:"1.5px solid #16a34a", borderRadius:8, color:"#16a34a", fontSize:13, fontWeight:600, cursor:"pointer" }}
            >
              📥 Excel
            </button>
            <button
              onClick={() => { try { exportToPDF(summary, currentMonth?.month_label, plantInfo); toast.success("PDF downloaded!"); } catch { toast.error("Export failed"); } }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#fff", border:"1.5px solid #dc2626", borderRadius:8, color:"#dc2626", fontSize:13, fontWeight:600, cursor:"pointer" }}
            >
              📄 PDF
            </button>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16, marginBottom:28 }}>
        <StatCard label="Grand Monthly Avg" value={grand_avg ? grand_avg.toFixed(3) : "—"} sub={`vs benchmark ${benchmark}`} color={grand_avg >= benchmark ? "#16a34a" : "#dc2626"} icon="📊" />
        <StatCard label="Total Areas" value={summary.summary.length} sub="plant areas" color="#1a3a6b" icon="🏭" />
        <StatCard label="Above Benchmark" value={aboveCount} sub="areas passing" color="#16a34a" icon="✅" />
        <StatCard label="Below Benchmark" value={belowCount} sub="areas failing" color="#dc2626" icon="⚠️" />
        {can("can_view_penalties") && <StatCard label="Total Penalty" value={`₹${(total_penalty || 0).toFixed(0)}`} sub="this month" color="#f59e0b" icon="💰" />}
        {!can("can_view_penalties") && <StatCard label="Pending" value={pendingCount} sub="not yet rated" color="#94a3b8" icon="⏳" />}
      </div>

      {/* Progress bar */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"16px 24px", marginBottom:24, display:"flex", alignItems:"center", gap:16 }}>
        <span style={{ fontSize:13, fontWeight:600, color:"#374151", whiteSpace:"nowrap" }}>Completion</span>
        <div style={{ flex:1, height:8, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${((aboveCount+belowCount)/summary.summary.length*100).toFixed(0)}%`, background:"linear-gradient(90deg,#1a3a6b,#3b72c0)", borderRadius:4, transition:"width 0.5s" }} />
        </div>
        <span style={{ fontSize:13, color:"#6b7a99", whiteSpace:"nowrap" }}>{aboveCount+belowCount}/{summary.summary.length} rated</span>
        <span style={{ fontSize:12, padding:"3px 10px", borderRadius:20, background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0", fontWeight:600 }}>
          {((aboveCount/(aboveCount+belowCount||1))*100).toFixed(0)}% passing
        </span>
      </div>

      {/* Areas table */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"16px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#1a2744" }}>Area-wise Performance</h3>
          <div style={{ display:"flex", gap:16, fontSize:12 }}>
            <span style={{ color:"#16a34a", fontWeight:600 }}>● Pass: {aboveCount}</span>
            <span style={{ color:"#dc2626", fontWeight:600 }}>● Fail: {belowCount}</span>
            <span style={{ color:"#94a3b8", fontWeight:600 }}>● Pending: {pendingCount}</span>
          </div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f8fafc" }}>
                {["#","Area","In-Charge","Wk 1","Wk 2","Wk 3","Wk 4","Monthly Avg","Status",...(can("can_view_penalties")?["Penalty"]:[])].map(h => (
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.6, borderBottom:"1px solid #f1f5f9", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.summary.map((area, i) => {
                const m = area.monthly_avg;
                const status = m === null ? "pending" : m >= benchmark ? "pass" : "fail";
                const statusBadge = {
                  pass: { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0", label:"✓ Pass" },
                  fail: { bg:"#fef2f2", color:"#dc2626", border:"#fecaca", label:"✗ Fail" },
                  pending: { bg:"#f8fafc", color:"#94a3b8", border:"#e2e8f0", label:"Pending" }
                }[status];
                return (
                  <tr key={area.area_id}
                    style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer", transition:"background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background=""}
                    onClick={() => onNavigateRatings(area.area_id)}>
                    <td style={{ padding:"12px 16px", fontSize:13, color:"#94a3b8", fontWeight:500 }}>{area.area_number}</td>
                    <td style={{ padding:"12px 16px", fontSize:13, color:"#1a2744", fontWeight:600, maxWidth:200 }}>{area.area_name}</td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:"#6b7a99" }}>{area.in_charge || "—"}</td>
                    {[1,2,3,4].map(w => (
                      <td key={w} style={{ padding:"12px 16px" }}>
                        <GradeBadge val={area.week_data.find(x=>x.week===w)?.avg} bm={benchmark} />
                      </td>
                    ))}
                    <td style={{ padding:"12px 16px" }}><GradeBadge val={m} bm={benchmark} /></td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ display:"inline-block", padding:"4px 10px", borderRadius:20, background:statusBadge.bg, color:statusBadge.color, border:`1px solid ${statusBadge.border}`, fontSize:12, fontWeight:700 }}>
                        {statusBadge.label}
                      </span>
                    </td>
                    {can("can_view_penalties") && (
                      <td style={{ padding:"12px 16px", fontSize:13, color: area.penalty > 0 ? "#dc2626" : "#94a3b8", fontWeight: area.penalty > 0 ? 700 : 400 }}>
                        {area.penalty > 0 ? `₹${area.penalty.toFixed(2)}` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:"#f0f4f8", borderTop:"2px solid #e2e8f0" }}>
                <td colSpan={3} style={{ padding:"12px 16px", fontWeight:800, fontSize:14, color:"#1a2744" }}>Grand Total</td>
                {[1,2,3,4].map(w => {
                  const avgs = summary.summary.map(a=>a.week_data.find(x=>x.week===w)?.avg).filter(v=>v!=null);
                  const g = avgs.length ? avgs.reduce((s,n)=>s+n,0)/avgs.length : null;
                  return <td key={w} style={{ padding:"12px 16px" }}><GradeBadge val={g} bm={benchmark} /></td>;
                })}
                <td style={{ padding:"12px 16px" }}><GradeBadge val={grand_avg} bm={benchmark} /></td>
                <td></td>
                {can("can_view_penalties") && (
                  <td style={{ padding:"12px 16px", fontWeight:800, color:"#dc2626", fontSize:14 }}>₹{(total_penalty||0).toFixed(2)}</td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}