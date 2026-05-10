import { useState } from "react";
import Head from "next/head";

export default function AdvisorLogin() {
  const [advisorId, setAdvisorId] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    const res = await fetch('/api/advisor/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({advisorId,token})});
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(j?.message || 'התחברות נכשלה');
    window.location.href = '/advisor';
  }

  return <main dir="rtl" className="min-h-screen px-4 py-6"><Head><title>Advisor Login</title></Head><div className="mx-auto max-w-md fintech-card p-6"><h1 className="text-2xl font-black">כניסת יועץ</h1><form onSubmit={submit} className="mt-4 grid gap-3"><label className="grid gap-1"><span className="text-sm font-black text-mort-muted">מזהה יועץ</span><input className="focus-field rounded-2xl border p-3" value={advisorId} onChange={(e)=>setAdvisorId(e.target.value)} /></label><label className="grid gap-1"><span className="text-sm font-black text-mort-muted">סיסמת יועצים</span><input className="focus-field rounded-2xl border p-3" type="password" value={token} onChange={(e)=>setToken(e.target.value)} /></label><p className="text-sm font-bold text-mort-muted">מזהה היועץ נקבע במערכת האדמין</p><button className="rounded-2xl bg-mort-ink p-3 font-black text-white">כניסה</button></form>{message && <p className="mt-3 text-red-600">{message}</p>}</div></main>;
}
