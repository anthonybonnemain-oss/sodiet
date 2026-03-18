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
  getNotes: (pid, token) => supaFetch("consult_notes?patient_id=eq." + pid + "&order=created_at.desc", { token }),
  addNote: (n, token) => supaFetch("consult_notes", { method: "POST", body: n, token }),
  getPoids: (pid, token) => supaFetch("poids_historique?patient_id=eq." + pid + "&order=date.asc", { token }),
  addPoids: (p, token) => supaFetch("poids_historique", { method: "POST", body: p, token }),
  deletePoids: (id, token) => supaFetch("poids_historique?id=eq." + id, { method: "DELETE", prefer: "return=minimal", token }),
};

const COLORS = ["#C4956A","#3D5A47","#7A9E7E","#8B5E3C","#5B7A8B","#9B6B8A","#6B8B6B"];
const GOALS_FR = { perte_poids:"Perte de poids", reeducation:"Reeducation alimentaire", prise_masse:"Prise de masse", sante:"Sante generale", sport:"Performance sportive" };
const ACTIVITE_FR = { sedentaire:"Sedentaire", leger:"Legerement actif", modere:"Moderement actif", actif:"Tres actif", sport_intense:"Sport intensif" };
const DIET_FR = { vegetarien:"Vegetarien", vegan:"Vegan", sans_gluten:"Sans gluten", sans_lactose:"Sans lactose", halal:"Halal", casher:"Casher", diabetique:"Diabetique" };
const MEAL_NAMES = ["Petit-dejeuner","Dejeuner","Collation","Diner"];

const avatarColor = (id) => COLORS[Math.abs((id||"").toString().split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % COLORS.length];
const initials = (p) => ((p.prenom||"?")[0]+(p.nom||"?")[0]).toUpperCase();
const getAge = (ddn) => { if(!ddn) return "-"; const d=Math.floor((Date.now()-new Date(ddn))/(365.25*24*3600*1000)); return d+" ans"; };
const calcBMI = (p,t) => { if(!p||!t) return "-"; return (p/Math.pow(t/100,2)).toFixed(1); };
const emptyDay = (i) => ({ label:"Jour "+(i+1), meals:MEAL_NAMES.map(name=>({name,content:""})) });
const emptyManualPlan = (n) => Array.from({length:n},(_,i)=>emptyDay(i));
const EMPTY_FORM = { prenom:"",nom:"",ddn:"",sexe:"",email:"",tel:"",taille:"",poids:"",poids_obj:"",objectif:"perte_poids",activite:"sedentaire",diets:[],antecedents:"",allergies:"",notes:"" };

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
};

// ── Weight Chart ──────────────────────────────────────────────────────────────
function PoidsChart({ data, objectif }) {
  if (!data || data.length === 0) return (
    <p style={{ fontSize:12, color:"#8A7968", fontStyle:"italic" }}>Aucune mesure enregistree. Ajoutez une mesure pour voir la courbe.</p>
  );

  const W = 580, H = 200, PL = 45, PR = 20, PT = 20, PB = 35;
  const cw = W - PL - PR, ch = H - PT - PB;
  const weights = data.map(d => d.poids);
  const allWeights = objectif ? [...weights, +objectif] : weights;
  const minW = Math.min(...allWeights) - 2;
  const maxW = Math.max(...allWeights) + 2;
  const range = maxW - minW || 1;

  const x = (i) => PL + (i / (data.length - 1 || 1)) * cw;
  const y = (w) => PT + ch - ((w - minW) / range) * ch;

  const pathD = data.map((d, i) => (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(d.poids).toFixed(1)).join(" ");
  const areaD = pathD + " L" + x(data.length-1).toFixed(1) + "," + (PT+ch) + " L" + PL + "," + (PT+ch) + " Z";

  const ticks = 4;
  const yTicks = Array.from({length:ticks+1}, (_,i) => minW + (range/ticks)*i);

  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{ width:"100%", height:"auto" }}>
      {yTicks.map((t,i) => (
        <g key={i}>
          <line x1={PL} y1={y(t).toFixed(1)} x2={W-PR} y2={y(t).toFixed(1)} stroke="#F0EBE1" strokeWidth="1"/>
          <text x={PL-6} y={y(t)+4} textAnchor="end" fontSize="9" fill="#8A7968">{t.toFixed(1)}</text>
        </g>
      ))}
      {objectif && (
        <line x1={PL} y1={y(+objectif).toFixed(1)} x2={W-PR} y2={y(+objectif).toFixed(1)} stroke="#7A9E7E" strokeWidth="1.5" strokeDasharray="4,3"/>
      )}
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4956A" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#C4956A" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#wg)"/>
      <path d={pathD} fill="none" stroke="#C4956A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((d,i) => (
        <g key={i}>
          <circle cx={x(i).toFixed(1)} cy={y(d.poids).toFixed(1)} r="4" fill="white" stroke="#C4956A" strokeWidth="2"/>
          <text x={x(i).toFixed(1)} y={y(d.poids)-10} textAnchor="middle" fontSize="9" fill="#8B5E3C" fontWeight="600">{d.poids}kg</text>
        </g>
      ))}
      {data.map((d,i) => (
        <text key={i} x={x(i).toFixed(1)} y={H-8} textAnchor="middle" fontSize="8" fill="#8A7968">
          {new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}
        </text>
      ))}
      {objectif && (
        <text x={W-PR} y={y(+objectif)-5} textAnchor="end" fontSize="9" fill="#7A9E7E">Objectif {objectif}kg</text>
      )}
    </svg>
  );
}

function PoidsSection({ patientId, objectif, token }) {
  const [poidsData, setPoidsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPoids, setNewPoids] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.getPoids(patientId, token).then(d => { setPoidsData(d||[]); setLoading(false); }).catch(()=>setLoading(false));
  }, [patientId]);

  const addMesure = async () => {
    if (!newPoids) return;
    setSaving(true);
    try {
      const [entry] = await db.addPoids({ patient_id:patientId, poids:+newPoids, date:newDate, note:newNote||null }, token);
      const updated = [...poidsData, entry].sort((a,b)=>new Date(a.date)-new Date(b.date));
      setPoidsData(updated);
      setNewPoids(""); setNewNote("");
    } catch(e) { alert("Erreur : "+e.message); }
    setSaving(false);
  };

  const deleteMesure = async (id) => {
    await db.deletePoids(id, token);
    setPoidsData(d => d.filter(x => x.id !== id));
  };

  const poidsDiff = poidsData.length >= 2
    ? (poidsData[poidsData.length-1].poids - poidsData[0].poids).toFixed(1)
    : null;

  return (
    <div style={S.infoCard}>
      <div style={S.infoTitle}>Suivi du poids</div>
      {loading ? <Spinner/> : (
        <>
          {poidsData.length >= 2 && (
            <div style={{ display:"flex", gap:12, marginBottom:16 }}>
              {[
                ["Debut", poidsData[0].poids+"kg"],
                ["Actuel", poidsData[poidsData.length-1].poids+"kg"],
                ["Evolution", (poidsDiff > 0 ? "+" : "")+poidsDiff+"kg"],
                ["Objectif", objectif ? objectif+"kg" : "-"]
              ].map(([k,v])=>(
                <div key={k} style={{ flex:1, background:"#F0EBE1", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:600, color: k==="Evolution" ? (poidsDiff<=0?"#3D5A47":"#c8503c") : "#2A2118" }}>{v}</div>
                  <div style={{ fontSize:10, color:"#8A7968", textTransform:"uppercase", letterSpacing:"0.8px", marginTop:2 }}>{k}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginBottom:16, background:"#FDFAF7", borderRadius:10, padding:12 }}>
            <PoidsChart data={poidsData} objectif={objectif}/>
          </div>
          <div style={{ borderTop:"1px solid #F0EBE1", paddingTop:14, marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#8A7968", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Ajouter une mesure</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr auto", gap:8, alignItems:"end" }}>
              <div style={S.formGroup}>
                <label style={S.label}>Poids (kg)</label>
                <input type="number" step="0.1" value={newPoids} onChange={e=>setNewPoids(e.target.value)} placeholder="72.5" style={S.input}/>
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Date</label>
                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={S.input}/>
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Note (optionnel)</label>
                <input type="text" value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Ex: apres sport..." style={S.input}/>
              </div>
              <button onClick={addMesure} disabled={saving||!newPoids} style={{...S.btn("primary"), marginBottom:14}}>
                {saving ? "..." : "+ Ajouter"}
              </button>
            </div>
          </div>
          {poidsData.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#8A7968", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Historique</div>
              <div style={{ maxHeight:160, overflowY:"auto" }}>
                {[...poidsData].reverse().map((d,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #F0EBE1", fontSize:13 }}>
                    <span style={{ color:"#8A7968" }}>{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</span>
                    <span style={{ fontWeight:600 }}>{d.poids} kg</span>
                    {d.note && <span style={{ fontSize:11, color:"#8A7968", fontStyle:"italic" }}>{d.note}</span>}
                    <button onClick={()=>deleteMesure(d.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#c8503c", fontSize:16, padding:"0 4px" }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoginPage({ onLogin, error, loading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#FAF7F2", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:"white", borderRadius:20, padding:"48px 40px", width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(42,33,24,0.12)", border:"1px solid #E8DDD0" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontFamily:"Georgia,serif", fontSize:28, color:"#2A2118", marginBottom:6 }}>SoDiet</div>
          <div style={{ fontSize:11, color:"#C4956A", letterSpacing:"2px", textTransform:"uppercase" }}>Espace praticien</div>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={{...S.input,width:"100%",boxSizing:"border-box"}}/>
        </div>
        <div style={{...S.formGroup,marginBottom:24}}>
          <label style={S.label}>Mot de passe</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{...S.input,width:"100%",boxSizing:"border-box"}}/>
        </div>
        {error && <div style={{ background:"#fff0ee", border:"1px solid #f5c0b8", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#c8503c", marginBottom:16 }}>{error}</div>}
        <button onClick={()=>onLogin(email,password)} disabled={loading} style={{ width:"100%", padding:"12px", background:"#C4956A", color:"white", border:"none", borderRadius:10, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </div>
    </div>
  );
}

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
      <div style={{display:"flex",justifyContent:"center",gap:8}}>
        {[0,200,400].map((d,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#C4956A",animation:"bn 1.2s "+d+"ms infinite ease-in-out"}}/>)}
      </div>
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
                <div style={S.planMealName}>{m.name}</div>
                <div style={S.planMealContent}>{m.content}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PatientCard({p,onClick}) {
  const bmi = calcBMI(p.poids,p.taille);
  return (
    <div style={S.card} onClick={onClick}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={S.avatar(p.id)}>{initials(p)}</div>
        <div>
          <div style={{fontFamily:"Georgia,serif",fontSize:16,color:"#2A2118"}}>{p.prenom} {p.nom}</div>
          <div style={{fontSize:12,color:"#8A7968"}}>{getAge(p.ddn)}{p.sexe?" - "+(p.sexe==="F"?"Femme":p.sexe==="H"?"Homme":"Autre"):""}</div>
        </div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {p.objectif&&<span style={S.tag("goal")}>{GOALS_FR[p.objectif]}</span>}
        {(p.diets||[]).slice(0,2).map(d=><span key={d} style={S.tag("diet")}>{DIET_FR[d]||d}</span>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,paddingTop:12,borderTop:"1px solid #F0EBE1"}}>
        {[["kg",p.poids],["IMC",bmi],["obj.",p.poids_obj]].map(([k,v])=>(
          <div key={k} style={{textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:600,color:"#2A2118"}}>{v||"-"}</div>
            <div style={{fontSize:10,color:"#8A7968",textTransform:"uppercase",letterSpacing:"0.8px",marginTop:1}}>{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualPlanEditor({days,tips,onDaysChange,onTipsChange}) {
  const updateMeal = (di,mi,val) => onDaysChange(days.map((d,i)=>i!==di?d:{...d,meals:d.meals.map((m,j)=>j!==mi?m:{...m,content:val})}));
  const updateLabel = (di,val) => onDaysChange(days.map((d,i)=>i===di?{...d,label:val}:d));
  return (
    <div style={{maxHeight:"54vh",overflowY:"auto",paddingRight:4}}>
      {days.map((day,di)=>(
        <div key={di} style={S.planDayWrap}>
          <div style={{...S.planDayHeader,padding:"6px 10px"}}>
            <input value={day.label} onChange={e=>updateLabel(di,e.target.value)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,color:"white",fontWeight:600,fontSize:13,padding:"3px 8px",fontFamily:"'DM Sans',sans-serif",width:"100%",outline:"none"}}/>
          </div>
          <div style={{padding:"10px 14px"}}>
            {day.meals.map((m,mi)=>(
              <div key={mi} style={{marginBottom:10}}>
                <div style={S.planMealName}>{m.name}</div>
                <textarea value={m.content} onChange={e=>updateMeal(di,mi,e.target.value)}
                  placeholder={mi===0?"Ex: Yaourt nature, granola":mi===1?"Ex: Poulet grille, riz complet":mi===2?"Ex: Pomme, amandes":"Ex: Saumon vapeur, haricots verts"}
                  style={{...S.textarea,minHeight:50,width:"100%",fontSize:12}}/>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={S.formGroup}>
        <label style={S.label}>Conseils (optionnel)</label>
        <textarea style={{...S.textarea,minHeight:55}} value={tips} onChange={e=>onTipsChange(e.target.value)} placeholder="Ex: bien s'hydrater..."/>
      </div>
    </div>
  );
}

function ProfileView({p,plans,notes,token,poidsData,onBack,onEdit,onDelete,onGenPlan,onAddNote,onExportPDF,loading}) {  const bmi = calcBMI(p.poids,p.taille);
  return (
    <div>
      <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,color:"#8A7968",fontSize:13,cursor:"pointer",marginBottom:20,background:"none",border:"none",fontFamily:"'DM Sans',sans-serif"}}>← Retour</button>
      <div style={{...S.infoCard,display:"flex",alignItems:"flex-start",gap:24,padding:"28px 32px",marginBottom:24}}>
        <div style={S.avatar(p.id,68)}>{initials(p)}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:24,color:"#2A2118",marginBottom:4}}>{p.prenom} {p.nom}</div>
          <div style={{fontSize:13,color:"#8A7968",marginBottom:12}}>{getAge(p.ddn)}{p.sexe?" - "+(p.sexe==="F"?"Femme":p.sexe==="H"?"Homme":"Autre"):""}{p.email?" - "+p.email:""}</div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            {p.objectif&&<span style={S.tag("goal")}>{GOALS_FR[p.objectif]}</span>}
            {(p.diets||[]).map(d=><span key={d} style={S.tag("diet")}>{DIET_FR[d]||d}</span>)}
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0}}>
          <button style={S.btn("secondary")} onClick={onEdit}>Modifier</button>
          <button style={S.btn("forest")} onClick={onGenPlan}>Nouveau plan</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:22}}>
        <div>
          <div style={S.infoCard}>
            <div style={S.infoTitle}>Morphologie</div>
            {[["Taille",p.taille?p.taille+" cm":"-"],["Poids initial",p.poids?p.poids+" kg":"-"],["Poids objectif",p.poids_obj?p.poids_obj+" kg":"-"],["IMC",bmi]].map(([k,v])=>(
              <div key={k} style={S.infoRow}><span style={{color:"#8A7968"}}>{k}</span><span style={{fontWeight:500}}>{v}</span></div>
            ))}
          </div>
          <div style={S.infoCard}>
            <div style={S.infoTitle}>Mode de vie</div>
            {[["Activite",ACTIVITE_FR[p.activite]||"-"],["Objectif",GOALS_FR[p.objectif]||"-"]].map(([k,v])=>(
              <div key={k} style={S.infoRow}><span style={{color:"#8A7968"}}>{k}</span><span style={{fontWeight:500}}>{v}</span></div>
            ))}
            {p.allergies&&<div style={S.infoRow}><span style={{color:"#8A7968"}}>Allergies</span><span style={{fontWeight:500,fontSize:12,textAlign:"right",maxWidth:160}}>{p.allergies}</span></div>}
            {p.antecedents&&<div style={S.infoRow}><span style={{color:"#8A7968"}}>Antecedents</span><span style={{fontWeight:500,fontSize:12,textAlign:"right",maxWidth:160}}>{p.antecedents}</span></div>}
          </div>
          <div style={S.infoCard}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={S.infoTitle}>Notes praticien</div>
              <button style={{...S.btn("secondary"),padding:"5px 11px",fontSize:11}} onClick={onAddNote}>+ Ajouter</button>
            </div>
            {loading?<Spinner/>:notes.length===0
              ?<p style={{fontSize:12,color:"#8A7968",fontStyle:"italic"}}>Aucune note</p>
              :notes.map((n,i)=>(
                <div key={i} style={{background:"#F0EBE1",borderRadius:9,padding:"11px 13px",borderLeft:"3px solid #7A9E7E",marginBottom:8}}>
                  <div style={{fontSize:11,color:"#8A7968",marginBottom:4}}>{new Date(n.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</div>
                  <div style={{fontSize:13,color:"#3D3228",lineHeight:1.5}}>{n.text}</div>
                </div>
              ))
            }
          </div>
        </div>
        <div>
          <PoidsSection patientId={p.id} objectif={p.poids_obj} token={token}/>
          <div style={S.infoCard}>
            <div style={S.infoTitle}>Plans alimentaires</div>
            {loading?<Spinner/>:plans.length===0
              ?<p style={{fontSize:12,color:"#8A7968",fontStyle:"italic"}}>Aucun plan.</p>
              :plans.map((plan,i)=>(
                <div key={i} style={{background:"#F0EBE1",borderRadius:12,marginBottom:14,overflow:"hidden"}}>
                  <div style={{background:plan.mode==="manual"?"#3D5A47":"#C4956A",color:"white",padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:13,fontWeight:600}}>Plan {i+1} - {new Date(plan.created_at).toLocaleDateString("fr-FR")}</span>
                    <div style={{display:"flex",gap:6}}>
                      <span style={{fontSize:10,background:"rgba(255,255,255,0.2)",padding:"2px 8px",borderRadius:20}}>{plan.duration}</span>
                      <span style={{fontSize:10,background:"rgba(255,255,255,0.15)",padding:"2px 8px",borderRadius:20}}>{plan.mode==="manual"?"Manuel":"IA"}</span>
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
          {p.notes&&<div style={S.infoCard}><div style={S.infoTitle}>Notes initiales</div><p style={{fontSize:13,color:"#3D3228",lineHeight:1.6}}>{p.notes}</p></div>}
          <div style={{textAlign:"right",marginTop:8}}>
<div style={{textAlign:"right",marginTop:8,display:"flex",justifyContent:"flex-end",gap:8}}>
  <button onClick={onExportPDF} style={{...S.btn("secondary"),color:"#3D5A47",border:"1px solid #3D5A47"}}>📄 Exporter PDF</button>
  <button onClick={onDelete} style={{...S.btn("secondary"),color:"#c8503c",border:"1px solid #c8503c",background:"white"}}>Supprimer ce patient</button>
</div>          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => { try { const s=localStorage.getItem("sodiet_session"); return s?JSON.parse(s):null; } catch { return null; } });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [panel, setPanel] = useState("dashboard");
  const [currentId, setCurrentId] = useState(null);
  const [profilePlans, setProfilePlans] = useState([]);
  const [profileNotes, setProfileNotes] = useState([]);
  const [profilePoids, setProfilePoids] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [planMode, setPlanMode] = useState("choice");
  const [planDuration, setPlanDuration] = useState("3j");
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

  const handleLogin = async (email, password) => {
    setAuthLoading(true); setAuthError("");
    const data = await db.login(email, password);
    if (data.access_token) { localStorage.setItem("sodiet_session", JSON.stringify(data)); setSession(data); }
    else { setAuthError("Email ou mot de passe incorrect"); }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await db.logout(token);
    localStorage.removeItem("sodiet_session");
    setSession(null); setPatients([]);
  };

  useEffect(()=>{
    if(!session) return;
    setLoadingPatients(true);
    db.getPatients(token).then(data=>{ setPatients(data||[]); setLoadingPatients(false); }).catch(()=>setLoadingPatients(false));
  },[session]);

  useEffect(()=>{
    if(panel==="profile"&&currentId&&token){
      setProfileLoading(true);
      Promise.all([db.getPlans(currentId,token), db.getNotes(currentId,token), db.getPoids(currentId,token)])
  .then(([plans,notes,poids])=>{ setProfilePlans(plans||[]); setProfileNotes(notes||[]); setProfilePoids(poids||[]); setProfileLoading(false); })
        .then(([plans,notes])=>{ setProfilePlans(plans||[]); setProfileNotes(notes||[]); setProfileLoading(false); })
        .catch(()=>setProfileLoading(false));
    }
  },[panel,currentId]);

  const closeModal = () => {
    setModal(null); setPlanMode("choice"); setPlanState("idle");
    setPlanResult(null); setPlanInstr(""); setPlanDuration("3j");
    setPlanError(""); setManualDays([]); setManualTips("");
  };

  const savePatient = async () => {
    if(!form.prenom.trim()||!form.nom.trim()) { alert("Prenom et nom requis"); return; }
    setSaving(true);
    try {
      const payload = { prenom:form.prenom, nom:form.nom, ddn:form.ddn||null, sexe:form.sexe||null, email:form.email||null, tel:form.tel||null, taille:form.taille?+form.taille:null, poids:form.poids?+form.poids:null, poids_obj:form.poids_obj?+form.poids_obj:null, objectif:form.objectif, activite:form.activite, diets:form.diets||[], antecedents:form.antecedents||null, allergies:form.allergies||null, notes:form.notes||null };
      if(editId) { await db.updatePatient(editId,payload,token); setPatients(ps=>ps.map(p=>p.id===editId?{...p,...payload}:p)); }
      else { const [created]=await db.addPatient(payload,token); setPatients(ps=>[created,...ps]); }
      closeModal();
    } catch(e) { alert("Erreur : "+e.message); }
    setSaving(false);
  };

  const deletePatient = async (id) => {
    if(!confirm("Supprimer ce patient ?")) return;
    await db.deletePatient(id,token);
    setPatients(ps=>ps.filter(p=>p.id!==id)); setPanel("patients");
  };

  const saveNote = async () => {
    if(!noteText.trim()) return;
    setSaving(true);
    try { const [note]=await db.addNote({patient_id:currentId,text:noteText},token); setProfileNotes(ns=>[note,...ns]); setNoteText(""); closeModal(); }
    catch(e) { alert("Erreur : "+e.message); }
    setSaving(false);
  };

  const saveManualPlan = async () => {
    setSaving(true);
    try {
      const [plan]=await db.addPlan({patient_id:currentId,duration:planDuration==="7j"?"7 jours":"3 jours",mode:"manual",tips:manualTips,days:manualDays},token);
      setProfilePlans(ps=>[plan,...ps]); setTotalPlans(c=>c+1);
      setPlanResult({days:manualDays,tips:manualTips}); setPlanState("done");
    } catch(e) { alert("Erreur : "+e.message); }
    setSaving(false);
  };

  const generatePlan = useCallback(async () => {
    const p = patients.find(x=>x.id===currentId);
    if(!p) return;
    setPlanState("loading"); setPlanError("");
    const dietStr=(p.diets||[]).map(d=>DIET_FR[d]||d).join(", ")||"aucune restriction";
    const daysCount=planDuration==="7j"?7:3;
    const prompt="Tu es un nutritionniste expert. Genere un plan alimentaire en JSON strict.\n\nProfil: "+p.prenom+", "+(p.sexe==="F"?"Femme":p.sexe==="H"?"Homme":"N/A")+", "+(p.taille||"?")+"cm, "+(p.poids||"?")+"kg, objectif "+(p.poids_obj||"?")+"kg, "+(GOALS_FR[p.objectif]||"?")+", "+(ACTIVITE_FR[p.activite]||"?")+", regime: "+dietStr+", allergies: "+(p.allergies||"aucune")+"."+(planInstr?" Instructions: "+planInstr+"." :"")+"\n\nReponds UNIQUEMENT avec ce JSON (rien d'autre, pas de backticks) pour "+daysCount+" jours. Sois CONCIS (max 15 mots par repas):\n{\"days\":[{\"label\":\"Jour 1\",\"meals\":[{\"name\":\"Petit-dejeuner\",\"content\":\"...\"},{\"name\":\"Dejeuner\",\"content\":\"...\"},{\"name\":\"Collation\",\"content\":\"...\"},{\"name\":\"Diner\",\"content\":\"...\"}]}],\"tips\":\"Un conseil court.\"}";
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:prompt}]})});
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.error?.message||"HTTP "+res.status);}
      const data=await res.json();
      const raw=(data.content||[]).map(c=>c.text||"").join("");
      const clean=raw.replace(/```json|```/g,"").trim();
      let parsed;
      try{parsed=JSON.parse(clean);}catch(e){const s=clean.indexOf("{"),end=clean.lastIndexOf("}");if(s===-1||end===-1)throw new Error("JSON invalide");parsed=JSON.parse(clean.slice(s,end+1).replace(/,\s*([}\]])/g,"$1"));}
      const [plan]=await db.addPlan({patient_id:currentId,duration:planDuration==="7j"?"7 jours":"3 jours",mode:"ai",tips:parsed.tips||"",days:parsed.days||[]},token);
      setProfilePlans(ps=>[plan,...ps]); setTotalPlans(c=>c+1);
      setPlanResult(parsed); setPlanState("done");
    } catch(e){setPlanError(e.message||"Erreur inconnue");setPlanState("error");}
  },[patients,currentId,planDuration,planInstr,token]);

  const handleShare = (result) => {
    const lines=(result.days||[]).flatMap(day=>["\n== "+day.label+" ==",...(day.meals||[]).filter(m=>m.content).map(m=>m.name+" : "+m.content)]);
    if(result.tips)lines.push("\nConseils : "+result.tips);
    window.location.href="mailto:"+(currentPatient?.email||"")+"?subject=Plan alimentaire SoDiet&body="+encodeURIComponent("Plan alimentaire - "+(currentPatient?.prenom)+" "+(currentPatient?.nom)+"\n"+lines.join("\n"));
  };
const exportPatientPDF = (p, plans, notes, poidsData) => {
    const win = window.open("","_blank");
    const bmi = calcBMI(p.poids, p.taille);
    const poidsRows = (poidsData||[]).map(d =>
      "<tr><td>"+new Date(d.date).toLocaleDateString("fr-FR")+"</td><td><strong>"+d.poids+" kg</strong></td><td>"+(d.note||"-")+"</td></tr>"
    ).join("");
    const plansHtml = (plans||[]).map((plan,i) =>
      "<div style='margin-bottom:24px'><div style='background:#C4956A;color:white;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:600'>Plan "+(i+1)+" — "+new Date(plan.created_at).toLocaleDateString("fr-FR")+" ("+plan.duration+")</div><div style='border:1px solid #E8DDD0;border-top:none;padding:12px 14px;border-radius:0 0 6px 6px'>"+
      (plan.days||[]).map(day=>"<div style='margin-bottom:10px'><div style='font-weight:600;color:#8B5E3C;font-size:12px;text-transform:uppercase;margin-bottom:4px'>"+day.label+"</div>"+
      (day.meals||[]).filter(m=>m.content).map(m=>"<div style='padding:4px 0;border-bottom:1px solid #f5f5f5;font-size:13px'><strong style='color:#8A7968'>"+m.name+" :</strong> "+m.content+"</div>").join("")+"</div>").join("")+
      (plan.tips?"<div style='background:#f0f7f2;border-left:3px solid #7A9E7E;padding:8px 12px;margin-top:8px;font-size:12px'>Conseils : "+plan.tips+"</div>":"")+"</div></div>"
    ).join("");
    const notesHtml = (notes||[]).map(n =>
      "<div style='border-left:3px solid #7A9E7E;padding:8px 12px;margin-bottom:8px;background:#f9f9f9'><div style='font-size:11px;color:#8A7968;margin-bottom:4px'>"+new Date(n.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+"</div><div style='font-size:13px'>"+n.text+"</div></div>"
    ).join("");
    win.document.write("<!DOCTYPE html><html><head><title>Dossier — "+p.prenom+" "+p.nom+"</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;color:#3D3228;padding:0 20px}h1{color:#2A2118;font-size:26px;margin-bottom:4px}h2{color:#C4956A;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #E8DDD0}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px}.stat{background:#FAF7F2;border:1px solid #E8DDD0;border-radius:8px;padding:12px;text-align:center}.stat-val{font-size:20px;font-weight:600;color:#2A2118}.stat-label{font-size:10px;color:#8A7968;text-transform:uppercase;letter-spacing:1px;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#F0EBE1;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8A7968}td{padding:8px 12px;border-bottom:1px solid #F0EBE1}.tag{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;background:rgba(61,90,71,0.12);color:#3D5A47;margin-right:4px}@media print{button{display:none}}</style></head><body>"+
    "<div style='display:flex;justify-content:space-between;align-items:start;margin-bottom:24px'><div><h1>"+p.prenom+" "+p.nom+"</h1><div style='color:#8A7968;font-size:13px;margin-top:4px'>"+getAge(p.ddn)+(p.sexe?" - "+(p.sexe==="F"?"Femme":p.sexe==="H"?"Homme":"Autre"):"")+(p.email?" - "+p.email:"")+"</div></div><div style='font-size:11px;color:#8A7968;text-align:right'>SoDiet — Dossier patient<br>"+new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+"</div></div>"+
    "<h2>Donnees morphologiques</h2><div class='grid'><div class='stat'><div class='stat-val'>"+(p.taille||"-")+" cm</div><div class='stat-label'>Taille</div></div><div class='stat'><div class='stat-val'>"+(p.poids||"-")+" kg</div><div class='stat-label'>Poids initial</div></div><div class='stat'><div class='stat-val'>"+(p.poids_obj||"-")+" kg</div><div class='stat-label'>Objectif</div></div><div class='stat'><div class='stat-val'>"+bmi+"</div><div class='stat-label'>IMC</div></div><div class='stat'><div class='stat-val'>"+(ACTIVITE_FR[p.activite]||"-")+"</div><div class='stat-label'>Activite</div></div><div class='stat'><div class='stat-val'>"+(poidsData||[]).length+"</div><div class='stat-label'>Mesures poids</div></div></div>"+
    (p.allergies?"<div style='background:#fff8f5;border:1px solid #f5c0b8;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:12px'><strong>Allergies :</strong> "+p.allergies+"</div>":"")+
    (p.antecedents?"<div style='background:#f5f8ff;border:1px solid #c0c8f5;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:12px'><strong>Antecedents :</strong> "+p.antecedents+"</div>":"")+
    (poidsRows?"<h2>Suivi du poids</h2><table><thead><tr><th>Date</th><th>Poids</th><th>Note</th></tr></thead><tbody>"+poidsRows+"</tbody></table>":"")+
    (notesHtml?"<h2>Notes de consultation</h2>"+notesHtml:"")+
    (plansHtml?"<h2>Plans alimentaires</h2>"+plansHtml:"")+
    "<br/><button onclick='window.print()' style='padding:10px 24px;background:#C4956A;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px'>Imprimer / Exporter en PDF</button></body></html>");
    win.document.close();
  };
  const handlePrint = (result) => {
    const win=window.open("","_blank");
    const daysHtml=(result.days||[]).map(day=>"<div style='margin-bottom:18px'><div style='background:#C4956A;color:white;padding:8px 14px;border-radius:6px 6px 0 0;font-weight:600'>"+day.label+"</div><div style='border:1px solid #E8DDD0;border-top:none;border-radius:0 0 6px 6px;padding:10px 14px'>"+(day.meals||[]).filter(m=>m.content).map(m=>"<div style='padding:6px 0;border-bottom:1px solid #f0ebe1'><strong style='color:#8A7968'>"+m.name+" :</strong> "+m.content+"</div>").join("")+"</div></div>").join("");
    win.document.write("<!DOCTYPE html><html><head><title>Plan SoDiet</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;color:#3D3228}@media print{button{display:none}}</style></head><body><h1>Plan alimentaire SoDiet</h1><p style='color:#8A7968;margin-bottom:28px'>"+(currentPatient?.prenom)+" "+(currentPatient?.nom)+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+daysHtml+(result.tips?"<div style='background:#f0f7f2;border-left:3px solid #7A9E7E;padding:12px;margin-top:8px'>Conseils : "+result.tips+"</div>":"")+"<br/><button onclick='window.print()' style='padding:10px 20px;background:#C4956A;color:white;border:none;border-radius:8px;cursor:pointer'>Imprimer</button></body></html>");
    win.document.close();
  };

  const filteredPatients=patients.filter(p=>(p.prenom+" "+p.nom).toLowerCase().includes(search.toLowerCase()));

  if(!session) return <LoginPage onLogin={handleLogin} error={authError} loading={authLoading}/>;

  return (
    <div style={S.app}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input:focus,select:focus,textarea:focus{border-color:#C4956A !important;outline:none;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#C4956A;border-radius:2px;}"}</style>

      <aside style={S.sidebar}>
        <div style={S.logoBox}>
          <div style={S.logoText}>SoDiet</div>
          <div style={S.logoSub}>Espace praticien</div>
        </div>
        <div style={S.navArea}>
          <div style={S.navLabel}>Menu</div>
          <div style={S.navItem(panel==="dashboard")} onClick={()=>setPanel("dashboard")}><span>⊞</span>Tableau de bord</div>
          <div style={S.navItem(panel==="patients"||panel==="profile")} onClick={()=>setPanel("patients")}><span>👥</span>Mes patients</div>
          {patients.length>0&&<>
            <div style={{...S.navLabel,marginTop:16}}>Patients recents</div>
            {patients.slice(0,8).map(p=>(
              <div key={p.id} style={S.patChip(currentId===p.id&&panel==="profile")} onClick={()=>{setCurrentId(p.id);setPanel("profile");}}>
                <div style={S.avatar(p.id,26)}>{initials(p)}</div>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.65)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.prenom} {p.nom}</span>
              </div>
            ))}
          </>}
        </div>
        <div style={{padding:"16px 12px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div onClick={handleLogout} style={{...S.navItem(false),cursor:"pointer"}}><span>⎋</span>Deconnexion</div>
        </div>
      </aside>

      <main style={S.main}>
        <div style={S.topbar}>
          <div style={S.pageTitle}>
            {panel==="dashboard"?"Tableau de bord":panel==="patients"?"Mes patients":currentPatient?(currentPatient.prenom+" "+currentPatient.nom):"Patients"}
          </div>
          <button style={S.btn("primary")} onClick={()=>{setForm(EMPTY_FORM);setEditId(null);setModal("patient");}}>+ Nouveau patient</button>
        </div>

        <div style={S.content}>
          {panel==="dashboard"&&(
            <div>
              <div style={S.statsGrid}>
                {[["Total patients",patients.length,"dans votre cabinet"],["Perte de poids",patients.filter(p=>p.objectif==="perte_poids").length,"objectif principal"],["Reeducation",patients.filter(p=>p.objectif==="reeducation").length,"reapprendre a manger"],["Plans crees",totalPlans,"cette session"]].map(([l,v,s])=>(
                  <div key={l} style={S.statCard}>
                    <div style={S.statLabel}>{l}</div>
                    <div style={S.statValue}>{v}</div>
                    <div style={S.statSub}>{s}</div>
                  </div>
                ))}
              </div>
              <div style={{...S.infoCard,padding:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
                  <div style={{fontFamily:"Georgia,serif",fontSize:17,color:"#2A2118"}}>Patients recents</div>
                  <button style={{...S.btn("secondary"),fontSize:12}} onClick={()=>setPanel("patients")}>Voir tous</button>
                </div>
                {loadingPatients?<Spinner/>:patients.length===0
                  ?<div style={S.emptyState}><div style={{fontSize:40,marginBottom:12,opacity:.4}}>🌿</div><div style={{fontFamily:"Georgia,serif",fontSize:19,color:"#2A2118",opacity:.6,marginBottom:6}}>Aucun patient</div><div style={{fontSize:13}}>Ajoutez votre premier patient</div></div>
                  :<div style={S.patientsGrid}>{patients.slice(0,4).map(p=><PatientCard key={p.id} p={p} onClick={()=>{setCurrentId(p.id);setPanel("profile");}}/>)}</div>
                }
              </div>
            </div>
          )}

          {panel==="patients"&&(
            <div>
              <div style={{position:"relative",marginBottom:24}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#8A7968"}}>🔍</span>
                <input style={{...S.input,width:"100%",paddingLeft:40,borderRadius:12}} placeholder="Rechercher un patient..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              {loadingPatients?<Spinner/>:filteredPatients.length===0
                ?<div style={S.emptyState}><div style={{fontSize:40,marginBottom:12,opacity:.4}}>🌿</div><div style={{fontFamily:"Georgia,serif",fontSize:19,color:"#2A2118",opacity:.6,marginBottom:6}}>{search?"Aucun resultat":"Aucun patient"}</div><div style={{fontSize:13}}>{search?"Essayez un autre terme":"Cliquez sur Nouveau patient"}</div></div>
                :<div style={S.patientsGrid}>{filteredPatients.map(p=><PatientCard key={p.id} p={p} onClick={()=>{setCurrentId(p.id);setPanel("profile");}}/>)}</div>
              }
            </div>
          )}

          {panel==="profile"&&currentPatient&&(
<ProfileView p={currentPatient} plans={profilePlans} notes={profileNotes} token={token} poidsData={profilePoids} loading={profileLoading}
  onBack={()=>setPanel("patients")}
  onEdit={()=>{setForm({...EMPTY_FORM,...currentPatient,poids_obj:currentPatient.poids_obj||""});setEditId(currentPatient.id);setModal("patient");}}
  onDelete={()=>deletePatient(currentPatient.id)}
  onGenPlan={()=>{setPlanMode("choice");setPlanState("idle");setPlanResult(null);setModal("plan");}}
  onAddNote={()=>setModal("note")}
  onExportPDF={()=>exportPatientPDF(currentPatient, profilePlans, profileNotes, profilePoids)}
/>
          )}
        </div>
      </main>

      {modal==="patient"&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>{editId?"Modifier le patient":"Nouveau patient"}</div>
              <button onClick={closeModal} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E8DDD0",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
            </div>
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
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {Object.entries(DIET_FR).map(([v,l])=>{
                  const checked=(form.diets||[]).includes(v);
                  return(
                    <label key={v} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",border:"1.5px solid "+(checked?"#C4956A":"#E8DDD0"),borderRadius:8,cursor:"pointer",fontSize:12,background:checked?"rgba(196,149,106,0.1)":"white",color:checked?"#8B5E3C":"#3D3228"}}>
                      <input type="checkbox" style={{display:"none"}} checked={checked} onChange={e=>setForm(f=>({...f,diets:e.target.checked?[...(f.diets||[]),v]:(f.diets||[]).filter(d=>d!==v)}))}/>
                      {l}
                    </label>
                  );
                })}
              </div>
              <SectionTitle>Informations medicales</SectionTitle>
              <div style={S.formGroup}><label style={S.label}>Antecedents / pathologies</label><textarea style={S.textarea} value={form.antecedents} onChange={e=>ff("antecedents")(e.target.value)} placeholder="Ex: hypertension, diabete type 2..."/></div>
              <div style={S.formGroup}><label style={S.label}>Allergies alimentaires</label><textarea style={{...S.textarea,minHeight:55}} value={form.allergies} onChange={e=>ff("allergies")(e.target.value)} placeholder="Ex: arachides, fruits a coque..."/></div>
              <div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={S.textarea} value={form.notes} onChange={e=>ff("notes")(e.target.value)} placeholder="Observations, motivations..."/></div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btn("secondary")} onClick={closeModal}>Annuler</button>
              <button style={S.btn("primary")} onClick={savePatient} disabled={saving}>{saving?"Enregistrement...":"Enregistrer"}</button>
            </div>
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
              {planMode==="choice"&&(
                <div>
                  <p style={{fontSize:13,color:"#8A7968",marginBottom:20}}>Pour <strong style={{color:"#2A2118"}}>{currentPatient?.prenom} {currentPatient?.nom}</strong></p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
                    <div onClick={()=>setPlanMode("ai")} style={{background:"white",border:"2px solid #E8DDD0",borderRadius:14,padding:20,cursor:"pointer",textAlign:"center"}}>
                      <div style={{fontSize:32,marginBottom:8}}>✦</div>
                      <div style={{fontSize:14,fontWeight:600,color:"#2A2118",marginBottom:4}}>Genere par l'IA</div>
                      <div style={{fontSize:11,color:"#8A7968",lineHeight:1.4}}>L'IA cree le plan selon le profil</div>
                    </div>
                    <div onClick={()=>{setManualDays(emptyManualPlan(planDuration==="7j"?7:3));setManualTips("");setPlanMode("manual");}} style={{background:"white",border:"2px solid #E8DDD0",borderRadius:14,padding:20,cursor:"pointer",textAlign:"center"}}>
                      <div style={{fontSize:32,marginBottom:8}}>✏️</div>
                      <div style={{fontSize:14,fontWeight:600,color:"#2A2118",marginBottom:4}}>Saisie manuelle</div>
                      <div style={{fontSize:11,color:"#8A7968",lineHeight:1.4}}>Vous choisissez chaque repas</div>
                    </div>
                  </div>
                  <p style={{fontSize:11,color:"#8A7968",textAlign:"center",marginBottom:10}}>Duree du plan :</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[["3j","📅","3 jours","Demarrage rapide"],["7j","🗓️","1 semaine","Plan complet"]].map(([v,ic,l,s])=>(
                      <div key={v} onClick={()=>setPlanDuration(v)} style={{background:planDuration===v?"rgba(196,149,106,0.07)":"white",border:"2px solid "+(planDuration===v?"#C4956A":"#E8DDD0"),borderRadius:12,padding:16,cursor:"pointer",textAlign:"center"}}>
                        <div style={{fontSize:26,marginBottom:6}}>{ic}</div>
                        <div style={{fontSize:14,fontWeight:600,color:"#2A2118"}}>{l}</div>
                        <div style={{fontSize:11,color:"#8A7968",marginTop:2}}>{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {planMode==="ai"&&planState==="idle"&&(
                <div>
                  <p style={{fontSize:13,color:"#8A7968",marginBottom:16}}>Plan IA - {planDuration==="7j"?"7 jours":"3 jours"}</p>
                  <div style={S.formGroup}>
                    <label style={S.label}>Instructions speciales (optionnel)</label>
                    <textarea style={S.textarea} value={planInstr} onChange={e=>setPlanInstr(e.target.value)} placeholder="Ex: repas rapides, budget limite..."/>
                  </div>
                </div>
              )}
              {planMode==="ai"&&planState==="loading"&&(
                <div style={{textAlign:"center",padding:"50px 20px"}}>
                  <style>{"@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}"}</style>
                  <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:20}}>
                    {[0,200,400].map((d,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#C4956A",animation:"bounce 1.2s "+d+"ms infinite ease-in-out"}}/>)}
                  </div>
                  <div style={{fontFamily:"Georgia,serif",fontSize:15,color:"#8A7968"}}>L'IA genere votre plan...</div>
                </div>
              )}
              {planMode==="ai"&&planState==="error"&&(
                <div style={{textAlign:"center",padding:"30px 20px"}}>
                  <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
                  <div style={{color:"#c8503c",fontSize:14}}>{planError}</div>
                </div>
              )}
              {planMode==="manual"&&planState==="idle"&&<ManualPlanEditor days={manualDays} tips={manualTips} onDaysChange={setManualDays} onTipsChange={setManualTips}/>}
              {planState==="done"&&planResult&&(
                <div style={{maxHeight:"52vh",overflowY:"auto",paddingRight:4}}>
                  <PlanDays days={planResult.days}/>
                  {planResult.tips&&<div style={{background:"rgba(61,90,71,0.09)",borderLeft:"3px solid #7A9E7E",borderRadius:"0 10px 10px 0",padding:"12px 14px",marginTop:8}}><div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:"#3D5A47",marginBottom:5}}>Conseils</div><div style={{fontSize:13,color:"#3D3228",lineHeight:1.6}}>{planResult.tips}</div></div>}
                </div>
              )}
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
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>Ajouter une note</div>
              <button onClick={closeModal} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E8DDD0",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>x</button>
            </div>
            <div style={S.modalBody}>
              <div style={S.formGroup}>
                <label style={S.label}>Note de consultation</label>
                <textarea style={{...S.textarea,minHeight:120}} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Observations lors de la consultation..."/>
              </div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btn("secondary")} onClick={closeModal}>Annuler</button>
              <button style={S.btn("primary")} onClick={saveNote} disabled={saving}>{saving?"Enregistrement...":"Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}