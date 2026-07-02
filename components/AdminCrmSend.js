import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { formatILS } from "../lib/format";

const LEAD_STATUSES = ["pending_review", "approved_marketplace", "partner_only", "hidden", "claimed_by_partner", "sold", "archived"];

function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? formatILS(n) : "-"; }
function norm(value) { return String(value || "").toLowerCase().trim(); }
function advisorId(advisor) { return advisor?.advisor_id || advisor?.advisorId || ""; }

function badgeClass(status) {
  const map = {
    pending_review: "bg-warning-50 text-warning-800 border-warning-200",
    approved_marketplace: "bg-success-50 text-success-800 border-success-200",
    partner_only: "bg-brand-50 text-brand-800 border-brand-200",
    hidden: "bg-slate-100 text-slate-600 border-slate-200",
    claimed_by_partner: "bg-brand-50 text-brand-800 border-brand-200",
    sold: "bg-success-50 text-success-800 border-success-200",
    archived: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return map[status] || map.pending_review;
}

export default function AdminCrmSend() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");

  function show(msg, isError = false) { setMessage(msg); setError(isError); }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/leads");
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) { setAuthenticated(false); return; }
      if (!r.ok) throw new Error(d.message || d.error || "Failed loading admin");
      setLeads(Array.isArray(d.leads) ? d.leads : []);
      setAdvisors(Array.isArray(d.advisors) ? d.advisors : []);
      setAuthenticated(true);
    } catch (e) { show(e.message || "Load failed", true); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || d.error || "Login failed");
      setPassword("");
      await load();
    } catch (e2) { show(e2.message || "Login failed", true); } finally { setLoading(false); }
  }

  async function patchLead(id, changes) {
    const r = await fetch("/api/admin/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, changes }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return show(d.message || d.error || "Update failed", true);
    if (d.lead) setLeads((curr) => curr.map((lead) => (lead.id === id ? d.lead : lead)));
  }

  const advisorMap = useMemo(() => Object.fromEntries(advisors.map((a) => [advisorId(a), a])), [advisors]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return leads.filter((lead) => {
      const state = lead.storeStatus || "pending_review";
      const hay = norm([lead.name, lead.phone, lead.city, lead.assignedAdvisor, lead.assignedAdvisorId].join(" "));
      return (!q || hay.includes(q)) && (!statusFilter || state === statusFilter) && (!advisorFilter || lead.assignedAdvisorId === advisorFilter);
    });
  }, [leads, query, statusFilter, advisorFilter]);

  const kpi = useMemo(() => {
    const marketplace = leads.filter((l) => l.storeStatus === "approved_marketplace").length;
    const sold = leads.filter((l) => l.storeStatus === "sold").length;
    const claimed = leads.filter((l) => l.storeStatus === "claimed_by_partner").length;
    const estRevenue = leads.reduce((sum, lead) => {
      if (lead.storeStatus === "sold") return sum + Number(lead.exclusivePrice || lead.storePrice || 0);
      if (lead.storeStatus === "claimed_by_partner") return sum + Number(lead.storePrice || 0);
      return sum;
    }, 0);
    const activeAdvisors = advisors.filter((a) => a.active !== false).length;
    return { marketplace, sold, claimed, estRevenue, activeAdvisors };
  }, [leads, advisors]);

  if (!authenticated) return <main dir="rtl" className="min-h-screen px-4 py-8"><Head><title>Admin | FINZO</title></Head><section className="mx-auto max-w-md rounded-2xl border bg-white p-6"><h1 className="text-2xl font-black">כניסת אדמין</h1><form className="mt-4 grid gap-3" onSubmit={login}><input className="rounded-xl border p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="סיסמה" /><button className="rounded-xl bg-black px-4 py-3 font-bold text-white">{loading ? "..." : "כניסה"}</button></form>{message && <p className="mt-3 text-sm text-danger-700">{message}</p>}</section></main>;

  return <main dir="rtl" className="min-h-screen px-3 py-4 sm:px-6"><Head><title>Admin Control Center | FINZO</title></Head><div className="mx-auto max-w-[1500px] space-y-4">
    <section className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-black">FINZO Pro — Admin Control Center</h1><button className="rounded-lg border px-3 py-2" onClick={load}>{loading ? "טוען" : "רענון"}</button></div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5"><KPI label="Marketplace" value={kpi.marketplace} /><KPI label="Sold" value={kpi.sold} /><KPI label="Partner claimed" value={kpi.claimed} /><KPI label="Estimated revenue" value={money(kpi.estRevenue)} /><KPI label="Active advisors" value={kpi.activeAdvisors} /></div>
      <div className="mt-4 grid gap-3 md:grid-cols-4"><input className="rounded-xl border p-2" placeholder="חיפוש ליד" value={query} onChange={(e) => setQuery(e.target.value)} /><select className="rounded-xl border p-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All states</option>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select><select className="rounded-xl border p-2" value={advisorFilter} onChange={(e) => setAdvisorFilter(e.target.value)}><option value="">All advisors</option>{advisors.map((a) => <option key={advisorId(a)} value={advisorId(a)}>{a.name || advisorId(a)}</option>)}</select></div>
      {message && <div className={`mt-3 rounded-lg border p-2 text-sm ${error ? "border-danger-200 bg-danger-50 text-danger-700" : "border-success-200 bg-success-50 text-success-700"}`}>{message}</div>}
    </section>

    <section className="rounded-2xl border bg-white p-4 overflow-auto"><table className="w-full min-w-[1200px] text-sm"><thead><tr className="text-right"><th>Lead</th><th>Status</th><th>Prices</th><th>Featured/Hot</th><th>Assignment</th><th>Advisor</th><th>Actions</th></tr></thead><tbody>{filtered.map((lead) => {
      const assigned = advisorMap[lead.assignedAdvisorId] || null;
      return <tr key={lead.id} className="border-t align-top"><td className="py-3"><div className="font-bold">{lead.name || "-"}</div><div>{lead.phone || "-"}</div><div className="text-xs text-slate-500">{lead.city || "-"}</div></td><td className="py-3"><span className={`rounded-full border px-2 py-1 text-xs ${badgeClass(lead.storeStatus || "pending_review")}`}>{lead.storeStatus || "pending_review"}</span><select className="mt-2 w-full rounded-lg border p-2" value={lead.storeStatus || "pending_review"} onChange={(e) => patchLead(lead.id, { storeStatus: e.target.value })}>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td><td className="py-3 space-y-2"><input type="number" className="w-full rounded-lg border p-2" value={lead.storePrice || 0} onChange={(e) => patchLead(lead.id, { storePrice: Number(e.target.value || 0) })} placeholder="Regular" /><input type="number" className="w-full rounded-lg border p-2" value={lead.exclusivePrice || 0} onChange={(e) => patchLead(lead.id, { exclusivePrice: Number(e.target.value || 0) })} placeholder="Exclusive" /></td><td className="py-3"><label className="flex items-center gap-2"><input type="checkbox" checked={lead.leadQuality === "חם"} onChange={(e) => patchLead(lead.id, { leadQuality: e.target.checked ? "חם" : "בינוני" })} /> Hot</label><label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={lead.leadPriority === "גבוה"} onChange={(e) => patchLead(lead.id, { leadPriority: e.target.checked ? "גבוה" : "רגיל" })} /> Featured</label></td><td className="py-3"><select className="w-full rounded-lg border p-2" value={lead.assignedAdvisorId || ""} onChange={(e) => { const adv = advisorMap[e.target.value]; patchLead(lead.id, { assignedAdvisorId: e.target.value, assignedAdvisor: adv?.name || "", advisorEmail: adv?.email || "", advisorPhone: adv?.phone || "" }); }}><option value="">Marketplace</option>{advisors.map((a) => <option key={advisorId(a)} value={advisorId(a)}>{a.name || advisorId(a)}</option>)}</select></td><td className="py-3 text-xs">{assigned ? <><div>{assigned.name}</div><div>{assigned.email || "-"}</div><div>{assigned.advisor_type || "-"}</div>{String(assigned.advisor_type || "").toLowerCase() === "partner" && <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5">Partner</span>}</> : "-"}</td><td className="py-3"><div className="grid gap-2"><button className="rounded border px-2 py-1" onClick={() => patchLead(lead.id, { storeStatus: "partner_only" })}>Mark partner-only</button><button className="rounded border px-2 py-1" onClick={() => patchLead(lead.id, { storeStatus: "approved_marketplace", assignedAdvisorId: "", assignedAdvisor: "", advisorEmail: "", advisorPhone: "" })}>Return to marketplace</button></div></td></tr>;
    })}</tbody></table></section>

    <section className="rounded-2xl border bg-white p-4"><h2 className="font-black mb-3">Advisor visibility</h2><div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{advisors.map((a) => { const id = advisorId(a); const owned = leads.filter((l) => l.assignedAdvisorId === id).length; return <div key={id} className="rounded-xl border p-3 text-sm"><div className="font-bold">{a.name || id}</div><div>{a.email || "-"}</div><div>advisor_type: {a.advisor_type || "-"}</div><div>owned leads: {owned}</div>{String(a.advisor_type || "").toLowerCase() === "partner" && <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs">partner</span>}</div>; })}</div></section>
  </div></main>;
}

function KPI({ label, value }) {
  return <div className="rounded-xl border bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-black">{value}</div></div>;
}
