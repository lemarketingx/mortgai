import { useState } from "react";
import Head from "next/head";

export default function AdvisorLogin() {
  const [advisorId, setAdvisorId] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    const res = await fetch('/api/advisor/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({advisorId,token})});
    if (!res.ok) return setMessage('התחברות נכשלה');
    window.location.href = '/advisor';
  }

  return <main dir="rtl" className="min-h-screen px-4 py-6"><Head><title>Advisor Login</title></Head><div className="mx-auto max-w-md fintech-card p-6"><h1 className="text-2xl font-black">כניסת יועץ</h1><form onSubmit={submit} className="mt-4 grid gap-3"><input className="focus-field rounded-2xl border p-3" placeholder="Advisor ID" value={advisorId} onChange={(e)=>setAdvisorId(e.target.value)} /><input className="focus-field rounded-2xl border p-3" placeholder="Access token" type="password" value={token} onChange={(e)=>setToken(e.target.value)} /><button className="rounded-2xl bg-mort-ink p-3 font-black text-white">כניסה</button></form>{message && <p className="mt-3 text-red-600">{message}</p>}</div></main>;
}
