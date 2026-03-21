import { useState, useEffect } from "react";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  login: (email, password) => fetch(SUPA_URL + "/auth/v1/token?grant_type=password", {
    method: "POST", headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  }).then(r => r.json()),
  logout: (token) => fetch(SUPA_URL + "/auth/v1/logout", {
    method: "POST", headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + token }
  }),
  getPatientByAuth: (authId, token) => supaFetch("patients?auth_user_id=eq." + authId + "&select=*", { token }),
  getPoids: (pid, token) => supaFetch("poids_historique?patient_id=eq." + pid + "&order=date.desc&limit=10", { token }),
  addPoids: (p, token) => supaFetch("poids_historique", { method: "POST", body: p, token }),
  getPlans: (pid, token) => supaFetch("plans?patient_id=eq." + pid + "&order=created_at.desc", { token }),
  getJournal: (pid, date, token) => supaFetch("journal_alimentaire?patient_id=eq." + pid + "&date=eq." + date + "&order=created_at.asc", { token }),
  addJournal: (j, token) => supaFetch("journal_alimentaire", { method: "POST", body: j, token }),
  deleteJournal: (id, token) => supaFetch("journal_alimentaire?id=eq." + id, { method: "DELETE", prefer: "return=minimal", token }),
  getMessages: (pid, token) => supaFetch("messages?patient_id=eq." + pid + "&order=created_at.asc", { token }),
  addMessage: (m, token) => supaFetch("messages", { method: "POST", body: m, token }),
  getRDV: (pid, token) => supaFetch("rendez_vous?patient_id=eq." + pid + "&order=date.asc", { token }),
};

const REPAS_LIST = ["Petit-dejeuner", "Dejeuner", "Collation", "Diner", "Autre"];
const GOALS_FR = { perte_poids:"Perte de poids", reeducation:"Reeducation alimentaire", prise_masse:"Prise de masse", sante:"Sante generale", sport:"Performance sportive" };

const S = {
  app: { minHeight:"100vh", fontFamily:"'DM Sans',sans-serif", background:"#FAF7F2", color:"#3D3228" },
  header: { background:"#2A2118", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 },
  logoText: { fontFamily:"Georgia,serif", fontSize:18, color:"#FAF7F2" },
  logoSub: { fontSize:9, color:"#C4956A", letterSpacing:"2px", textTransform:"uppercase", marginTop:1 },
  nav: { display:"flex", gap:4, background:"white", borderBottom:"1px solid #E8DDD0", padding:"0 24px", overflowX:"auto" },
  navTab: (a) => ({ padding:"14px 18px", cursor:"pointer", fontSize:13, fontWeight:a?600:400, color:a?"#C4956A":"#8A7968", borderBottom:a?"2px solid #C4956A":"2px solid transparent", whiteSpace:"nowrap" }),
  content: { padding:24, maxWidth:800, margin:"0 auto" },
  card: { background:"white", borderRadius:14, padding:20, boxShadow:"0 4px 20px rgba(42,33,24,0.07)", border:"1px solid #E8DDD0", marginBottom:16 },
  cardTitle: { fontFamily:"Georgia,serif", fontSize:16, color:"#2A2118", marginBottom:14 },
  btn: (v) => ({ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:10, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, cursor:"pointer", background:v==="primary"?"#C4956A":v==="forest"?"#3D5A47":"#F0EBE1", color:v==="primary"||v==="forest"?"white":"#3D3228", border:v==="secondary"?"1px solid #E8DDD0":"none" }),
  input: { padding:"9px 13px", border:"1.5px solid #E8DDD0", borderRadius:10, fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#3D3228", background:"white", outline:"none", width:"100%", boxSizing:"border-box" },
  label: { fontSize:12, fontWeight:500, color:"#8A7968", display:"block", marginBottom:4 },
  formGroup: { marginBottom:14 },
  infoRow: { display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #F0EBE1", fontSize:13 },
  tag: { padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:500, background:"rgba(61,90,71,0.12)", color:"#3D5A47" },
  statBox: { background:"#F0EBE1", borderRadius:10, padding:"12px 14px", textAlign:"center" },
  statVal: { fontSize:18, fontWeight:600, color:"#2A2118" },
  statLabel: { fontSize:10, color:"#8A7968", textTransform:"uppercase", letterSpacing:"0.8px", marginTop:2 },
  emptyState: { textAlign:"center", padding:"40px 20px", color:"#8A7968" },
};

function Spinner() {
  return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <style>{"@keyframes bn{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}"}</style>
      <div style={{display:"flex",justifyContent:"center",gap:8}}>{[0,200,400].map((d,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#C4956A",animation:"bn 1.2s "+d+"ms infinite ease-in-out"}}/>)}</div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function PatientLogin({onLogin, error, loading}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FAF7F2",fontFamily:"'DM Sans',sans-serif",padding:20}}>
      <div style={{background:"white",borderRadius:20,padding:"48px 40px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(42,33,24,0.12)",border:"1px solid #E8DDD0"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:28,color:"#2A2118",marginBottom:6}}>SoDiet</div>
          <div style={{fontSize:11,color:"#C4956A",letterSpacing:"2px",textTransform:"uppercase"}}>Espace patient</div>
        </div>
        <div style={S.formGroup}><label style={S.label}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={S.input}/></div>
        <div style={{...S.formGroup,marginBottom:24}}><label style={S.label}>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={S.input}/></div>
        {error&&<div style={{background:"#fff0ee",border:"1px solid #f5c0b8",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#c8503c",marginBottom:16}}>{error}</div>}
        <button onClick={()=>onLogin(email,password)} disabled={loading} style={{...S.btn("primary"),width:"100%",justifyContent:"center",padding:"12px"}}>
          {loading?"Connexion...":"Se connecter"}
        </button>
        <p style={{fontSize:11,color:"#8A7968",textAlign:"center",marginTop:16}}>Votre praticien vous a envoye vos identifiants par email.</p>
      </div>
    </div>
  );
}

// ── Profil ────────────────────────────────────────────────────────────────────
function MonProfil({patient, token}) {
  const [poids, setPoids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPoids, setNewPoids] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ db.getPoids(patient.id,token).then(d=>{setPoids(d||[]);setLoading(false);}).catch(()=>setLoading(false)); },[]);

  const addPoids = async () => {
    if(!newPoids) return; setSaving(true);
    try {
      const [e] = await db.addPoids({patient_id:patient.id,poids:+newPoids,date:newDate,note:null},token);
      setPoids(p=>[e,...p]); setNewPoids("");
    } catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  const dernierPoids = poids.length > 0 ? poids[0].poids : patient.poids;
  const diff = poids.length > 0 && patient.poids ? (poids[0].poids - patient.poids).toFixed(1) : null;

  return (
    <div>
      <div style={S.card}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
          <div style={{width:60,height:60,borderRadius:"50%",background:"#C4956A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:600,color:"white",flexShrink:0}}>
            {(patient.prenom||"?")[0]}{(patient.nom||"?")[0]}
          </div>
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:20,color:"#2A2118"}}>{patient.prenom} {patient.nom}</div>
            {patient.objectif&&<span style={S.tag}>{GOALS_FR[patient.objectif]||patient.objectif}</span>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          <div style={S.statBox}><div style={S.statVal}>{patient.taille||"-"} cm</div><div style={S.statLabel}>Taille</div></div>
          <div style={S.statBox}><div style={S.statVal}>{dernierPoids||"-"} kg</div><div style={S.statLabel}>Poids actuel</div></div>
          <div style={S.statBox}><div style={S.statVal}>{patient.poids_obj||"-"} kg</div><div style={S.statLabel}>Objectif</div></div>
          {diff&&<div style={S.statBox}><div style={{...S.statVal,color:diff<=0?"#3D5A47":"#c8503c"}}>{diff>0?"+":""}{diff} kg</div><div style={S.statLabel}>Evolution</div></div>}
          {patient.poids&&patient.taille&&<div style={S.statBox}><div style={S.statVal}>{(patient.poids/Math.pow(patient.taille/100,2)).toFixed(1)}</div><div style={S.statLabel}>IMC initial</div></div>}
        </div>
        {patient.allergies&&<div style={{background:"#fff8f5",border:"1px solid #f5c0b8",borderRadius:8,padding:"8px 12px",fontSize:12,marginBottom:10}}><strong>Allergies :</strong> {patient.allergies}</div>}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Enregistrer mon poids</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,alignItems:"end"}}>
          <div style={S.formGroup}><label style={S.label}>Poids (kg)</label><input type="number" step="0.1" value={newPoids} onChange={e=>setNewPoids(e.target.value)} placeholder="72.5" style={S.input}/></div>
          <div style={S.formGroup}><label style={S.label}>Date</label><input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={S.input}/></div>
          <button onClick={addPoids} disabled={saving||!newPoids} style={{...S.btn("primary"),marginBottom:14}}>{saving?"...":"Enregistrer"}</button>
        </div>
        {loading?<Spinner/>:poids.length>0&&(
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"#8A7968",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Historique</div>
            {poids.slice(0,5).map((d,i)=>(
              <div key={i} style={S.infoRow}>
                <span style={{color:"#8A7968"}}>{new Date(d.date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</span>
                <span style={{fontWeight:600}}>{d.poids} kg</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Journal alimentaire ───────────────────────────────────────────────────────
function JournalAlimentaire({patient, token}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [repas, setRepas] = useState("Petit-dejeuner");
  const [contenu, setContenu] = useState("");
  const [calories, setCalories] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ loadJournal(); },[date]);

  const loadJournal = async () => {
    setLoading(true);
    try { const d = await db.getJournal(patient.id,date,token); setEntries(d||[]); }
    catch(e){console.error(e);}
    setLoading(false);
  };

  const add = async () => {
    if(!contenu.trim()) return; setSaving(true);
    try {
      const [e] = await db.addJournal({patient_id:patient.id,date,repas,contenu,calories:calories?+calories:null,note:note||null},token);
      setEntries(es=>[...es,e]); setContenu(""); setCalories(""); setNote("");
    } catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  const remove = async (id) => {
    await db.deleteJournal(id,token);
    setEntries(es=>es.filter(e=>e.id!==id));
  };

  const totalCal = entries.reduce((s,e)=>s+(e.calories||0),0);
  const byRepas = REPAS_LIST.reduce((acc,r)=>({...acc,[r]:entries.filter(e=>e.repas===r)}),{});

  return (
    <div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={S.cardTitle}>Journal du jour</div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...S.input,width:"auto",fontSize:12}}/>
        </div>
        {totalCal>0&&<div style={{background:"#F0EBE1",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:"#8A7968"}}>Total du jour</span><span style={{fontSize:18,fontWeight:600,color:"#C4956A"}}>{totalCal} kcal</span></div>}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:600,color:"#8A7968",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>Ajouter un aliment</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div style={S.formGroup}>
              <label style={S.label}>Repas</label>
              <select value={repas} onChange={e=>setRepas(e.target.value)} style={S.input}>
                {REPAS_LIST.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={S.formGroup}><label style={S.label}>Calories (optionnel)</label><input type="number" value={calories} onChange={e=>setCalories(e.target.value)} placeholder="Ex: 350" style={S.input}/></div>
          </div>
          <div style={{...S.formGroup,marginBottom:10}}><label style={S.label}>Aliment / description *</label><input type="text" value={contenu} onChange={e=>setContenu(e.target.value)} placeholder="Ex: Yaourt nature 150g, granola 40g, banane" style={S.input}/></div>
          <div style={{...S.formGroup,marginBottom:10}}><label style={S.label}>Note (optionnel)</label><input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex: pas faim, repas pris dehors..." style={S.input}/></div>
          <button onClick={add} disabled={saving||!contenu.trim()} style={{...S.btn("primary"),width:"100%",justifyContent:"center"}}>{saving?"Enregistrement...":"+ Ajouter"}</button>
        </div>
      </div>

      {loading?<Spinner/>:entries.length===0?(
        <div style={S.emptyState}><div style={{fontSize:36,marginBottom:12,opacity:.4}}>🍽️</div><div style={{fontSize:16,color:"#2A2118",opacity:.6,marginBottom:6}}>Aucune entree pour ce jour</div><div style={{fontSize:13}}>Commencez a noter vos repas</div></div>
      ):(
        REPAS_LIST.map(r=>byRepas[r].length>0&&(
          <div key={r} style={S.card}>
            <div style={{fontSize:11,fontWeight:600,color:"#C4956A",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>{r}</div>
            {byRepas[r].map((e,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 0",borderBottom:i<byRepas[r].length-1?"1px solid #F0EBE1":"none"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"#2A2118"}}>{e.contenu}</div>
                  {e.note&&<div style={{fontSize:11,color:"#8A7968",fontStyle:"italic",marginTop:2}}>{e.note}</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  {e.calories&&<span style={{fontSize:12,color:"#C4956A",fontWeight:600}}>{e.calories} kcal</span>}
                  <button onClick={()=>remove(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#c8503c",fontSize:16}}>x</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

// ── Mes plans ────────────────────────────────────────────────────────────────
function MesPlans({patient, token}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ db.getPlans(patient.id,token).then(d=>{setPlans(d||[]);setLoading(false);}).catch(()=>setLoading(false)); },[]);

  if(loading) return <Spinner/>;

  return (
    <div>
      {plans.length===0?(
        <div style={S.emptyState}><div style={{fontSize:36,marginBottom:12,opacity:.4}}>🥗</div><div style={{fontSize:16,color:"#2A2118",opacity:.6,marginBottom:6}}>Aucun plan alimentaire</div><div style={{fontSize:13}}>Votre praticien n'a pas encore cree de plan pour vous</div></div>
      ):plans.map((plan,i)=>(
        <div key={i} style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={S.cardTitle}>Plan {i+1} — {new Date(plan.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</div>
            <span style={{fontSize:11,background:"#F0EBE1",padding:"3px 10px",borderRadius:20,color:"#8A7968"}}>{plan.duration}</span>
          </div>
          {(plan.days||[]).map((day,j)=>(
            <div key={j} style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:600,color:"#C4956A",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>{day.label}</div>
              {(day.meals||[]).filter(m=>m.content).map((m,k)=>(
                <div key={k} style={{padding:"6px 10px",background:"#F0EBE1",borderRadius:8,marginBottom:6}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#8B5E3C",marginBottom:2}}>{m.name}{m.grammage&&<span style={{color:"#C4956A",fontWeight:400}}> — {m.grammage}</span>}</div>
                  <div style={{fontSize:13,color:"#3D3228"}}>{m.content}</div>
                </div>
              ))}
            </div>
          ))}
          {plan.tips&&<div style={{background:"rgba(61,90,71,0.08)",borderLeft:"3px solid #7A9E7E",borderRadius:"0 8px 8px 0",padding:"10px 12px",fontSize:12,color:"#3D5A47"}}>💡 {plan.tips}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Messagerie ───────────────────────────────────────────────────────────────
function Messagerie({patient, token}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ db.getMessages(patient.id,token).then(d=>{setMessages(d||[]);setLoading(false);}).catch(()=>setLoading(false)); },[]);

  const send = async () => {
    if(!newMsg.trim()) return; setSaving(true);
    try {
      const [m] = await db.addMessage({patient_id:patient.id,expediteur:"patient",contenu:newMsg},token);
      setMessages(ms=>[...ms,m]); setNewMsg("");
    } catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Messagerie avec votre praticien</div>
      {loading?<Spinner/>:(
        <>
          <div style={{height:400,overflowY:"auto",marginBottom:16,padding:"8px 0"}}>
            {messages.length===0?(
              <div style={S.emptyState}><div style={{fontSize:36,marginBottom:12,opacity:.4}}>💬</div><div style={{fontSize:14,color:"#2A2118",opacity:.6}}>Aucun message</div></div>
            ):messages.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.expediteur==="patient"?"flex-end":"flex-start",marginBottom:10}}>
                <div style={{maxWidth:"70%",padding:"10px 14px",borderRadius:m.expediteur==="patient"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.expediteur==="patient"?"#C4956A":"white",color:m.expediteur==="patient"?"white":"#3D3228",fontSize:13,boxShadow:"0 2px 8px rgba(42,33,24,0.1)",border:m.expediteur==="praticien"?"1px solid #E8DDD0":"none"}}>
                  <div>{m.contenu}</div>
                  <div style={{fontSize:10,marginTop:4,opacity:0.7}}>{new Date(m.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})} {new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <input type="text" value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ecrire un message..." style={{...S.input,flex:1}}/>
            <button onClick={send} disabled={saving||!newMsg.trim()} style={S.btn("primary")}>{saving?"...":"Envoyer"}</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main PatientApp ───────────────────────────────────────────────────────────
export default function PatientApp() {
  const [session, setSession] = useState(()=>{ try{ const s=localStorage.getItem("sodiet_patient_session"); return s?JSON.parse(s):null; }catch{ return null; } });
  const [patient, setPatient] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [tab, setTab] = useState("profil");

  const token = session?.access_token;

  useEffect(()=>{
    if(!session) return;
    setLoadingPatient(true);
    db.getPatientByAuth(session.user.id, token)
      .then(data=>{ if(data&&data.length>0) setPatient(data[0]); setLoadingPatient(false); })
      .catch(()=>setLoadingPatient(false));
  },[session]);

  useEffect(()=>{
    if(!session) return;
    const refresh=async()=>{ try{ const res=await fetch(SUPA_URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})}); const data=await res.json(); if(data.access_token){localStorage.setItem("sodiet_patient_session",JSON.stringify(data));setSession(data);} }catch(e){console.error(e);} };
    const interval=setInterval(refresh,45*60*1000);
    return ()=>clearInterval(interval);
  },[session]);

  const handleLogin = async (email, password) => {
    setAuthLoading(true); setAuthError("");
    const data = await db.login(email, password);
    if(data.access_token){ localStorage.setItem("sodiet_patient_session",JSON.stringify(data)); setSession(data); }
    else{ setAuthError("Email ou mot de passe incorrect"); }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await db.logout(token);
    localStorage.removeItem("sodiet_patient_session");
    setSession(null); setPatient(null);
  };

  if(!session) return <PatientLogin onLogin={handleLogin} error={authError} loading={authLoading}/>;
  if(loadingPatient) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FAF7F2"}}><Spinner/></div>;
  if(!patient) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FAF7F2",flexDirection:"column",gap:16}}>
      <div style={{fontSize:36}}>🌿</div>
      <div style={{fontFamily:"Georgia,serif",fontSize:20,color:"#2A2118"}}>Compte non associe</div>
      <div style={{fontSize:13,color:"#8A7968",textAlign:"center",maxWidth:300}}>Votre compte n'est pas encore lie a un dossier patient. Contactez votre praticien.</div>
      <button onClick={handleLogout} style={S.btn("secondary")}>Se deconnecter</button>
    </div>
  );

  const TABS = [["profil","👤","Mon profil"],["journal","🍽️","Journal"],["plans","🥗","Mes plans"],["messages","💬","Messagerie"]];

  return (
    <div style={S.app}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}input:focus,select:focus,textarea:focus{border-color:#C4956A !important;outline:none;}"}</style>
      <div style={S.header}>
        <div><div style={S.logoText}>SoDiet</div><div style={S.logoSub}>Espace patient</div></div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>{patient.prenom} {patient.nom}</span>
          <button onClick={handleLogout} style={{...S.btn("secondary"),fontSize:11,padding:"5px 12px"}}>Deconnexion</button>
        </div>
      </div>
      <div style={S.nav}>
        {TABS.map(([id,ic,label])=>(<div key={id} style={S.navTab(tab===id)} onClick={()=>setTab(id)}>{ic} {label}</div>))}
      </div>
      <div style={S.content}>
        {tab==="profil"&&<MonProfil patient={patient} token={token}/>}
        {tab==="journal"&&<JournalAlimentaire patient={patient} token={token}/>}
        {tab==="plans"&&<MesPlans patient={patient} token={token}/>}
        {tab==="messages"&&<Messagerie patient={patient} token={token}/>}
      </div>
    </div>
  );
}