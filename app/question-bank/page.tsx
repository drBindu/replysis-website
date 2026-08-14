"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, BookOpen, Building2, Search, Sparkles, Target } from "lucide-react";
import BrandIcon from "../../components/BrandIcon";
import { INTERVIEW_QUESTIONS } from "../../data/interviewQuestions";

const companies = ["All", "General", "Amazon", "Google", "Meta", "Microsoft", "Apple"] as const;
const roles = ["All", "Software Engineering", "Product", "Data", "Sales", "Leadership"] as const;

export default function QuestionBankPage() {
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState<(typeof companies)[number]>("All");
  const [role, setRole] = useState<(typeof roles)[number]>("All");
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("replysis-question-bookmarks") ?? "[]")); } catch {}
  }, []);

  const filtered = useMemo(() => INTERVIEW_QUESTIONS.filter(item => {
    const matchesQuery = !query.trim() || `${item.question} ${item.focus} ${item.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (company === "All" || item.company === company) && (role === "All" || item.role === role);
  }), [query, company, role]);

  const toggleSaved = (id: string) => {
    setSaved(current => {
      const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
      localStorage.setItem("replysis-question-bookmarks", JSON.stringify(next));
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-[#e7ece8] text-slate-900">
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3"><BrandIcon size={34}/><span className="font-black">Replysis</span><span className="text-xs font-black text-emerald-700">Question Bank</span></div>
          <Link href="/real-interview" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"><ArrowLeft size={14}/> Interview setup</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_380px]">
          <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800"><BookOpen size={12}/> Representative practice library</div><h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Know what to practice next.</h1><p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">Company- and role-focused prompts for structured practice. These are Replysis practice questions, not leaked or officially supplied company questions.</p></div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your library</p><div className="mt-3 flex items-end justify-between"><div><p className="text-3xl font-black">{filtered.length}</p><p className="text-xs font-semibold text-slate-500">questions in this view</p></div><div className="text-right"><p className="text-xl font-black text-emerald-800">{saved.length}</p><p className="text-xs font-semibold text-slate-500">bookmarked</p></div></div></div>
        </div>

        <div className="mt-8 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_220px]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4"><Search size={16} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search questions, skills, or topics" className="w-full bg-transparent py-3 text-sm font-semibold outline-none"/></label>
          <select value={company} onChange={e=>setCompany(e.target.value as any)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none">{companies.map(item=><option key={item}>{item}</option>)}</select>
          <select value={role} onChange={e=>setRole(e.target.value as any)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none">{roles.map(item=><option key={item}>{item}</option>)}</select>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map(item => <article key={item.id} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4"><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600"><Building2 size={10}/>{item.company}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-800">{item.category}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-800">{item.difficulty}</span></div><button onClick={()=>toggleSaved(item.id)} aria-label="Bookmark question" className={`rounded-xl border p-2 ${saved.includes(item.id)?"border-emerald-300 bg-emerald-50 text-emerald-800":"border-slate-200 text-slate-400"}`}><Bookmark size={15} fill={saved.includes(item.id)?"currentColor":"none"}/></button></div>
            <h2 className="mt-5 text-[17px] font-black leading-snug text-slate-900">{item.question}</h2>
            <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4"><Target size={14} className="mt-0.5 shrink-0 text-emerald-700"/><div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">What to demonstrate</p><p className="mt-1 text-xs font-semibold text-slate-600">{item.focus}</p></div></div>
          </article>)}
        </div>
        {filtered.length===0 && <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center"><Sparkles className="mx-auto text-slate-300"/><p className="mt-4 font-black">No exact match</p><p className="mt-1 text-sm text-slate-500">Clear a filter or try a broader skill.</p></div>}
      </section>
    </main>
  );
}
