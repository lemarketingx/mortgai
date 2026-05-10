import Head from "next/head";
import { useEffect, useState } from "react";
import { formatILS } from "../../lib/format";

export default function AdvisorDashboard() {
  const [leads, setLeads] = useState([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch('/api/advisor/leads');
    if (!r.ok) { window.location.href = '/advisor/login'; return; }
    const j = await r.json();
    setLeads(j.leads || []);
  }
  useEffect(()=>{load();},[]);

  async function update(id, changes){
    const r=await fetch('/api/advisor/leads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,changes})});
    if(!r.ok){setMsg('שמירה נכשלה'); return;}
    const j=await r.json();
    setLeads((arr)=>arr.map((l)=>l.id===id?j.lead:l));
    setMsg('העדכון נשמר בהצלחה');
  }

  return <main dir="rtl" className="min-h-screen px-4 py-6"><Head><title>Advisor Portal</title></Head><div className="mx-auto max-w-5xl"><section className="glass-card p-6"><h1 className="text-3xl font-black">פורטל יועץ</h1><p className="text-mort-muted font-bold">לידים משויכים בלבד</p>{msg && <p className="text-red-600">{msg}</p>}</section><section className="mt-4 grid gap-4">{!leads.length && <article className="fintech-card p-5 font-black text-mort-muted">אין לידים משויכים ליועץ זה כרגע</article>}{leads.map((lead)=><article key={lead.id} className="fintech-card p-5"><h2 className="text-xl font-black">{lead.name}</h2><p>{lead.phone} · {formatILS(lead.mortgageAmount||0)} · סיכוי אישור: {Math.round(Number(lead.approvalScore)||0)}%</p><p className="text-sm text-mort-muted">נוצר: {new Date(lead.createdAt).toLocaleDateString('he-IL')} · מעקב: {lead.followUpDate || 'לא הוגדר'}</p><p className="text-sm text-mort-muted">סטטוס: {lead.leadStatus || lead.status}</p><textarea className="focus-field mt-2 min-h-20 w-full rounded-2xl border p-2" defaultValue={lead.internalNotes||""} onBlur={(e)=>update(lead.id,{internalNotes:e.target.value,lastContactedAt:new Date().toISOString()})} placeholder="הערות"/><select className="focus-field mt-3 rounded-2xl border p-2" value={lead.leadStatus || lead.status} onChange={(e)=>update(lead.id,{leadStatus:e.target.value,lastContactedAt:new Date().toISOString()})}><option>חדש</option><option>נשלח ליועץ</option><option>בטיפול</option><option>אושר עקרונית</option><option>נסגר</option><option>לא רלוונטי</option></select><input type="date" className="focus-field mt-2 rounded-2xl border p-2" defaultValue={lead.followUpDate?.slice(0,10)||""} onBlur={(e)=>update(lead.id,{followUpDate:e.target.value})}/></article>)}</section></div></main>;
}
