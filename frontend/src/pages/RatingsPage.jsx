import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

const WEEKS = [1,2,3,4];

function GradeInput({ value, onChange, disabled, locked, benchmark }) {
  const v = value !== null && value !== undefined && value !== "" ? parseFloat(value) : null;
  const col = locked ? "#94a3b8" : v===null ? "#94a3b8" : v>=benchmark ? "#16a34a" : v>=benchmark-0.3 ? "#d97706" : "#dc2626";
  const bg = locked ? "#f1f5f9" : v===null ? "#fff" : v>=benchmark ? "#f0fdf4" : v>=benchmark-0.3 ? "#fffbeb" : "#fef2f2";
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <input type="number" min="0" max="5" step="0.1"
        value={value===null||value===undefined?"":value}
        onChange={e => {
          if (locked||disabled) return;
          let val = e.target.value===""?null:parseFloat(e.target.value);
          if (val!==null && val>5) { val=5; toast.error("Max grade is 5"); }
          if (val!==null && val<0) val=0;
          onChange(val);
        }}
        disabled={disabled||locked}
        style={{ width:60, padding:"8px 4px", textAlign:"center", borderRadius:8, fontSize:14, fontWeight:700,
          background:locked?"#f1f5f9":disabled?"#f8fafc":bg,
          border:`1.5px solid ${locked?"#cbd5e1":col}`,
          color:locked?"#94a3b8":col, outline:"none",
          cursor:locked||disabled?"not-allowed":"text", WebkitAppearance:"none" }}
      />
      {locked && <span style={{ position:"absolute", top:-6, right:-6, fontSize:9, background:"#64748b", color:"#fff", borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center" }}>🔒</span>}
    </div>
  );
}

export default function RatingsPage({ currentMonth, initialAreaId }) {
  const { can, user } = useAuth();
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(initialAreaId||null);
  const [ratingsData, setRatingsData] = useState({});
  const [lockedData, setLockedData] = useState({});
  const [remarks, setRemarks] = useState({});
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAreaPicker, setShowAreaPicker] = useState(!initialAreaId);
  const canEdit = can("can_rate") && currentMonth && !currentMonth.is_locked;
  const isAdmin = user?.is_admin;

  useEffect(() => {
    api.get("/areas").then(r => {
      let allAreas = r.data;
      // If rater has assigned areas, filter to only those
      if (!isAdmin && user?.assigned_areas) {
        const assignedIds = user.assigned_areas.split(",").filter(Boolean).map(Number);
        if (assignedIds.length > 0) {
          allAreas = allAreas.filter(a => assignedIds.includes(a.id));
        }
      }
      setAreas(allAreas);
      if (!selectedAreaId && allAreas.length) setSelectedAreaId(allAreas[0].id);
    });
  }, []);

  useEffect(() => {
    if (!currentMonth) return;
    setLoading(true);
    api.get(`/ratings/month/${currentMonth.id}/summary`).then(r => {
      setSummary(r.data);
      const rMap={}, lMap={};
      r.data.summary.forEach(area => {
        area.week_data.forEach(wd => {
          wd.grades.forEach(g => {
            const key=`${area.area_id}_${g.sub_id}_${wd.week}`;
            rMap[key]=g.grade;
            lMap[key]=g.is_locked&&!isAdmin;
          });
        });
      });
      setRatingsData(rMap); setLockedData(lMap);
      const remMap={};
      r.data.summary.forEach(a => a.remarks?.forEach(rem => { remMap[`${a.area_id}_${rem.remark_type}`]=rem.remark_text; }));
      setRemarks(remMap);
    }).catch(()=>toast.error("Failed to load")).finally(()=>setLoading(false));
  }, [currentMonth, isAdmin]);

  const selectedArea = areas.find(a=>a.id===selectedAreaId);
  const benchmark = summary?.benchmark||3.5;

  function getRating(aId,sId,w){ return ratingsData[`${aId}_${sId}_${w}`]??null; }
  function isLocked(aId,sId,w){ return !!lockedData[`${aId}_${sId}_${w}`]; }
  function setRating(aId,sId,w,val){ if(isLocked(aId,sId,w)) return; setRatingsData(p=>({...p,[`${aId}_${sId}_${w}`]:val})); }

  function getWeekAvg(aId,w){
    const a=areas.find(x=>x.id===aId); if(!a) return null;
    const rows=a.sub_areas.length>0?a.sub_areas:[{id:0}];
    const vals=rows.map(s=>getRating(aId,s.id,w)).filter(v=>v!==null&&v!=="");
    return vals.length?vals.reduce((s,n)=>s+parseFloat(n),0)/vals.length:null;
  }
  function getMonthlyAvg(aId){
    const avgs=WEEKS.map(w=>getWeekAvg(aId,w)).filter(v=>v!==null);
    return avgs.length?avgs.reduce((s,n)=>s+n,0)/avgs.length:null;
  }

  async function saveArea(){
    if(!canEdit||!selectedArea||!currentMonth) return;
    setSaving(true);
    try {
      const rows=selectedArea.sub_areas.length>0?selectedArea.sub_areas:[{id:null}];
      const ratings=[];
      rows.forEach(sub=>WEEKS.forEach(w=>{
        const grade=getRating(selectedAreaId,sub.id||0,w);
        if(grade!==null&&grade!==undefined) ratings.push({area_id:selectedAreaId,sub_area_id:sub.id||null,week_number:w,grade});
      }));
      if(!ratings.length){toast.error("No grades to save");setSaving(false);return;}
      const result=await api.post("/ratings/bulk",{month_id:currentMonth.id,ratings});
      if(can("can_add_remarks")){
        await api.post("/remarks",{month_id:currentMonth.id,area_id:selectedAreaId,remark_type:"general",remark_text:remarks[`${selectedAreaId}_general`]||""});
      }
      if(can("can_view_penalties") || isAdmin){
        await api.post("/remarks",{month_id:currentMonth.id,area_id:selectedAreaId,remark_type:"oeg",remark_text:remarks[`${selectedAreaId}_oeg`]||""});
      }
      const r=await api.get(`/ratings/month/${currentMonth.id}/summary`);
      const rMap={},lMap={};
      r.data.summary.forEach(area=>{area.week_data.forEach(wd=>{wd.grades.forEach(g=>{const key=`${area.area_id}_${g.sub_id}_${wd.week}`;rMap[key]=g.grade;lMap[key]=g.is_locked&&!isAdmin;});});});
      setRatingsData(rMap);setLockedData(lMap);setSummary(r.data);
      if(result.data.skipped?.length) toast("Some grades already submitted — admin required to edit.",{icon:"⚠️"});
      else toast.success("Submitted & locked!");
    } catch(e){toast.error(e.response?.data?.error||"Save failed");}
    finally{setSaving(false);}
  }

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#6b7a99"}}>Loading…</div>;

  const monthlyAvg=selectedArea?getMonthlyAvg(selectedAreaId):null;
  const avgCol=monthlyAvg===null?"#94a3b8":monthlyAvg>=benchmark?"#16a34a":"#dc2626";

  // Mobile: show area picker OR rating form
  const showPicker = showAreaPicker || !selectedAreaId;

  return (
    <div>
      {/* Area picker - mobile friendly */}
      {showPicker ? (
        <div>
          <div style={{ marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:"#1a2744" }}>Select Area</h3>
            {selectedAreaId && <button onClick={()=>setShowAreaPicker(false)} style={{ background:"#1a3a6b", border:"none", borderRadius:8, padding:"6px 14px", color:"#fff", fontSize:13, cursor:"pointer" }}>Continue →</button>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {areas.map(a => {
              const m=getMonthlyAvg(a.id);
              const dot=m===null?"#cbd5e1":m>=benchmark?"#16a34a":"#dc2626";
              const isSelected=selectedAreaId===a.id;
              return (
                <button key={a.id} onClick={()=>{setSelectedAreaId(a.id);setShowAreaPicker(false);}} style={{
                  textAlign:"left", padding:"10px 12px", borderRadius:10, border:`2px solid ${isSelected?"#1a3a6b":"#e2e8f0"}`,
                  background:isSelected?"#eef4ff":"#fff", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"flex-start"
                }}>
                  <div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginBottom:2 }}>Area {a.area_number}</div>
                    <div style={{ fontSize:12, color:isSelected?"#1a3a6b":"#374151", fontWeight:isSelected?700:500, lineHeight:1.3 }}>{a.area_name.substring(0,30)}</div>
                  </div>
                  <span style={{ width:8,height:8,borderRadius:"50%",background:dot,flexShrink:0,marginTop:4 }}></span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          {/* Back + area name */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <button onClick={()=>setShowAreaPicker(true)} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:"6px 12px", color:"#374151", fontSize:13, cursor:"pointer" }}>← Areas</button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a2744", lineHeight:1.2 }}>{selectedArea?.area_name}</div>
              <div style={{ fontSize:11, color:"#6b7a99" }}>{selectedArea?.in_charge||"No in-charge"} · Benchmark: {benchmark}</div>
            </div>
          </div>

          {/* Monthly avg + save */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 16px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:11, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.5 }}>Monthly Avg</div>
              <div style={{ fontSize:24, fontWeight:800, color:avgCol }}>{monthlyAvg?.toFixed(3)||"—"}</div>
            </div>
            {canEdit && (
              <button onClick={saveArea} disabled={saving} style={{ padding:"10px 20px", background:"#1a3a6b", border:"none", borderRadius:10, color:"#fff", fontSize:14, fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
                {saving?"Saving…":"💾 Submit"}
              </button>
            )}
            {!canEdit && currentMonth?.is_locked && <span style={{ fontSize:12, color:"#f59e0b", fontWeight:600 }}>🔒 Locked</span>}
          </div>

          {/* Week avgs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
            {WEEKS.map(w=>{
              const avg=getWeekAvg(selectedAreaId,w);
              const col=avg===null?"#94a3b8":avg>=benchmark?"#16a34a":avg>=benchmark-0.3?"#d97706":"#dc2626";
              const bg=avg===null?"#f8fafc":avg>=benchmark?"#f0fdf4":avg>=benchmark-0.3?"#fffbeb":"#fef2f2";
              return (
                <div key={w} style={{ background:bg, border:`1px solid ${col}40`, borderRadius:10, padding:"8px", textAlign:"center" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:col, textTransform:"uppercase" }}>Wk {w}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:col }}>{avg?.toFixed(2)||"—"}</div>
                </div>
              );
            })}
          </div>

          {/* Grade inputs - one sub-area per row */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", marginBottom:12 }}>
            <div style={{ padding:"10px 14px", background:"#f8fafc", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.5 }}>
                {selectedArea?.sub_areas?.length>0?"Sub-Areas (max 5)":"Rating (max 5)"}
              </span>
            </div>
            {(selectedArea?.sub_areas?.length>0?selectedArea.sub_areas:[{id:null,name:"Overall Rating"}]).map(sub=>(
              <div key={sub.id||0} style={{ padding:"10px 14px", borderBottom:"1px solid #f8fafc" }}>
                <div style={{ fontSize:12, color:"#374151", fontWeight:500, marginBottom:8 }}>{sub.name}</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {WEEKS.map(w=>(
                    <div key={w} style={{ flex:1, textAlign:"center" }}>
                      <div style={{ fontSize:10, color:"#94a3b8", marginBottom:4 }}>W{w}</div>
                      <GradeInput
                        value={getRating(selectedAreaId,sub.id||0,w)}
                        onChange={val=>setRating(selectedAreaId,sub.id||0,w,val)}
                        disabled={!canEdit} locked={isLocked(selectedAreaId,sub.id||0,w)} benchmark={benchmark}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Remarks */}
          {(can("can_add_remarks") || can("can_view_penalties") || user?.is_admin) && (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"14px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6b7a99", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>Remarks</div>

              {/* General Remark - Rater can enter */}
              {can("can_add_remarks") && (
                <div style={{ marginBottom:10 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:4 }}>
                    General Remark <span style={{ color:"#94a3b8", fontWeight:400 }}>(Rater)</span>
                  </label>
                  <textarea value={remarks[`${selectedAreaId}_general`]||""}
                    onChange={e=>setRemarks(p=>({...p,[`${selectedAreaId}_general`]:e.target.value}))}
                    disabled={currentMonth?.is_locked} rows={2} placeholder="Enter general remark…"
                    style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:13, color:"#374151", resize:"none", boxSizing:"border-box", outline:"none", fontFamily:"inherit" }}
                  />
                </div>
              )}

              {/* OEG Remark - Viewer/Admin only */}
              {(can("can_view_penalties") || user?.is_admin) && (
                <div style={{ marginBottom:10 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:4 }}>
                    OEG Remark <span style={{ color:"#94a3b8", fontWeight:400 }}>(Viewer/Admin)</span>
                  </label>
                  <textarea value={remarks[`${selectedAreaId}_oeg`]||""}
                    onChange={e=>setRemarks(p=>({...p,[`${selectedAreaId}_oeg`]:e.target.value}))}
                    disabled={currentMonth?.is_locked} rows={2} placeholder="Enter OEG remark…"
                    style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:13, color:"#374151", resize:"none", boxSizing:"border-box", outline:"none", fontFamily:"inherit" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}