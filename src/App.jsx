import { useState, useEffect, useCallback } from "react";

const SUPA_URL = "https://vumghyubyppcdaimitds.supabase.co";
const SUPA_KEY = "sb_publishable_Ru4pet2VDNDWzN2PQdHq2g_rhqNwuG-";

async function supaFetch(path, opts = {}) {
  const token = opts.token || SUPA_KEY;
  const res = await fetch(SUPA_URL + "/rest/v1/" + path, {
    headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + token, "Content-Type": "application/json", "Prefer": opts.prefer || "return=representation", ...opts.headers },
    method: opts.method || "GET",
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Erreur " + res.status); }
  if (res.status === 204) return null;
  return res.json();
}

const db = {
  login: (email, password) => fetch(SUPA_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }).then(r => r.json()),
  logout: (token) => fetch(SUPA_URL + "/auth/v1/logout", { method: "POST", headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + token } }),
  getPatients: (token) => supaFetch("patients?select=*&order=created_at.desc", { token }),
  addPatient: (p, token) => supaFetch("patients", { method: "POST", body: p, token }),
  updatePatient: (id, p, token) => supaFetch("patients?id=eq." + id, { method: "PATCH", body: p, token }),
  deletePatient: (id, token) => supaFetch("patients?id=eq." + id, { method: "DELETE", prefer: "return=minimal", token }),
  getPlans: (pid, token) => supaFetch("plans?patient_id=eq." + pid + "&order=created_at.desc", { token }),
  addPlan: (p, token) => supaFetch("plans", { method: "POST", body: p, token }),
  updatePlan: (id, p, token) => supaFetch("plans?id=eq." + id, { method: "PATCH", body: p, token }),
  deletePlan: (id, token) => supaFetch("plans?id=eq." + id, { method: "DELETE", prefer: "return=minimal", token }),
  getNotes: (pid, token) => supaFetch("consult_notes?patient_id=eq." + pid + "&order=created_at.desc", { token }),
  addNote: (n, token) => supaFetch("consult_notes", { method: "POST", body: n, token }),
  getPoids: (pid, token) => supaFetch("poids_historique?patient_id=eq." + pid + "&order=date.asc", { token }),
  addPoids: (p, token) => supaFetch("poids_historique", { method: "POST", body: p, token }),
  deletePoids: (id, token) => supaFetch("poids_historique?id=eq." + id, { method: "DELETE", prefer: "return=minimal", token }),
  getMensurations: (pid, token) => supaFetch("mensurations?patient_id=eq." + pid + "&order=date.asc", { token }),
  addMensuration: (m, token) => supaFetch("mensurations", { method: "POST", body: m, token }),
  deleteMensuration: (id, token) => supaFetch("mensurations?id=eq." + id, { method: "DELETE", prefer: "return=minimal", token }),
  getRDV: (token) => supaFetch("rendez_vous?select=*,patients(prenom,nom)&order=date.asc,heure.asc", { token }),
  addRDV: (r, token) => supaFetch("rendez_vous", { method: "POST", body: r, token }),
  deleteRDV: (id, token) => supaFetch("rendez_vous?id=eq." + id, { method: "DELETE", prefer: "return=minimal", token }),
};

const COLORS = ["#C4956A","#3D5A47","#7A9E7E","#8B5E3C","#5B7A8B","#9B6B8A","#6B8B6B"];
const GOALS_FR = { perte_poids:"Perte de poids", reeducation:"Reeducation alimentaire", prise_masse:"Prise de masse", sante:"Sante generale", sport:"Performance sportive" };
const ACTIVITE_FR = { sedentaire:"Sedentaire", leger:"Legerement actif", modere:"Moderement actif", actif:"Tres actif", sport_intense:"Sport intensif" };
const DIET_FR = { vegetarien:"Vegetarien", vegan:"Vegan", sans_gluten:"Sans gluten", sans_lactose:"Sans lactose", halal:"Halal", casher:"Casher", diabetique:"Diabetique" };
const MEAL_NAMES = ["Petit-dejeuner","Dejeuner","Collation","Diner"];
const SOMMEIL_FR = { mauvais:"Mauvais", moyen:"Moyen", bon:"Bon", excellent:"Excellent" };
const TRANSIT_FR = { normal:"Normal", lent:"Lent", rapide:"Rapide", irregulier:"Irregulier" };
const ALIM_FR = { sale:"Plutot sale", sucre:"Plutot sucre", equilibre:"Equilibre" };

const avatarColor = (id) => COLORS[Math.abs((id||"").toString().split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % COLORS.length];
const initials = (p) => ((p.prenom||"?")[0]+(p.nom||"?")[0]).toUpperCase();
const getAge = (ddn) => { if(!ddn) return "-"; const d=Math.floor((Date.now()-new Date(ddn))/(365.25*24*3600*1000)); return d+" ans"; };
const calcBMI = (p,t) => { if(!p||!t) return "-"; return (p/Math.pow(t/100,2)).toFixed(1); };
const calcMB = (p) => {
  if(!p.poids||!p.taille||!p.ddn||!p.sexe) return null;
  const age=Math.floor((Date.now()-new Date(p.ddn))/(365.25*24*3600*1000));
  return Math.round(p.sexe==="F"?(10*p.poids)+(6.25*p.taille)-(5*age)-161:(10*p.poids)+(6.25*p.taille)-(5*age)+5);
};
const ACTIVITE_COEF = { sedentaire:1.2, leger:1.375, modere:1.55, actif:1.725, sport_intense:1.9 };
const calcDET = (p) => { const mb=calcMB(p); if(!mb||!p.activite) return null; return Math.round(mb*(ACTIVITE_COEF[p.activite]||1.2)); };

const emptyMeal = (name) => ({ name, content:"", grammage:"" });
const emptyDay = (i) => ({ label:"Jour "+(i+1), meals:MEAL_NAMES.map(emptyMeal) });
const emptyPlan = (dur) => { const n=dur==="journee"?1:dur==="7j"?7:3; return Array.from({length:n},(_,i)=>dur==="journee"?{label:"Journee type",meals:MEAL_NAMES.map(emptyMeal)}:emptyDay(i)); };

const EMPTY_FORM = { prenom:"",nom:"",ddn:"",sexe:"",email:"",tel:"",taille:"",poids:"",poids_obj:"",objectif:"perte_poids",activite:"sedentaire",diets:[],antecedents:"",allergies:"",notes:"",sommeil:"",transit:"",moral:"",alimentation:"",prise_de_sang:"" };
const EMPTY_RDV = { patient_id:"", date:"", heure:"08:00", duree:60, note:"" };
const EMPTY_MENS = { date:new Date().toISOString().split("T")[0], nombril:"", hanche:"", cuisse_d:"", bras_d:"", masse_grasse:"", masse_hydrique:"", masse_musculaire:"", imc:"", note:"" };

const S = {
  app: { display:"flex", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif", background:"#FAF7F2", color:"#3D3228" },
  sidebar: { width:260, minHeight:"100vh", background:"#2A2118", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", flexShrink:0 },
  logoBox: { padding:"28px 24px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)" },
  logoText: { fontFamily:"Georgia,serif", fontSize:20, color:"#FAF7F2" },
  logoSub: { fontSize:10, color:"#C4956A", letterSpacing:"2px", textTransform:"uppercase", marginTop:2 },
  navArea: { padding:"16px 12px", flex:1, overflowY:"auto" },
  navLabel: { fontSize:10, letterSpacing:"2px", textTransform:"uppercase", color:"rgba(255,255,255,0.25)", padding:"8px 10px 4px" },
  navItem: (a) => ({ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, cursor:"pointer", color:a?"white":"rgba(255,255,255,0.5)", background:a?"#C4956A":"transparent", fontSize:13, fontWeight:a?500:400, marginBottom:2 }),
  patChip: (a) => ({ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, cursor:"pointer", background:a?"rgba(196,149,106,0.18)":"transparent", marginBottom:1 }),
  main: { flex:1, display:"flex", flexDirection:"column", minWidth:0 },
  topbar: { background:"white", borderBottom:"1px solid #E8DDD0", padding:"0 36px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 },
  pageTitle: { fontFamily:"Georgia,serif", fontSize:19, color:"#2A2118" },
  content: { padding:36, flex:1 },
  btn: (v) => ({ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:10, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, cursor:"pointer", background:v==="primary"?"#C4956A":v==="forest"?"#3D5A47":"#F0EBE1", color:v==="primary"||v==="forest"?"white":"#3D3228", border:v==="secondary"?"1px solid #E8DDD0":"none" }),
  statsGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:18, marginBottom:32 },
  statCard: { background:"white", borderRadius:16, padding:22, boxShadow:"0 4px 20px rgba(42,33,24,0.07)", border:"1px solid #E8DDD0" },
  statLabel: { fontSize:11, letterSpacing:"1.5px", textTransform:"uppercase", color:"#8A7968", marginBottom:8 },
  statValue: { fontFamily:"Georgia,serif", fontSize:30, color:"#2A2118" },
  statSub: { fontSize:11, color:"#7A9E7E", marginTop:3 },
  card: { background:"white", borderRadius:16, padding:22, boxShadow:"0 4px 20px rgba(42,33,24,0.07)", border:"1px solid #E8DDD0", cursor:"pointer" },
  patientsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:18 },
  tag: (v) => ({ padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:500, background:v==="goal"?"rgba(61,90,71,0.12)":"rgba(196,149,106,0.14)", color:v==="goal"?"#3D5A47":"#8B5E3C" }),
  avatar: (id, sz) => { const s=sz||42; return { width:s, height:s, borderRadius:"50%", background:avatarColor(id), display:"flex", alignItems:"center", justifyContent:"center", fontSize:s>40?18:12, fontWeight:600, color:"white", flexShrink:0 }; },
  infoCard: { background:"white", borderRadius:14, padding:22, boxShadow:"0 4px 20px rgba(42,33,24,0.07)", border:"1px solid #E8DDD0", marginBottom:18 },
  infoTitle: { fontSize:10, letterSpacing:"2px", textTransform:"uppercase", color:"#C4956A", marginBottom:14 },
  infoRow: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"7px 0", borderBottom:"1px solid #F0EBE1", fontSize:13 },
  overlay: { position:"fixed", inset:0, background:"rgba(42,33,24,0.5)", backdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modal: { background:"#FAF7F2", borderRadius:20, width:"100%", maxWidth:640, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(42,33,24,0.2)" },
  modalHeader: { padding:"26px 30px 18px", borderBottom:"1px solid #E8DDD0", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#FAF7F2", zIndex:5, borderRadius:"20px 20px 0 0" },
  modalTitle: { fontFamily:"Georgia,serif", fontSize:20, color:"#2A2118" },
  modalBody: { padding:"24px 30px 28px" },
  modalFooter: { padding:"16px 30px", borderTop:"1px solid #E8DDD0", display:"flex", justifyContent:"flex-end", gap:10, alignItems:"center" },
  formGroup: { display:"flex", flexDirection:"column", gap:4, marginBottom:14 },
  label: { fontSize:12, fontWeight:500, color:"#8A7968" },
  input: { padding:"9px 13px", border:"1.5px solid #E8DDD0", borderRadius:10, fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#3D3228", background:"white", outline:"none" },
  textarea: { padding:"9px 13px", border:"1.5px solid #E8DDD0", borderRadius:10, fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#3D3228", background:"white", outline:"none", resize:"vertical", minHeight:70 },
  emptyState: { textAlign:"center", padding:"60px 30px", color:"#8A7968" },
  planDayWrap: { marginBottom:16, background:"#F0EBE1", borderRadius:12, overflow:"hidden" },
  planDayHeader: { background:"#C4956A", color:"white", padding:"9px 14px", fontSize:13, fontWeight:600 },
  planMealName: { fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", color:"#8B5E3C", marginBottom:3 },
  planMealContent: { fontSize:13, color:"#3D3228", lineHeight:1.5 },
  tab: (a) => ({ padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:a?600:400, color:a?"#C4956A":"#8A7968", borderBottom:a?"2px solid #C4956A":"2px solid transparent", transition:"all 0.15s", whiteSpace:"nowrap" }),
};

function FormInput({label,type,value,onChange,placeholder}) {
  return <div style={S.formGroup}><label style={S.label}>{label}</label><input style={S.input} type={type||"text"} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""}/></div>;
}
function FormSelect({label,value,onChange,options}) {
  return <div style={S.formGroup}><label style={S.label}>{label}</label><select style={S.input} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>;
}
function SectionTitle({children}) {
  return <div style={{fontSize:10,letterSpacing:"2px",textTransform:"uppercase",color:"#C4956A",margin:"18px 0 12px",paddingBottom:7,borderBottom:"1px solid #E8DDD0"}}>{children}</div>;
}
function Spinner() {
  return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <style>{"@keyframes bn{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}"}</style>
      <div style={{display:"flex",justifyContent:"center",gap:8}}>{[0,200,400].map((d,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#C4956A",animation:"bn 1.2s "+d+"ms infinite ease-in-out"}}/>)}</div>
    </div>
  );
}

function PlanDays({days}) {
  return (
    <div>
      {(days||[]).map((day,i)=>(
        <div key={i} style={S.planDayWrap}>
          <div style={S.planDayHeader}>{day.label}</div>
          <div style={{padding:"10px 14px"}}>
            {(day.meals||[]).filter(m=>m.content).map((m,j)=>(
              <div key={j} style={{padding:"8px 0",borderBottom:j<(day.meals||[]).filter(x=>x.content).length-1?"1px solid #E8DDD0":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <div style={S.planMealName}>{m.name}</div>
                  {m.grammage&&<span style={{fontSize:11,color:"#C4956A",fontWeight:600}}>{m.grammage}</span>}
                </div>
                <div style={S.planMealContent}>{m.content}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanEditor({days, tips, onDaysChange, onTipsChange}) {
  const updateMeal=(di,mi,field,val)=>onDaysChange(days.map((d,i)=>i!==di?d:{...d,meals:d.meals.map((m,j)=>j!==mi?m:{...m,[field]:val})}));
  const updateLabel=(di,val)=>onDaysChange(days.map((d,i)=>i===di?{...d,label:val}:d));
  return (
    <div style={{maxHeight:"60vh",overflowY:"auto",paddingRight:4}}>
      {days.map((day,di)=>(
        <div key={di} style={S.planDayWrap}>
          <div style={{...S.planDayHeader,padding:"6px 10px"}}>
            <input value={day.label} onChange={e=>updateLabel(di,e.target.value)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,color:"white",fontWeight:600,fontSize:13,padding:"3px 8px",fontFamily:"'DM Sans',sans-serif",width:"100%",outline:"none"}}/>
          </div>
          <div style={{padding:"10px 14px"}}>
            {day.meals.map((m,mi)=>(
              <div key={mi} style={{marginBottom:12,paddingBottom:12,borderBottom:mi<day.meals.length-1?"1px solid #E8DDD0":"none"}}>
                <div style={S.planMealName}>{m.name}</div>
                <textarea value={m.content} onChange={e=>updateMeal(di,mi,"content",e.target.value)} placeholder="Description du repas..." style={{...S.textarea,minHeight:50,width:"100%",fontSize:12,marginBottom:6}}/>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:"#8A7968",flexShrink:0}}>Grammage :</span>
                  <input value={m.grammage||""} onChange={e=>updateMeal(di,mi,"grammage",e.target.value)} placeholder="Ex: 150g proteines, 80g glucides..." style={{...S.input,fontSize:11,padding:"5px 10px",flex:1}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={S.formGroup}><label style={S.label}>Conseils</label><textarea style={{...S.textarea,minHeight:55}} value={tips} onChange={e=>onTipsChange(e.target.value)} placeholder="Ex: bien s'hydrater..."/></div>
    </div>
  );
}

function PlansSection({plans, loading, token, onNewPlan, onPlansChange}) {
  const [editingPlan, setEditingPlan] = useState(null);
  const [editDays, setEditDays] = useState([]);
  const [editTips, setEditTips] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit=(plan)=>{ setEditingPlan(plan); setEditDays(JSON.parse(JSON.stringify(plan.days||[]))); setEditTips(plan.tips||""); };
  const saveEdit=async()=>{ setSaving(true); try{ await db.updatePlan(editingPlan.id,{days:editDays,tips:editTips},token); onPlansChange(plans.map(p=>p.id===editingPlan.id?{...p,days:editDays,tips:editTips}:p)); setEditingPlan(null); }catch(e){alert("Erreur : "+e.message);} setSaving(false); };
  const deletePlan=async(id)=>{ if(!confirm("Supprimer ce plan ?")) return; await db.deletePlan(id,token); onPlansChange(plans.filter(p=>p.id!==id)); };

  if(editingPlan) return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:16,color:"#2A2118"}}>Modification du plan</div>
        <button onClick={()=>setEditingPlan(null)} style={{...S.btn("secondary"),fontSize:12}}>← Retour</button>
      </div>
      <PlanEditor days={editDays} tips={editTips} onDaysChange={setEditDays} onTipsChange={setEditTips}/>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12}}>
        <button style={S.btn("secondary")} onClick={()=>setEditingPlan(null)}>Annuler</button>
        <button style={S.btn("primary")} onClick={saveEdit} disabled={saving}>{saving?"Enregistrement...":"Enregistrer"}</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118"}}>Plans alimentaires</div>
        <button style={S.btn("forest")} onClick={onNewPlan}>+ Nouveau plan</button>
      </div>
      {loading?<Spinner/>:plans.length===0
        ?<div style={S.emptyState}><div style={{fontSize:36,marginBottom:12,opacity:.4}}>🥗</div><div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118",opacity:.6,marginBottom:6}}>Aucun plan</div><div style={{fontSize:13}}>Cliquez sur "Nouveau plan"</div></div>
        :plans.map((plan,i)=>(
          <div key={i} style={{background:"#F0EBE1",borderRadius:12,marginBottom:14,overflow:"hidden"}}>
            <div style={{background:plan.mode==="manual"?"#3D5A47":"#C4956A",color:"white",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600}}>Plan {i+1} - {new Date(plan.created_at).toLocaleDateString("fr-FR")}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:10,background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:20}}>{plan.duration}</span>
                <span style={{fontSize:10,background:"rgba(255,255,255,0.15)",padding:"2px 8px",borderRadius:20}}>{plan.mode==="manual"?"Manuel":"IA"}</span>
                <button onClick={()=>startEdit(plan)} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,color:"white",fontSize:11,padding:"3px 8px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Modifier</button>
                <button onClick={()=>deletePlan(plan.id)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,color:"rgba(255,255,255,0.7)",fontSize:14,padding:"2px 6px",cursor:"pointer"}}>x</button>
              </div>
            </div>
            <div style={{padding:"12px 14px"}}>
              <PlanDays days={plan.days}/>
              {plan.tips&&<div style={{marginTop:10,padding:"9px 12px",background:"rgba(61,90,71,0.08)",borderRadius:8,fontSize:12,color:"#3D5A47",lineHeight:1.5}}>Conseils : {plan.tips}</div>}
            </div>
          </div>
        ))
      }
    </div>
  );
}

function PoidsChart({data, objectif}) {
  if(!data||data.length===0) return <p style={{fontSize:12,color:"#8A7968",fontStyle:"italic"}}>Aucune mesure. Ajoutez une mesure pour voir la courbe.</p>;
  const PW=500,PH=160,PPL=38,PPR=12,PPT=12,PPB=26,cw=PW-PPL-PPR,ch=PH-PPT-PPB;
  const weights=data.map(d=>d.poids);
  const allW=objectif?[...weights,+objectif]:weights;
  const minW=Math.min(...allW)-2,maxW=Math.max(...allW)+2,range=maxW-minW||1;
  const x=(i)=>PPL+(i/(data.length-1||1))*cw;
  const y=(w)=>PPT+ch-((w-minW)/range)*ch;
  const pathD=data.map((d,i)=>(i===0?"M":"L")+x(i).toFixed(1)+","+y(d.poids).toFixed(1)).join(" ");
  const areaD=pathD+" L"+x(data.length-1).toFixed(1)+","+(PPT+ch)+" L"+PPL+","+(PPT+ch)+" Z";
  const yTicks=Array.from({length:5},(_,i)=>minW+(range/4)*i);
  return (
    <svg viewBox={"0 0 "+PW+" "+PH} style={{width:"100%",height:"auto"}}>
      {yTicks.map((t,i)=>(<g key={i}><line x1={PPL} y1={y(t).toFixed(1)} x2={PW-PPR} y2={y(t).toFixed(1)} stroke="#F0EBE1" strokeWidth="1"/><text x={PPL-6} y={y(t)+4} textAnchor="end" fontSize="9" fill="#8A7968">{t.toFixed(1)}</text></g>))}
      {objectif&&<line x1={PPL} y1={y(+objectif).toFixed(1)} x2={PW-PPR} y2={y(+objectif).toFixed(1)} stroke="#7A9E7E" strokeWidth="1.5" strokeDasharray="4,3"/>}
      <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C4956A" stopOpacity="0.25"/><stop offset="100%" stopColor="#C4956A" stopOpacity="0.02"/></linearGradient></defs>
      <path d={areaD} fill="url(#wg)"/>
      <path d={pathD} fill="none" stroke="#C4956A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((d,i)=>(<g key={i}><circle cx={x(i).toFixed(1)} cy={y(d.poids).toFixed(1)} r="3" fill="white" stroke="#C4956A" strokeWidth="2"/><text x={x(i).toFixed(1)} y={y(d.poids)-8} textAnchor="middle" fontSize="8" fill="#8B5E3C" fontWeight="600">{d.poids}kg</text></g>))}
      {data.map((d,i)=>(<text key={i} x={x(i).toFixed(1)} y={PH-6} textAnchor="middle" fontSize="7" fill="#8A7968">{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</text>))}
      {objectif&&<text x={PW-PPR} y={y(+objectif)-4} textAnchor="end" fontSize="8" fill="#7A9E7E">Obj. {objectif}kg</text>}
    </svg>
  );
}

function MensurationsChart({data, type}) {
  if(!data||data.length<2) return <p style={{fontSize:12,color:"#8A7968",fontStyle:"italic"}}>Minimum 2 mesures necessaires.</p>;
  const keys=type==="mensurations"?[["nombril","#C4956A"],["hanche","#3D5A47"],["cuisse_d","#7A9E7E"],["bras_d","#8B5E3C"]]:[["masse_grasse","#c8503c"],["masse_musculaire","#3D5A47"],["masse_hydrique","#5B7A8B"]];
  const labels={nombril:"Nombril",hanche:"Hanche",cuisse_d:"Cuisse D",bras_d:"Bras D",masse_grasse:"Masse grasse",masse_musculaire:"Masse musc.",masse_hydrique:"Masse hydrique"};
  const units=type==="mensurations"?"cm":"%";
  const allVals=keys.flatMap(([k])=>data.map(d=>d[k]).filter(v=>v!=null));
  if(!allVals.length) return <p style={{fontSize:12,color:"#8A7968",fontStyle:"italic"}}>Aucune donnee disponible.</p>;
  const minV=Math.min(...allVals)-2,maxV=Math.max(...allVals)+2,range=maxV-minV||1;
  const MW=300,MH=130,MPL=35,MPR=10,MPT=10,MPB=25,mcw=MW-MPL-MPR,mch=MH-MPT-MPB;
  const mx=(i,len)=>MPL+(i/(len-1||1))*mcw;
  const my=(v)=>MPT+mch-((v-minV)/range)*mch;
  const myTicks=Array.from({length:5},(_,i)=>minV+(range/4)*i);
  return (
    <div>
      <svg viewBox={"0 0 "+MW+" "+MH} style={{width:"100%",height:"auto"}}>
        {myTicks.map((t,i)=>(<g key={i}><line x1={MPL} y1={my(t).toFixed(1)} x2={MW-MPR} y2={my(t).toFixed(1)} stroke="#F0EBE1" strokeWidth="1"/><text x={MPL-4} y={my(t)+3} textAnchor="end" fontSize="8" fill="#8A7968">{t.toFixed(0)}</text></g>))}
        {keys.map(([key,color])=>{ const pts=data.map((d,i)=>({v:d[key],i})).filter(p=>p.v!=null); if(pts.length<2) return null; const pathD=pts.map((p,j)=>(j===0?"M":"L")+mx(p.i,data.length).toFixed(1)+","+my(p.v).toFixed(1)).join(" "); return <path key={key} d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>; })}
        {keys.map(([key,color])=>{ const pts=data.map((d,i)=>({v:d[key],i})).filter(p=>p.v!=null); return pts.map((p,j)=>(<circle key={key+j} cx={mx(p.i,data.length).toFixed(1)} cy={my(p.v).toFixed(1)} r="2.5" fill="white" stroke={color} strokeWidth="1.5"/>)); })}
        {data.map((d,i)=>(<text key={i} x={mx(i,data.length).toFixed(1)} y={MH-5} textAnchor="middle" fontSize="7" fill="#8A7968">{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</text>))}
      </svg>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:4}}>
        {keys.map(([key,color])=>(<div key={key} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}><div style={{width:10,height:2,background:color,borderRadius:1}}/><span style={{color:"#8A7968"}}>{labels[key]} ({units})</span></div>))}
      </div>
    </div>
  );
}

function PoidsSection({patientId, objectif, token}) {
  const [poidsData, setPoidsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPoids, setNewPoids] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(()=>{ db.getPoids(patientId,token).then(d=>{setPoidsData(d||[]);setLoading(false);}).catch(()=>setLoading(false)); },[patientId]);
  const addMesure=async()=>{ if(!newPoids) return; setSaving(true); try{ const [e]=await db.addPoids({patient_id:patientId,poids:+newPoids,date:newDate,note:newNote||null},token); setPoidsData(d=>[...d,e].sort((a,b)=>new Date(a.date)-new Date(b.date))); setNewPoids(""); setNewNote(""); }catch(e){alert("Erreur : "+e.message);} setSaving(false); };
  const deleteMesure=async(id)=>{ await db.deletePoids(id,token); setPoidsData(d=>d.filter(x=>x.id!==id)); };
  const poidsDiff=poidsData.length>=2?(poidsData[poidsData.length-1].poids-poidsData[0].poids).toFixed(1):null;
  return (
    <div>
      {loading?<Spinner/>:(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:8}}>
            {/* Colonne gauche : graphique + stats */}
            <div>
              {poidsData.length>=2&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>{[["Debut",poidsData[0].poids+"kg"],["Actuel",poidsData[poidsData.length-1].poids+"kg"],["Evolution",(poidsDiff>0?"+":"")+poidsDiff+"kg"],["Objectif",objectif?objectif+"kg":"-"]].map(([k,v])=>(<div key={k} style={{background:"#F0EBE1",borderRadius:8,padding:"8px 10px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:600,color:k==="Evolution"?(poidsDiff<=0?"#3D5A47":"#c8503c"):"#2A2118"}}>{v}</div><div style={{fontSize:9,color:"#8A7968",textTransform:"uppercase",letterSpacing:"0.8px",marginTop:1}}>{k}</div></div>))}</div>)}
              <div style={{background:"#FDFAF7",borderRadius:10,padding:10}}><PoidsChart data={poidsData} objectif={objectif}/></div>
            </div>
            {/* Colonne droite : ajout + historique */}
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"#8A7968",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Ajouter une mesure</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div style={S.formGroup}><label style={S.label}>Poids (kg)</label><input type="number" step="0.1" value={newPoids} onChange={e=>setNewPoids(e.target.value)} placeholder="72.5" style={S.input}/></div>
                <div style={S.formGroup}><label style={S.label}>Date</label><input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={S.input}/></div>
              </div>
              <div style={{...S.formGroup,marginBottom:10}}><label style={S.label}>Note</label><input type="text" value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Ex: apres sport..." style={S.input}/></div>
              <button onClick={addMesure} disabled={saving||!newPoids} style={{...S.btn("primary"),width:"100%",justifyContent:"center",marginBottom:14}}>{saving?"...":"+ Ajouter"}</button>
              {poidsData.length>0&&(<div><div style={{fontSize:11,fontWeight:600,color:"#8A7968",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Historique</div><div style={{maxHeight:180,overflowY:"auto"}}>{[...poidsData].reverse().map((d,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #F0EBE1",fontSize:12}}><span style={{color:"#8A7968"}}>{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}</span><span style={{fontWeight:600}}>{d.poids} kg</span><button onClick={()=>deleteMesure(d.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#c8503c",fontSize:14,padding:"0 4px"}}>x</button></div>))}</div></div>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MensurationsSection({patientId, token}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_MENS);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  useEffect(()=>{ db.getMensurations(patientId,token).then(d=>{setData(d||[]);setLoading(false);}).catch(()=>setLoading(false)); },[patientId]);
  const ff=(k)=>(v)=>setForm(f=>({...f,[k]:v}));
  const addMens=async()=>{ if(!form.date){alert("Date requise");return;} setSaving(true); try{ const payload={patient_id:patientId,date:form.date,note:form.note||null,nombril:form.nombril?+form.nombril:null,hanche:form.hanche?+form.hanche:null,cuisse_d:form.cuisse_d?+form.cuisse_d:null,bras_d:form.bras_d?+form.bras_d:null,masse_grasse:form.masse_grasse?+form.masse_grasse:null,masse_hydrique:form.masse_hydrique?+form.masse_hydrique:null,masse_musculaire:form.masse_musculaire?+form.masse_musculaire:null,imc:form.imc?+form.imc:null}; const [entry]=await db.addMensuration(payload,token); setData(d=>[...d,entry].sort((a,b)=>new Date(a.date)-new Date(b.date))); setForm(EMPTY_MENS); setShowForm(false); }catch(e){alert("Erreur : "+e.message);} setSaving(false); };
  const deleteMens=async(id)=>{ await db.deleteMensuration(id,token); setData(d=>d.filter(x=>x.id!==id)); };
  const last=data.length>0?data[data.length-1]:null;
  return (
    <div>
      {loading?<Spinner/>:(
        <>
          {last&&(<div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:"#8A7968",marginBottom:10}}>Derniere mesure : {new Date(last.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
              {[["Nombril",last.nombril,"cm"],["Hanche",last.hanche,"cm"],["Cuisse D",last.cuisse_d,"cm"],["Bras D",last.bras_d,"cm"]].map(([k,v,u])=>(<div key={k} style={{background:"#F0EBE1",borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:600,color:"#2A2118"}}>{v?v+u:"-"}</div><div style={{fontSize:10,color:"#8A7968",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:2}}>{k}</div></div>))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
              {[["Masse grasse",last.masse_grasse,"%"],["Masse hydrique",last.masse_hydrique,"%"],["Masse musculaire",last.masse_musculaire,"%"],["IMC",last.imc,""]].map(([k,v,u])=>(<div key={k} style={{background:"#F0EBE1",borderRadius:10,padding:"10px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:600,color:"#2A2118"}}>{v?(v+u):"-"}</div><div style={{fontSize:10,color:"#8A7968",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:2}}>{k}</div></div>))}
            </div>
          </div>)}
          {data.length>=2&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:600,color:"#8A7968",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Evolution</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{background:"#FDFAF7",borderRadius:10,padding:10}}>
                  <div style={{fontSize:10,color:"#3D5A47",fontWeight:600,marginBottom:6}}>Mensurations (cm)</div>
                  <MensurationsChart data={data} type="mensurations"/>
                </div>
                <div style={{background:"#FDFAF7",borderRadius:10,padding:10}}>
                  <div style={{fontSize:10,color:"#3D5A47",fontWeight:600,marginBottom:6}}>Composition corporelle (%)</div>
                  <MensurationsChart data={data} type="composition"/>
                </div>
              </div>
            </div>
          )}
          <button style={{...S.btn("secondary"),fontSize:12,width:"100%",justifyContent:"center",marginBottom:14}} onClick={()=>setShowForm(!showForm)}>{showForm?"Fermer":"+ Ajouter une mensuration"}</button>
          {showForm&&(<div style={{background:"#F0EBE1",borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div style={S.formGroup}><label style={S.label}>Date *</label><input type="date" value={form.date} onChange={e=>ff("date")(e.target.value)} style={S.input}/></div>
              <div style={S.formGroup}><label style={S.label}>Note</label><input type="text" value={form.note} onChange={e=>ff("note")(e.target.value)} placeholder="Ex: apres sport..." style={S.input}/></div>
            </div>
            <div style={{fontSize:11,fontWeight:600,color:"#3D5A47",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Mensurations (cm)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {[["Nombril","nombril"],["Hanche","hanche"],["Cuisse D","cuisse_d"],["Bras D","bras_d"]].map(([l,k])=>(<div key={k} style={S.formGroup}><label style={S.label}>{l}</label><input type="number" step="0.1" value={form[k]} onChange={e=>ff(k)(e.target.value)} placeholder="0" style={S.input}/></div>))}
            </div>
            <div style={{fontSize:11,fontWeight:600,color:"#3D5A47",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Composition corporelle</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
              {[["MG %","masse_grasse"],["MH %","masse_hydrique"],["MM %","masse_musculaire"],["IMC","imc"]].map(([l,k])=>(<div key={k} style={S.formGroup}><label style={S.label}>{l}</label><input type="number" step="0.1" value={form[k]} onChange={e=>ff(k)(e.target.value)} placeholder="0" style={S.input}/></div>))}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <button style={S.btn("secondary")} onClick={()=>setShowForm(false)}>Annuler</button>
              <button style={S.btn("primary")} onClick={addMens} disabled={saving}>{saving?"Enregistrement...":"Enregistrer"}</button>
            </div>
          </div>)}
          {data.length>0&&(<div><div style={{fontSize:11,fontWeight:600,color:"#8A7968",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Historique</div><div style={{maxHeight:200,overflowY:"auto"}}>{[...data].reverse().map((d,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F0EBE1",fontSize:12}}><span style={{color:"#8A7968",minWidth:100}}>{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}</span><div style={{display:"flex",gap:12,flex:1,flexWrap:"wrap"}}>{[["Nombril",d.nombril,"cm"],["Hanche",d.hanche,"cm"],["Cuisse",d.cuisse_d,"cm"],["Bras",d.bras_d,"cm"],["MG",d.masse_grasse,"%"],["MH",d.masse_hydrique,"%"],["MM",d.masse_musculaire,"%"],["IMC",d.imc,""]].filter(([,v])=>v).map(([k,v,u])=>(<span key={k}><span style={{color:"#8A7968"}}>{k}:</span> {v}{u}</span>))}</div><button onClick={()=>deleteMens(d.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#c8503c",fontSize:16,padding:"0 4px",flexShrink:0}}>x</button></div>))}</div></div>)}
          {data.length===0&&!showForm&&<p style={{fontSize:12,color:"#8A7968",fontStyle:"italic"}}>Aucune mensuration enregistree.</p>}
        </>
      )}
    </div>
  );
}

function ConsultationModal({patient, token, onSave}) {
  const [poids, setPoids] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sommeil, setSommeil] = useState("");
  const [transit, setTransit] = useState("");
  const [moral, setMoral] = useState("");
  const [noteText, setNoteText] = useState("");
  const [mens, setMens] = useState({nombril:"",hanche:"",cuisse_d:"",bras_d:"",masse_grasse:"",masse_hydrique:"",masse_musculaire:"",imc:""});
  const [showMens, setShowMens] = useState(false);
  const [saving, setSaving] = useState(false);
  const save=async()=>{ setSaving(true); try{ const promises=[]; if(poids) promises.push(db.addPoids({patient_id:patient.id,poids:+poids,date,note:null},token)); if(Object.values(mens).some(v=>v)) promises.push(db.addMensuration({patient_id:patient.id,date,nombril:mens.nombril?+mens.nombril:null,hanche:mens.hanche?+mens.hanche:null,cuisse_d:mens.cuisse_d?+mens.cuisse_d:null,bras_d:mens.bras_d?+mens.bras_d:null,masse_grasse:mens.masse_grasse?+mens.masse_grasse:null,masse_hydrique:mens.masse_hydrique?+mens.masse_hydrique:null,masse_musculaire:mens.masse_musculaire?+mens.masse_musculaire:null,imc:mens.imc?+mens.imc:null},token)); const noteContent=[noteText,sommeil?"Sommeil : "+(SOMMEIL_FR[sommeil]||sommeil):"",transit?"Transit : "+(TRANSIT_FR[transit]||transit):"",moral?"Moral : "+moral+"/5":""].filter(Boolean).join("\n"); if(noteContent.trim()) promises.push(db.addNote({patient_id:patient.id,text:noteContent},token)); const results=await Promise.all(promises); const noteRes=results.find(r=>Array.isArray(r)&&r[0]?.text); onSave({note:noteRes?noteRes[0]:{created_at:new Date().toISOString(),text:noteContent}}); }catch(e){alert("Erreur : "+e.message);} setSaving(false); };
  return (
    <>
      <div style={S.modalBody}>
        <div style={S.formGroup}><label style={S.label}>Date de la consultation</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...S.input,width:"100%",boxSizing:"border-box"}}/></div>
        <SectionTitle>Poids du jour</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={S.formGroup}><label style={S.label}>Poids (kg)</label><input type="number" step="0.1" value={poids} onChange={e=>setPoids(e.target.value)} placeholder="72.5" style={S.input}/></div>
        </div>
        <SectionTitle>Bilan du jour</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <FormSelect label="Sommeil" value={sommeil} onChange={setSommeil} options={[{v:"",l:"-"},...Object.entries(SOMMEIL_FR).map(([v,l])=>({v,l}))]}/>
          <FormSelect label="Transit" value={transit} onChange={setTransit} options={[{v:"",l:"-"},...Object.entries(TRANSIT_FR).map(([v,l])=>({v,l}))]}/>
          <FormSelect label="Moral (1 a 5)" value={moral} onChange={setMoral} options={[{v:"",l:"-"},{v:"1",l:"1 - Tres mauvais"},{v:"2",l:"2 - Mauvais"},{v:"3",l:"3 - Moyen"},{v:"4",l:"4 - Bon"},{v:"5",l:"5 - Excellent"}]}/>
        </div>
        <SectionTitle>Notes de consultation</SectionTitle>
        <textarea style={{...S.textarea,width:"100%",minHeight:100,boxSizing:"border-box"}} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Observations, ressentis du patient, conseils donnes..."/>
        <div style={{marginTop:16}}><button style={{...S.btn("secondary"),fontSize:12,width:"100%",justifyContent:"center"}} onClick={()=>setShowMens(!showMens)}>{showMens?"Masquer les mensurations":"+ Ajouter des mensurations (optionnel)"}</button></div>
        {showMens&&(<div style={{marginTop:14}}>
          <div style={{fontSize:11,fontWeight:600,color:"#3D5A47",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Mensurations (cm)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>{[["Nombril","nombril"],["Hanche","hanche"],["Cuisse D","cuisse_d"],["Bras D","bras_d"]].map(([l,k])=>(<div key={k} style={S.formGroup}><label style={S.label}>{l}</label><input type="number" step="0.1" value={mens[k]} onChange={e=>setMens(m=>({...m,[k]:e.target.value}))} placeholder="0" style={S.input}/></div>))}</div>
          <div style={{fontSize:11,fontWeight:600,color:"#3D5A47",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Composition corporelle</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{[["MG %","masse_grasse"],["MH %","masse_hydrique"],["MM %","masse_musculaire"],["IMC","imc"]].map(([l,k])=>(<div key={k} style={S.formGroup}><label style={S.label}>{l}</label><input type="number" step="0.1" value={mens[k]} onChange={e=>setMens(m=>({...m,[k]:e.target.value}))} placeholder="0" style={S.input}/></div>))}</div>
        </div>)}
      </div>
      <div style={S.modalFooter}>
        <button style={S.btn("primary")} onClick={save} disabled={saving}>{saving?"Enregistrement...":"Enregistrer la consultation"}</button>
      </div>
    </>
  );
}

function AgendaView({rdvList, loadingRDV, patients, onAddRDV, onDeleteRDV}) {
  const today=new Date().toISOString().split("T")[0];
  const upcoming=rdvList.filter(r=>r.date>=today);
  const past=[...rdvList.filter(r=>r.date<today)].reverse();
  const RDVCard=({r,dim})=>(<div style={{...S.infoCard,display:"flex",alignItems:"center",gap:16,padding:"14px 20px",opacity:dim?0.6:1}}><div style={{background:dim?"#8A7968":"#C4956A",color:"white",borderRadius:10,padding:"8px 12px",textAlign:"center",minWidth:50}}><div style={{fontSize:18,fontWeight:600}}>{new Date(r.date+"T00:00:00").getDate()}</div><div style={{fontSize:9,textTransform:"uppercase"}}>{new Date(r.date+"T00:00:00").toLocaleDateString("fr-FR",{month:"short"})}</div></div><div style={{flex:1}}><div style={{fontWeight:600,color:"#2A2118",fontSize:14}}>{r.patients?.prenom} {r.patients?.nom}</div><div style={{fontSize:12,color:"#8A7968",marginTop:2}}>{r.heure.slice(0,5)} — {r.duree} min{r.note?" · "+r.note:""}</div></div><button onClick={()=>onDeleteRDV(r.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#c8503c",fontSize:20}}>x</button></div>);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118"}}>Rendez-vous a venir</div><button style={S.btn("primary")} onClick={onAddRDV}>+ Nouveau RDV</button></div>
      {loadingRDV?<Spinner/>:upcoming.length===0?<div style={S.emptyState}><div style={{fontSize:40,marginBottom:12,opacity:.4}}>📅</div><div style={{fontFamily:"Georgia,serif",fontSize:19,color:"#2A2118",opacity:.6,marginBottom:6}}>Aucun rendez-vous</div></div>:upcoming.map((r,i)=><RDVCard key={i} r={r}/>)}
      {past.length>0&&(<div style={{marginTop:24}}><div style={{fontFamily:"Georgia,serif",fontSize:15,color:"#8A7968",marginBottom:12}}>Passes</div>{past.map((r,i)=><RDVCard key={i} r={r} dim/>)}</div>)}
    </div>
  );
}

function LoginPage({onLogin, error, loading}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FAF7F2",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:"white",borderRadius:20,padding:"48px 40px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(42,33,24,0.12)",border:"1px solid #E8DDD0"}}>
        <div style={{textAlign:"center",marginBottom:36}}><div style={{fontFamily:"Georgia,serif",fontSize:28,color:"#2A2118",marginBottom:6}}>SoDiet</div><div style={{fontSize:11,color:"#C4956A",letterSpacing:"2px",textTransform:"uppercase"}}>Espace praticien</div></div>
        <div style={S.formGroup}><label style={S.label}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={{...S.input,width:"100%",boxSizing:"border-box"}}/></div>
        <div style={{...S.formGroup,marginBottom:24}}><label style={S.label}>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{...S.input,width:"100%",boxSizing:"border-box"}}/></div>
        {error&&<div style={{background:"#fff0ee",border:"1px solid #f5c0b8",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#c8503c",marginBottom:16}}>{error}</div>}
        <button onClick={()=>onLogin(email,password)} disabled={loading} style={{width:"100%",padding:"12px",background:"#C4956A",color:"white",border:"none",borderRadius:10,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>{loading?"Connexion...":"Se connecter"}</button>
      </div>
    </div>
  );
}

function PatientCard({p,onClick}) {
  const bmi=calcBMI(p.poids,p.taille);
  return (
    <div style={S.card} onClick={onClick}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}><div style={S.avatar(p.id)}>{initials(p)}</div><div><div style={{fontFamily:"Georgia,serif",fontSize:16,color:"#2A2118"}}>{p.prenom} {p.nom}</div><div style={{fontSize:12,color:"#8A7968"}}>{getAge(p.ddn)}{p.sexe?" - "+(p.sexe==="F"?"Femme":p.sexe==="H"?"Homme":"Autre"):""}</div></div></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{p.objectif&&<span style={S.tag("goal")}>{GOALS_FR[p.objectif]}</span>}{(p.diets||[]).slice(0,2).map(d=><span key={d} style={S.tag("diet")}>{DIET_FR[d]||d}</span>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,paddingTop:12,borderTop:"1px solid #F0EBE1"}}>{[["kg",p.poids],["IMC",bmi],["obj.",p.poids_obj]].map(([k,v])=>(<div key={k} style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:600,color:"#2A2118"}}>{v||"-"}</div><div style={{fontSize:10,color:"#8A7968",textTransform:"uppercase",letterSpacing:"0.8px",marginTop:1}}>{k}</div></div>))}</div>
    </div>
  );
}

// ── Profile View avec onglets ─────────────────────────────────────────────────
function ProfileView({p, plans, notes, token, onBack, onEdit, onDelete, onGenPlan, onAddNote, onConsultation, onExportPDF, onPlansChange, loading}) {
  const [activeTab, setActiveTab] = useState("resume");
  const bmi = calcBMI(p.poids, p.taille);
  const mb = calcMB(p);
  const det = calcDET(p);
  const moralEmojis = ["","😞","😕","😐","🙂","😄"];
  const TABS = [["resume","📋","Resume"],["suivi","⚖️","Suivi"],["plans","🥗","Plans"],["notes","📝","Notes"]];

  return (
    <div>
      <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,color:"#8A7968",fontSize:13,cursor:"pointer",marginBottom:20,background:"none",border:"none",fontFamily:"'DM Sans',sans-serif"}}>← Retour</button>

      {/* Header patient */}
      <div style={{...S.infoCard,display:"flex",alignItems:"flex-start",gap:24,padding:"24px 28px",marginBottom:0,borderRadius:"14px 14px 0 0",borderBottom:"none"}}>
        <div style={S.avatar(p.id,60)}>{initials(p)}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:22,color:"#2A2118",marginBottom:3}}>{p.prenom} {p.nom}</div>
          <div style={{fontSize:13,color:"#8A7968",marginBottom:10}}>{getAge(p.ddn)}{p.sexe?" - "+(p.sexe==="F"?"Femme":p.sexe==="H"?"Homme":"Autre"):""}{p.email?" · "+p.email:""}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {p.objectif&&<span style={S.tag("goal")}>{GOALS_FR[p.objectif]}</span>}
            {(p.diets||[]).map(d=><span key={d} style={S.tag("diet")}>{DIET_FR[d]||d}</span>)}
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button style={S.btn("secondary")} onClick={onEdit}>Modifier</button>
          <button style={S.btn("primary")} onClick={onConsultation}>+ Consultation</button>
          <button style={S.btn("forest")} onClick={onGenPlan}>+ Plan</button>
          <button style={{...S.btn("secondary"),color:"#3D5A47",border:"1px solid #3D5A47"}} onClick={onExportPDF}>PDF</button>
        </div>
      </div>

      {/* Onglets */}
      <div style={{background:"white",borderLeft:"1px solid #E8DDD0",borderRight:"1px solid #E8DDD0",display:"flex",overflowX:"auto"}}>
        {TABS.map(([id,ic,label])=>(
          <div key={id} style={S.tab(activeTab===id)} onClick={()=>setActiveTab(id)}>
            {ic} {label}
          </div>
        ))}
      </div>

      {/* Contenu onglets */}
      <div style={{background:"white",border:"1px solid #E8DDD0",borderTop:"none",borderRadius:"0 0 14px 14px",padding:24,boxShadow:"0 4px 20px rgba(42,33,24,0.07)",marginBottom:18}}>

        {/* ── RESUME ── */}
        {activeTab==="resume"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:22}}>
            <div>
              <div style={S.infoTitle}>Morphologie</div>
              {[["Taille",p.taille?p.taille+" cm":"-"],["Poids initial",p.poids?p.poids+" kg":"-"],["Poids objectif",p.poids_obj?p.poids_obj+" kg":"-"],["IMC",bmi],["Metabolisme de base",mb?mb+" kcal/j":"-"],["Depenses totales",det?det+" kcal/j":"-"]].map(([k,v])=>(<div key={k} style={S.infoRow}><span style={{color:"#8A7968"}}>{k}</span><span style={{fontWeight:500}}>{v}</span></div>))}
              <div style={{marginTop:18}}>
                <div style={S.infoTitle}>Mode de vie</div>
                {[["Activite",ACTIVITE_FR[p.activite]||"-"],["Objectif",GOALS_FR[p.objectif]||"-"]].map(([k,v])=>(<div key={k} style={S.infoRow}><span style={{color:"#8A7968"}}>{k}</span><span style={{fontWeight:500}}>{v}</span></div>))}
                {p.allergies&&<div style={S.infoRow}><span style={{color:"#8A7968"}}>Allergies</span><span style={{fontWeight:500,fontSize:12,textAlign:"right",maxWidth:200}}>{p.allergies}</span></div>}
                {p.antecedents&&<div style={S.infoRow}><span style={{color:"#8A7968"}}>Antecedents</span><span style={{fontWeight:500,fontSize:12,textAlign:"right",maxWidth:200}}>{p.antecedents}</span></div>}
              </div>
            </div>
            <div>
              {(p.sommeil||p.transit||p.moral||p.alimentation||p.prise_de_sang)&&(
                <div>
                  <div style={S.infoTitle}>Bilan sante initial</div>
                  {p.sommeil&&<div style={S.infoRow}><span style={{color:"#8A7968"}}>Sommeil</span><span style={{fontWeight:500}}>{SOMMEIL_FR[p.sommeil]||p.sommeil}</span></div>}
                  {p.transit&&<div style={S.infoRow}><span style={{color:"#8A7968"}}>Transit</span><span style={{fontWeight:500}}>{TRANSIT_FR[p.transit]||p.transit}</span></div>}
                  {p.moral&&<div style={S.infoRow}><span style={{color:"#8A7968"}}>Moral</span><span style={{fontWeight:500}}>{moralEmojis[p.moral]||""} {p.moral}/5</span></div>}
                  {p.alimentation&&<div style={S.infoRow}><span style={{color:"#8A7968"}}>Alimentation</span><span style={{fontWeight:500}}>{ALIM_FR[p.alimentation]||p.alimentation}</span></div>}
                  {p.prise_de_sang&&<div style={{padding:"7px 0",fontSize:13}}><div style={{color:"#8A7968",marginBottom:4}}>Prise de sang</div><div style={{fontSize:12,background:"#F0EBE1",borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>{p.prise_de_sang}</div></div>}
                </div>
              )}
              {p.notes&&<div style={{marginTop:18}}><div style={S.infoTitle}>Notes initiales</div><p style={{fontSize:13,color:"#3D3228",lineHeight:1.6}}>{p.notes}</p></div>}
              <div style={{textAlign:"right",marginTop:24}}>
                <button onClick={onDelete} style={{...S.btn("secondary"),color:"#c8503c",border:"1px solid #c8503c",background:"white",fontSize:12}}>Supprimer ce patient</button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUIVI ── */}
        {activeTab==="suivi"&&(
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118",marginBottom:18}}>Suivi du poids</div>
            <PoidsSection patientId={p.id} objectif={p.poids_obj} token={token}/>
            <div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118",margin:"24px 0 18px"}}>Mensurations & composition corporelle</div>
            <MensurationsSection patientId={p.id} token={token}/>
          </div>
        )}

        {/* ── PLANS ── */}
        {activeTab==="plans"&&(
          <PlansSection plans={plans} loading={loading} token={token} onNewPlan={onGenPlan} onPlansChange={onPlansChange}/>
        )}

        {/* ── NOTES ── */}
        {activeTab==="notes"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118"}}>Notes de consultation</div>
              <button style={S.btn("secondary")} onClick={onAddNote}>+ Ajouter une note</button>
            </div>
            {loading?<Spinner/>:notes.length===0
              ?<div style={S.emptyState}><div style={{fontSize:36,marginBottom:12,opacity:.4}}>📝</div><div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118",opacity:.6,marginBottom:6}}>Aucune note</div></div>
              :notes.map((n,i)=>(
                <div key={i} style={{background:"#F0EBE1",borderRadius:9,padding:"14px 16px",borderLeft:"3px solid #7A9E7E",marginBottom:10}}>
                  <div style={{fontSize:11,color:"#8A7968",marginBottom:6}}>{new Date(n.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</div>
                  <div style={{fontSize:13,color:"#3D3228",lineHeight:1.6,whiteSpace:"pre-line"}}>{n.text}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(()=>{try{const s=localStorage.getItem("sodiet_session");return s?JSON.parse(s):null;}catch{return null;}});
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [panel, setPanel] = useState("dashboard");
  const [currentId, setCurrentId] = useState(null);
  const [profilePlans, setProfilePlans] = useState([]);
  const [profileNotes, setProfileNotes] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [rdvList, setRdvList] = useState([]);
  const [loadingRDV, setLoadingRDV] = useState(false);
  const [rdvForm, setRdvForm] = useState(EMPTY_RDV);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [planMode, setPlanMode] = useState("choice");
  const [planDuration, setPlanDuration] = useState("7j");
  const [planInstr, setPlanInstr] = useState("");
  const [planState, setPlanState] = useState("idle");
  const [planResult, setPlanResult] = useState(null);
  const [planError, setPlanError] = useState("");
  const [manualDays, setManualDays] = useState([]);
  const [manualTips, setManualTips] = useState("");
  const [noteText, setNoteText] = useState("");
  const [totalPlans, setTotalPlans] = useState(0);

  const token = session?.access_token;
  const currentPatient = patients.find(p=>p.id===currentId);
  const ff = (k) => (v) => setForm(f=>({...f,[k]:v}));

  const handleLogin=async(email,password)=>{ setAuthLoading(true); setAuthError(""); const data=await db.login(email,password); if(data.access_token){localStorage.setItem("sodiet_session",JSON.stringify(data));setSession(data);}else{setAuthError("Email ou mot de passe incorrect");} setAuthLoading(false); };
  const handleLogout=async()=>{ await db.logout(token); localStorage.removeItem("sodiet_session"); setSession(null); setPatients([]); };

  useEffect(()=>{ if(!session) return; setLoadingPatients(true); db.getPatients(token).then(data=>{setPatients(data||[]);setLoadingPatients(false);}).catch(()=>setLoadingPatients(false)); },[session]);
  useEffect(()=>{ if(!session) return; setLoadingRDV(true); db.getRDV(token).then(data=>{setRdvList(data||[]);setLoadingRDV(false);}).catch(()=>setLoadingRDV(false)); },[session]);
useEffect(()=>{ if(panel==="profile"&&currentId&&token){ setProfileLoading(true); Promise.all([db.getPlans(currentId,token),db.getNotes(currentId,token),db.getPoids(currentId,token),db.getMensurations(currentId,token)]).then(([plans,notes,poids,mens])=>{setProfilePlans(plans||[]);setProfileNotes(notes||[]);setProfilePoids(poids||[]);setProfileMensurations(mens||[]);setProfileLoading(false);}).catch(()=>setProfileLoading(false)); } },[panel,currentId]);
  useEffect(()=>{ if(!session) return; const refresh=async()=>{ try{ const res=await fetch(SUPA_URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})}); const data=await res.json(); if(data.access_token){localStorage.setItem("sodiet_session",JSON.stringify(data));setSession(data);} }catch(e){console.error("Refresh error:",e);} }; const interval=setInterval(refresh,45*60*1000); return ()=>clearInterval(interval); },[session]);

  const closeModal=()=>{ setModal(null); setPlanMode("choice"); setPlanState("idle"); setPlanResult(null); setPlanInstr(""); setPlanDuration("7j"); setPlanError(""); setManualDays([]); setManualTips(""); setRdvForm(EMPTY_RDV); };

  const savePatient=async()=>{ if(!form.prenom.trim()||!form.nom.trim()){alert("Prenom et nom requis");return;} setSaving(true); try{ const payload={prenom:form.prenom,nom:form.nom,ddn:form.ddn||null,sexe:form.sexe||null,email:form.email||null,tel:form.tel||null,taille:form.taille?+form.taille:null,poids:form.poids?+form.poids:null,poids_obj:form.poids_obj?+form.poids_obj:null,objectif:form.objectif,activite:form.activite,diets:form.diets||[],antecedents:form.antecedents||null,allergies:form.allergies||null,notes:form.notes||null,sommeil:form.sommeil||null,transit:form.transit||null,moral:form.moral?+form.moral:null,alimentation:form.alimentation||null,prise_de_sang:form.prise_de_sang||null}; if(editId){await db.updatePatient(editId,payload,token);setPatients(ps=>ps.map(p=>p.id===editId?{...p,...payload}:p));}else{const [created]=await db.addPatient(payload,token);setPatients(ps=>[created,...ps]);} closeModal(); }catch(e){alert("Erreur : "+e.message);} setSaving(false); };
  const deletePatient=async(id)=>{ if(!confirm("Supprimer ce patient ?")) return; await db.deletePatient(id,token); setPatients(ps=>ps.filter(p=>p.id!==id)); setPanel("patients"); };
  const saveNote=async()=>{ if(!noteText.trim()) return; setSaving(true); try{const [note]=await db.addNote({patient_id:currentId,text:noteText},token);setProfileNotes(ns=>[note,...ns]);setNoteText("");closeModal();}catch(e){alert("Erreur : "+e.message);} setSaving(false); };
  const saveRDV=async()=>{ if(!rdvForm.patient_id||!rdvForm.date||!rdvForm.heure){alert("Patient, date et heure requis");return;} setSaving(true); try{const [rdv]=await db.addRDV(rdvForm,token);setRdvList(rs=>[...rs,rdv].sort((a,b)=>a.date+a.heure>b.date+b.heure?1:-1));closeModal();}catch(e){alert("Erreur : "+e.message);} setSaving(false); };
  const deleteRDV=async(id)=>{ await db.deleteRDV(id,token); setRdvList(rs=>rs.filter(r=>r.id!==id)); };
  const saveManualPlan=async()=>{ setSaving(true); const durLabel=planDuration==="journee"?"Journee type":planDuration==="7j"?"7 jours":"3 jours"; try{const [plan]=await db.addPlan({patient_id:currentId,duration:durLabel,mode:"manual",tips:manualTips,days:manualDays},token);setProfilePlans(ps=>[plan,...ps]);setTotalPlans(c=>c+1);setPlanResult({days:manualDays,tips:manualTips});setPlanState("done");}catch(e){alert("Erreur : "+e.message);} setSaving(false); };

  const generatePlan=useCallback(async()=>{ const p=patients.find(x=>x.id===currentId); if(!p) return; setPlanState("loading");setPlanError(""); const dietStr=(p.diets||[]).map(d=>DIET_FR[d]||d).join(", ")||"aucune restriction"; const isJournee=planDuration==="journee"; const daysCount=isJournee?1:planDuration==="7j"?7:3; const durLabel=isJournee?"Journee type":planDuration==="7j"?"7 jours":"3 jours"; const prompt="Tu es un nutritionniste expert. Genere un plan alimentaire en JSON strict.\n\nProfil: "+p.prenom+", "+(p.sexe==="F"?"Femme":p.sexe==="H"?"Homme":"N/A")+", "+(p.taille||"?")+"cm, "+(p.poids||"?")+"kg, objectif "+(p.poids_obj||"?")+"kg, "+(GOALS_FR[p.objectif]||"?")+", "+(ACTIVITE_FR[p.activite]||"?")+", regime: "+dietStr+", allergies: "+(p.allergies||"aucune")+"."+(planInstr?" Instructions: "+planInstr+".":"")+"\n\nReponds UNIQUEMENT avec ce JSON (rien d'autre, pas de backticks) pour "+(isJournee?"une journee type":daysCount+" jours")+". Inclure grammage pour chaque repas. Sois CONCIS (max 20 mots par repas):\n{\"days\":[{\"label\":\""+(isJournee?"Journee type":"Jour 1")+"\",\"meals\":[{\"name\":\"Petit-dejeuner\",\"content\":\"description\",\"grammage\":\"ex: 150g yaourt, 40g granola\"},{\"name\":\"Dejeuner\",\"content\":\"description\",\"grammage\":\"ex: 150g poulet, 80g riz\"},{\"name\":\"Collation\",\"content\":\"description\",\"grammage\":\"ex: 1 pomme, 30g amandes\"},{\"name\":\"Diner\",\"content\":\"description\",\"grammage\":\"ex: 180g saumon, 200g legumes\"}]}],\"tips\":\"Un conseil court.\"}";
    try{ const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true","x-api-key":"VOTRE_CLE_ICI"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:prompt}]})}); if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||"HTTP "+res.status);} const data=await res.json(); const raw=(data.content||[]).map(c=>c.text||"").join(""); const clean=raw.replace(/```json|```/g,"").trim(); let parsed; try{parsed=JSON.parse(clean);}catch(e){const s=clean.indexOf("{"),end=clean.lastIndexOf("}");if(s===-1||end===-1)throw new Error("JSON invalide");parsed=JSON.parse(clean.slice(s,end+1).replace(/,\s*([}\]])/g,"$1"));} const [plan]=await db.addPlan({patient_id:currentId,duration:durLabel,mode:"ai",tips:parsed.tips||"",days:parsed.days||[]},token); setProfilePlans(ps=>[plan,...ps]);setTotalPlans(c=>c+1); setPlanResult(parsed);setPlanState("done"); }catch(e){setPlanError(e.message||"Erreur inconnue");setPlanState("error");}
  },[patients,currentId,planDuration,planInstr,token]);

  const exportPatientPDF=(p,plans,notes)=>{ const win=window.open("","_blank"); const bmi=calcBMI(p.poids,p.taille); const plansHtml=(plans||[]).map((plan,i)=>"<div style='margin-bottom:24px'><div style='background:#C4956A;color:white;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:600'>Plan "+(i+1)+" - "+new Date(plan.created_at).toLocaleDateString("fr-FR")+" ("+plan.duration+")</div><div style='border:1px solid #E8DDD0;border-top:none;padding:12px 14px;border-radius:0 0 6px 6px'>"+(plan.days||[]).map(day=>"<div style='margin-bottom:10px'><div style='font-weight:600;color:#8B5E3C;font-size:12px;text-transform:uppercase;margin-bottom:4px'>"+day.label+"</div>"+(day.meals||[]).filter(m=>m.content).map(m=>"<div style='padding:4px 0;border-bottom:1px solid #f5f5f5;font-size:13px'><strong style='color:#8A7968'>"+m.name+(m.grammage?" <span style='color:#C4956A;font-size:11px'>("+m.grammage+")</span>":"")+" :</strong> "+m.content+"</div>").join("")+"</div>").join("")+(plan.tips?"<div style='background:#f0f7f2;border-left:3px solid #7A9E7E;padding:8px 12px;margin-top:8px;font-size:12px'>Conseils : "+plan.tips+"</div>":"")+"</div></div>").join(""); const notesHtml=(notes||[]).map(n=>"<div style='border-left:3px solid #7A9E7E;padding:8px 12px;margin-bottom:8px;background:#f9f9f9'><div style='font-size:11px;color:#8A7968;margin-bottom:4px'>"+new Date(n.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+"</div><div style='font-size:13px;white-space:pre-line'>"+n.text+"</div></div>").join(""); win.document.write("<!DOCTYPE html><html><head><title>Dossier - "+p.prenom+" "+p.nom+"</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#3D3228;padding:0 20px}h1{color:#2A2118;font-size:26px}h2{color:#C4956A;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #E8DDD0}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px}.stat{background:#FAF7F2;border:1px solid #E8DDD0;border-radius:8px;padding:12px;text-align:center}.stat-val{font-size:18px;font-weight:600;color:#2A2118}.stat-label{font-size:10px;color:#8A7968;text-transform:uppercase;margin-top:2px}@media print{button{display:none}}</style></head><body><h1>"+p.prenom+" "+p.nom+"</h1><p style='color:#8A7968;font-size:13px;margin-bottom:24px'>"+getAge(p.ddn)+(p.sexe?" - "+(p.sexe==="F"?"Femme":"Homme"):"")+" | SoDiet - "+new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+"</p><h2>Morphologie</h2><div class='grid'><div class='stat'><div class='stat-val'>"+(p.taille||"-")+"cm</div><div class='stat-label'>Taille</div></div><div class='stat'><div class='stat-val'>"+(p.poids||"-")+"kg</div><div class='stat-label'>Poids initial</div></div><div class='stat'><div class='stat-val'>"+(p.poids_obj||"-")+"kg</div><div class='stat-label'>Objectif</div></div><div class='stat'><div class='stat-val'>"+bmi+"</div><div class='stat-label'>IMC</div></div></div>"+(p.allergies?"<div style='background:#fff8f5;border:1px solid #f5c0b8;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:12px'><strong>Allergies :</strong> "+p.allergies+"</div>":"")+(notesHtml?"<h2>Notes</h2>"+notesHtml:"")+(plansHtml?"<h2>Plans alimentaires</h2>"+plansHtml:"")+"<br/><button onclick='window.print()' style='padding:10px 24px;background:#C4956A;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px'>Imprimer / PDF</button></body></html>"); win.document.close(); };

  const handleShare=(result)=>{ const lines=(result.days||[]).flatMap(day=>["\n== "+day.label+" ==",...(day.meals||[]).filter(m=>m.content).map(m=>m.name+(m.grammage?" ("+m.grammage+")":"")+" : "+m.content)]); if(result.tips)lines.push("\nConseils : "+result.tips); window.location.href="mailto:"+(currentPatient?.email||"")+"?subject=Plan alimentaire SoDiet&body="+encodeURIComponent("Plan alimentaire - "+(currentPatient?.prenom)+" "+(currentPatient?.nom)+"\n"+lines.join("\n")); };
  const handlePrint=(result)=>{ const win=window.open("","_blank"); const daysHtml=(result.days||[]).map(day=>"<div style='margin-bottom:18px'><div style='background:#C4956A;color:white;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:600'>"+day.label+"</div><div style='border:1px solid #E8DDD0;border-top:none;border-radius:0 0 6px 6px;padding:10px 14px'>"+(day.meals||[]).filter(m=>m.content).map(m=>"<div style='padding:6px 0;border-bottom:1px solid #f0ebe1'><strong style='color:#8A7968'>"+m.name+"</strong>"+(m.grammage?" <span style='color:#C4956A;font-size:11px'>("+m.grammage+")</span>":"")+" : "+m.content+"</div>").join("")+"</div></div>").join(""); win.document.write("<!DOCTYPE html><html><head><title>Plan SoDiet</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;color:#3D3228}@media print{button{display:none}}</style></head><body><h1>Plan alimentaire SoDiet</h1><p style='color:#8A7968;margin-bottom:28px'>"+(currentPatient?.prenom)+" "+(currentPatient?.nom)+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+daysHtml+(result.tips?"<div style='background:#f0f7f2;border-left:3px solid #7A9E7E;padding:12px;margin-top:8px'>Conseils : "+result.tips+"</div>":"")+"<br/><button onclick='window.print()' style='padding:10px 20px;background:#C4956A;color:white;border:none;border-radius:8px;cursor:pointer'>Imprimer</button></body></html>"); win.document.close(); };

  const filteredPatients=patients.filter(p=>(p.prenom+" "+p.nom).toLowerCase().includes(search.toLowerCase()));
  const PLAN_DURATIONS=[["journee","☀️","Journee type","Modele de journee ideale"],["7j","🗓️","1 semaine","Plan complet"]];

  if(!session) return <LoginPage onLogin={handleLogin} error={authError} loading={authLoading}/>;

  return (
    <div style={S.app}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input:focus,select:focus,textarea:focus{border-color:#C4956A !important;outline:none;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#C4956A;border-radius:2px;}"}</style>

      <aside style={S.sidebar}>
        <div style={S.logoBox}><div style={S.logoText}>SoDiet</div><div style={S.logoSub}>Espace praticien</div></div>
        <div style={S.navArea}>
          <div style={S.navLabel}>Menu</div>
          <div style={S.navItem(panel==="dashboard")} onClick={()=>setPanel("dashboard")}><span>⊞</span>Tableau de bord</div>
          <div style={S.navItem(panel==="patients"||panel==="profile")} onClick={()=>setPanel("patients")}><span>👥</span>Mes patients</div>
          <div style={S.navItem(panel==="agenda")} onClick={()=>setPanel("agenda")}><span>📅</span>Agenda</div>
          {patients.length>0&&<><div style={{...S.navLabel,marginTop:16}}>Patients recents</div>{patients.slice(0,8).map(p=>(<div key={p.id} style={S.patChip(currentId===p.id&&panel==="profile")} onClick={()=>{setCurrentId(p.id);setPanel("profile");}}><div style={S.avatar(p.id,26)}>{initials(p)}</div><span style={{fontSize:12,color:"rgba(255,255,255,0.65)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.prenom} {p.nom}</span></div>))}</>}
        </div>
        <div style={{padding:"16px 12px",borderTop:"1px solid rgba(255,255,255,0.07)"}}><div onClick={handleLogout} style={{...S.navItem(false),cursor:"pointer"}}><span>⎋</span>Deconnexion</div></div>
      </aside>

      <main style={S.main}>
        <div style={S.topbar}>
          <div style={S.pageTitle}>{panel==="dashboard"?"Tableau de bord":panel==="patients"?"Mes patients":panel==="agenda"?"Agenda":currentPatient?(currentPatient.prenom+" "+currentPatient.nom):"Patients"}</div>
          <button style={S.btn("primary")} onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setModal("patient");}}>+ Nouveau patient</button>
        </div>

        <div style={S.content}>
          {panel==="dashboard"&&(
            <div>
              <div style={S.statsGrid}>{[["Total patients",patients.length,"dans votre cabinet"],["Perte de poids",patients.filter(p=>p.objectif==="perte_poids").length,"objectif principal"],["RDV a venir",rdvList.filter(r=>r.date>=new Date().toISOString().split("T")[0]).length,"rendez-vous planifies"],["Plans crees",totalPlans,"cette session"]].map(([l,v,s])=>(<div key={l} style={S.statCard}><div style={S.statLabel}>{l}</div><div style={S.statValue}>{v}</div><div style={S.statSub}>{s}</div></div>))}</div>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:22}}>
                <div style={{...S.infoCard,padding:28}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118"}}>Patients recents</div><button style={{...S.btn("secondary"),fontSize:12}} onClick={()=>setPanel("patients")}>Voir tous</button></div>
                  {loadingPatients?<Spinner/>:patients.length===0?<div style={S.emptyState}><div style={{fontSize:40,marginBottom:12,opacity:.4}}>🌿</div><div style={{fontFamily:"Georgia,serif",fontSize:19,color:"#2A2118",opacity:.6,marginBottom:6}}>Aucun patient</div></div>:<div style={S.patientsGrid}>{patients.slice(0,4).map(p=><PatientCard key={p.id} p={p} onClick={()=>{setCurrentId(p.id);setPanel("profile");}}/>)}</div>}
                </div>
                <div style={{...S.infoCard,padding:22}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontFamily:"Georgia,serif",fontSize:15,color:"#2A2118"}}>Prochains RDV</div><button style={{...S.btn("secondary"),fontSize:11,padding:"5px 10px"}} onClick={()=>setPanel("agenda")}>Voir tous</button></div>
                  {loadingRDV?<Spinner/>:rdvList.filter(r=>r.date>=new Date().toISOString().split("T")[0]).slice(0,5).length===0?<p style={{fontSize:12,color:"#8A7968",fontStyle:"italic"}}>Aucun RDV a venir</p>:rdvList.filter(r=>r.date>=new Date().toISOString().split("T")[0]).slice(0,5).map((r,i)=>(<div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F0EBE1"}}><div style={{background:"#C4956A",color:"white",borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:44,flexShrink:0}}><div style={{fontSize:16,fontWeight:600}}>{new Date(r.date+"T00:00:00").getDate()}</div><div style={{fontSize:9,textTransform:"uppercase"}}>{new Date(r.date+"T00:00:00").toLocaleDateString("fr-FR",{month:"short"})}</div></div><div><div style={{fontSize:13,fontWeight:600,color:"#2A2118"}}>{r.patients?.prenom} {r.patients?.nom}</div><div style={{fontSize:11,color:"#8A7968"}}>{r.heure.slice(0,5)} — {r.duree} min</div></div></div>))}
                </div>
              </div>
            </div>
          )}

          {panel==="patients"&&(
            <div>
              <div style={{position:"relative",marginBottom:24}}><span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#8A7968"}}>🔍</span><input style={{...S.input,width:"100%",paddingLeft:40,borderRadius:12}} placeholder="Rechercher un patient..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
              {loadingPatients?<Spinner/>:filteredPatients.length===0?<div style={S.emptyState}><div style={{fontSize:40,marginBottom:12,opacity:.4}}>🌿</div><div style={{fontFamily:"Georgia,serif",fontSize:19,color:"#2A2118",opacity:.6,marginBottom:6}}>{search?"Aucun resultat":"Aucun patient"}</div></div>:<div style={S.patientsGrid}>{filteredPatients.map(p=><PatientCard key={p.id} p={p} onClick={()=>{setCurrentId(p.id);setPanel("profile");}}/>)}</div>}
            </div>
          )}

          {panel==="agenda"&&<AgendaView rdvList={rdvList} loadingRDV={loadingRDV} patients={patients} onAddRDV={()=>setModal("rdv")} onDeleteRDV={deleteRDV}/>}

          {panel==="profile"&&currentPatient&&(
            <ProfileView p={currentPatient} plans={profilePlans} notes={profileNotes} token={token} loading={profileLoading}
              onBack={()=>setPanel("patients")}
              onEdit={()=>{setForm({...EMPTY_FORM,...currentPatient,poids_obj:currentPatient.poids_obj||"",moral:currentPatient.moral||""});setEditId(currentPatient.id);setModal("patient");}}
              onDelete={()=>deletePatient(currentPatient.id)}
              onGenPlan={()=>{setPlanMode("choice");setPlanState("idle");setPlanResult(null);setModal("plan");}}
              onAddNote={()=>setModal("note")}
              onConsultation={()=>setModal("consultation")}
              onExportPDF={()=>exportPatientPDF(currentPatient,profilePlans,profileNotes)}
              onPlansChange={setProfilePlans}
            />
          )}
        </div>
      </main>

      {modal==="patient"&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div style={S.modal}>
            <div style={S.modalHeader}><div style={S.modalTitle}>{editId?"Modifier le patient":"Nouveau patient"}</div><button onClick={closeModal} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E8DDD0",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>
            <div style={S.modalBody}>
              <SectionTitle>Informations personnelles</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <FormInput label="Prenom *" value={form.prenom} onChange={ff("prenom")} placeholder="Sophie"/>
                <FormInput label="Nom *" value={form.nom} onChange={ff("nom")} placeholder="Martin"/>
                <FormInput label="Date de naissance" type="date" value={form.ddn} onChange={ff("ddn")}/>
                <FormSelect label="Sexe" value={form.sexe} onChange={ff("sexe")} options={[{v:"",l:"-"},{v:"F",l:"Femme"},{v:"H",l:"Homme"},{v:"A",l:"Autre"}]}/>
                <FormInput label="Email" type="email" value={form.email} onChange={ff("email")} placeholder="email@exemple.com"/>
                <FormInput label="Telephone" value={form.tel} onChange={ff("tel")} placeholder="06 00 00 00 00"/>
              </div>
              <SectionTitle>Donnees morphologiques</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <FormInput label="Taille (cm)" type="number" value={form.taille} onChange={ff("taille")} placeholder="168"/>
                <FormInput label="Poids initial (kg)" type="number" value={form.poids} onChange={ff("poids")} placeholder="72"/>
                <FormInput label="Poids objectif (kg)" type="number" value={form.poids_obj} onChange={ff("poids_obj")} placeholder="65"/>
              </div>
              <SectionTitle>Objectif et mode de vie</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <FormSelect label="Objectif principal" value={form.objectif} onChange={ff("objectif")} options={Object.entries(GOALS_FR).map(([v,l])=>({v,l}))}/>
                <FormSelect label="Activite physique" value={form.activite} onChange={ff("activite")} options={Object.entries(ACTIVITE_FR).map(([v,l])=>({v,l}))}/>
              </div>
              <SectionTitle>Regime et restrictions</SectionTitle>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{Object.entries(DIET_FR).map(([v,l])=>{const checked=(form.diets||[]).includes(v);return(<label key={v} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",border:"1.5px solid "+(checked?"#C4956A":"#E8DDD0"),borderRadius:8,cursor:"pointer",fontSize:12,background:checked?"rgba(196,149,106,0.1)":"white",color:checked?"#8B5E3C":"#3D3228"}}><input type="checkbox" style={{display:"none"}} checked={checked} onChange={e=>setForm(f=>({...f,diets:e.target.checked?[...(f.diets||[]),v]:(f.diets||[]).filter(d=>d!==v)}))} />{l}</label>);})}</div>
              <SectionTitle>Bilan sante initial</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <FormSelect label="Qualite du sommeil" value={form.sommeil} onChange={ff("sommeil")} options={[{v:"",l:"-"},...Object.entries(SOMMEIL_FR).map(([v,l])=>({v,l}))]}/>
                <FormSelect label="Transit intestinal" value={form.transit} onChange={ff("transit")} options={[{v:"",l:"-"},...Object.entries(TRANSIT_FR).map(([v,l])=>({v,l}))]}/>
                <FormSelect label="Moral (1 a 5)" value={form.moral} onChange={ff("moral")} options={[{v:"",l:"-"},{v:"1",l:"1 - Tres mauvais"},{v:"2",l:"2 - Mauvais"},{v:"3",l:"3 - Moyen"},{v:"4",l:"4 - Bon"},{v:"5",l:"5 - Excellent"}]}/>
                <FormSelect label="Alimentation dominante" value={form.alimentation} onChange={ff("alimentation")} options={[{v:"",l:"-"},...Object.entries(ALIM_FR).map(([v,l])=>({v,l}))]}/>
              </div>
              <div style={S.formGroup}><label style={S.label}>Resultats prise de sang</label><textarea style={{...S.textarea,minHeight:60}} value={form.prise_de_sang} onChange={e=>ff("prise_de_sang")(e.target.value)} placeholder="Ex: cholesterol 2.1, glycemie 0.95..."/></div>
              <SectionTitle>Informations medicales</SectionTitle>
              <div style={S.formGroup}><label style={S.label}>Antecedents / pathologies</label><textarea style={S.textarea} value={form.antecedents} onChange={e=>ff("antecedents")(e.target.value)} placeholder="Ex: hypertension, diabete type 2..."/></div>
              <div style={S.formGroup}><label style={S.label}>Allergies alimentaires</label><textarea style={{...S.textarea,minHeight:55}} value={form.allergies} onChange={e=>ff("allergies")(e.target.value)} placeholder="Ex: arachides, fruits a coque..."/></div>
              <div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={S.textarea} value={form.notes} onChange={e=>ff("notes")(e.target.value)} placeholder="Observations, motivations..."/></div>
            </div>
            <div style={S.modalFooter}><button style={S.btn("secondary")} onClick={closeModal}>Annuler</button><button style={S.btn("primary")} onClick={savePatient} disabled={saving}>{saving?"Enregistrement...":"Enregistrer"}</button></div>
          </div>
        </div>
      )}

      {modal==="rdv"&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div style={{...S.modal,maxWidth:480}}>
            <div style={S.modalHeader}><div style={S.modalTitle}>Nouveau rendez-vous</div><button onClick={closeModal} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E8DDD0",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>
            <div style={S.modalBody}>
              <div style={S.formGroup}><label style={S.label}>Patient *</label><select style={S.input} value={rdvForm.patient_id} onChange={e=>setRdvForm(f=>({...f,patient_id:e.target.value}))}><option value="">Selectionnez un patient</option>{patients.map(p=><option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}</select></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><FormInput label="Date *" type="date" value={rdvForm.date} onChange={v=>setRdvForm(f=>({...f,date:v}))}/><FormInput label="Heure *" type="time" value={rdvForm.heure} onChange={v=>setRdvForm(f=>({...f,heure:v}))}/></div>
              <div style={S.formGroup}><label style={S.label}>Duree</label><select style={S.input} value={rdvForm.duree} onChange={e=>setRdvForm(f=>({...f,duree:+e.target.value}))}>{[30,45,60,90,120].map(d=><option key={d} value={d}>{d} min</option>)}</select></div>
              <div style={S.formGroup}><label style={S.label}>Note (optionnel)</label><textarea style={{...S.textarea,minHeight:80}} value={rdvForm.note} onChange={e=>setRdvForm(f=>({...f,note:e.target.value}))} placeholder="Ex: premiere consultation..."/></div>
            </div>
            <div style={S.modalFooter}><button style={S.btn("secondary")} onClick={closeModal}>Annuler</button><button style={S.btn("primary")} onClick={saveRDV} disabled={saving}>{saving?"Enregistrement...":"Enregistrer"}</button></div>
          </div>
        </div>
      )}

      {modal==="consultation"&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div style={{...S.modal,maxWidth:600}}>
            <div style={S.modalHeader}><div style={S.modalTitle}>Consultation — {currentPatient?.prenom} {currentPatient?.nom}</div><button onClick={closeModal} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E8DDD0",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>
            <ConsultationModal patient={currentPatient} token={token} onSave={(data)=>{ setProfileNotes(ns=>[data.note,...ns]); closeModal(); }}/>
          </div>
        </div>
      )}

      {modal==="plan"&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div style={{...S.modal,maxWidth:700}}>
            <div style={S.modalHeader}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {planMode!=="choice"&&planState==="idle"&&<button onClick={()=>setPlanMode("choice")} style={{background:"none",border:"none",cursor:"pointer",color:"#8A7968",fontSize:18}}>←</button>}
                <div style={S.modalTitle}>{planMode==="choice"?"Nouveau plan":planMode==="ai"?"Plan IA":"Plan manuel"}</div>
              </div>
              <button onClick={closeModal} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E8DDD0",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
            </div>
            <div style={S.modalBody}>
              {planMode==="choice"&&(<div>
                <p style={{fontSize:13,color:"#8A7968",marginBottom:20}}>Pour <strong style={{color:"#2A2118"}}>{currentPatient?.prenom} {currentPatient?.nom}</strong></p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
                  <div onClick={()=>setPlanMode("ai")} style={{background:"white",border:"2px solid #E8DDD0",borderRadius:14,padding:20,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>✦</div><div style={{fontSize:14,fontWeight:600,color:"#2A2118",marginBottom:4}}>Genere par l'IA</div><div style={{fontSize:11,color:"#8A7968",lineHeight:1.4}}>L'IA cree le plan avec grammages</div></div>
                  <div onClick={()=>{setManualDays(emptyPlan(planDuration));setManualTips("");setPlanMode("manual");}} style={{background:"white",border:"2px solid #E8DDD0",borderRadius:14,padding:20,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>✏️</div><div style={{fontSize:14,fontWeight:600,color:"#2A2118",marginBottom:4}}>Saisie manuelle</div><div style={{fontSize:11,color:"#8A7968",lineHeight:1.4}}>Vous saisissez repas et grammages</div></div>
                </div>
                <p style={{fontSize:11,color:"#8A7968",textAlign:"center",marginBottom:10}}>Duree du plan :</p>
                <div style={{display:"flex",justifyContent:"center",gap:12}}>
                  {PLAN_DURATIONS.map(([v,ic,l,s])=>(<div key={v} onClick={()=>setPlanDuration(v)} style={{background:planDuration===v?"rgba(196,149,106,0.07)":"white",border:"2px solid "+(planDuration===v?"#C4956A":"#E8DDD0"),borderRadius:12,padding:14,cursor:"pointer",textAlign:"center",minWidth:140}}><div style={{fontSize:24,marginBottom:5}}>{ic}</div><div style={{fontSize:13,fontWeight:600,color:"#2A2118"}}>{l}</div><div style={{fontSize:10,color:"#8A7968",marginTop:2}}>{s}</div></div>))}
                </div>
              </div>)}
              {planMode==="ai"&&planState==="idle"&&(<div><p style={{fontSize:13,color:"#8A7968",marginBottom:16}}>Plan IA - {planDuration==="journee"?"Journee type":"7 jours"}</p><div style={S.formGroup}><label style={S.label}>Instructions speciales (optionnel)</label><textarea style={S.textarea} value={planInstr} onChange={e=>setPlanInstr(e.target.value)} placeholder="Ex: repas rapides, budget limite..."/></div></div>)}
              {planMode==="ai"&&planState==="loading"&&(<div style={{textAlign:"center",padding:"50px 20px"}}><style>{"@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}"}</style><div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:20}}>{[0,200,400].map((d,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#C4956A",animation:"bounce 1.2s "+d+"ms infinite ease-in-out"}}/>)}</div><div style={{fontFamily:"Georgia,serif",fontSize:15,color:"#8A7968"}}>L'IA genere votre plan...</div></div>)}
              {planMode==="ai"&&planState==="error"&&(<div style={{textAlign:"center",padding:"30px 20px"}}><div style={{fontSize:32,marginBottom:12}}>⚠️</div><div style={{color:"#c8503c",fontSize:14}}>{planError}</div></div>)}
              {planMode==="manual"&&planState==="idle"&&<PlanEditor days={manualDays} tips={manualTips} onDaysChange={setManualDays} onTipsChange={setManualTips}/>}
              {planState==="done"&&planResult&&(<div style={{maxHeight:"52vh",overflowY:"auto",paddingRight:4}}><PlanDays days={planResult.days}/>{planResult.tips&&<div style={{background:"rgba(61,90,71,0.09)",borderLeft:"3px solid #7A9E7E",borderRadius:"0 10px 10px 0",padding:"12px 14px",marginTop:8}}><div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:"#3D5A47",marginBottom:5}}>Conseils</div><div style={{fontSize:13,color:"#3D3228",lineHeight:1.6}}>{planResult.tips}</div></div>}</div>)}
            </div>
            <div style={S.modalFooter}>
              {planMode==="choice"&&<span style={{fontSize:12,color:"#8A7968",flex:1,textAlign:"center"}}>Selectionnez un mode puis la duree</span>}
              {planMode==="ai"&&planState==="idle"&&<><button style={S.btn("secondary")} onClick={closeModal}>Annuler</button><button style={S.btn("forest")} onClick={generatePlan}>Generer avec l'IA</button></>}
              {planMode==="ai"&&planState==="loading"&&<span style={{fontSize:12,color:"#8A7968"}}>Generation en cours...</span>}
              {planMode==="ai"&&planState==="error"&&<><button style={S.btn("secondary")} onClick={closeModal}>Fermer</button><button style={S.btn("primary")} onClick={()=>{setPlanState("idle");setPlanError("");}}>Reessayer</button></>}
              {planMode==="manual"&&planState==="idle"&&<><button style={S.btn("secondary")} onClick={closeModal}>Annuler</button><button style={S.btn("forest")} onClick={saveManualPlan} disabled={saving}>{saving?"Enregistrement...":"Enregistrer le plan"}</button></>}
              {planState==="done"&&planResult&&<><span style={{fontSize:13,color:"#7A9E7E",flex:1}}>Plan enregistre</span><button style={S.btn("secondary")} onClick={()=>handleShare(planResult)}>Envoyer par mail</button><button style={S.btn("secondary")} onClick={()=>handlePrint(planResult)}>Imprimer</button><button style={S.btn("primary")} onClick={closeModal}>Fermer</button></>}
            </div>
          </div>
        </div>
      )}

      {modal==="note"&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div style={{...S.modal,maxWidth:480}}>
            <div style={S.modalHeader}><div style={S.modalTitle}>Ajouter une note</div><button onClick={closeModal} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E8DDD0",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button></div>
            <div style={S.modalBody}><div style={S.formGroup}><label style={S.label}>Note de consultation</label><textarea style={{...S.textarea,minHeight:120}} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Observations lors de la consultation..."/></div></div>
            <div style={S.modalFooter}><button style={S.btn("secondary")} onClick={closeModal}>Annuler</button><button style={S.btn("primary")} onClick={saveNote} disabled={saving}>{saving?"Enregistrement...":"Enregistrer"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}