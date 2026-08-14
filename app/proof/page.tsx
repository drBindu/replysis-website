"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, Check, CircleAlert, Globe2, Laptop, Mic, MonitorUp, ShieldCheck, Star } from "lucide-react";
import { auth } from "../firebaseConfig";
import BrandIcon from "../../components/BrandIcon";

type Review = { id:string; rating:number; title:string; body:string; role:string; platform:string; displayName:string; verifiedPurchase:boolean };

export default function ProofPage() {
  const [health, setHealth] = useState<"checking"|"online"|"unavailable">("checking");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewState, setReviewState] = useState("");
  const [form, setForm] = useState({ rating:5, title:"", body:"", role:"", platform:"Web" });
  const secure = typeof window !== "undefined" && window.isSecureContext;
  const microphone = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  const screenCapture = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);

  useEffect(() => {
    fetch("/api/healthz", { cache:"no-store" }).then(response => setHealth(response.ok ? "online" : "unavailable")).catch(()=>setHealth("unavailable"));
    fetch("/api/reviews").then(response=>response.json()).then(data=>setReviews(data.reviews ?? [])).catch(()=>setReviews([]));
  }, []);

  const submitReview = async () => {
    setReviewState("Submitting…");
    const token = await auth.currentUser?.getIdToken();
    if (!token) { setReviewState("Sign in with the account that purchased Replysis."); return; }
    const response = await fetch("/api/reviews", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify(form) });
    const data = await response.json().catch(()=>({}));
    setReviewState(response.ok ? "Review received. It will appear after moderation." : data.error ?? "Review could not be submitted.");
  };

  const tests = [
    { label:"Secure website context", ok:secure, detail:secure?"HTTPS security context available":"Open the production HTTPS site" },
    { label:"Microphone API", ok:microphone, detail:microphone?"Browser exposes audio capture":"This browser cannot expose microphone capture" },
    { label:"Screen-share API", ok:screenCapture, detail:screenCapture?"Browser exposes screen selection":"Use the Windows or macOS app for capture" },
    { label:"Replysis API", ok:health==="online", detail:health==="checking"?"Checking now…":health==="online"?"Health endpoint responded successfully":"Health endpoint is unavailable" },
  ];

  return <main className="min-h-screen bg-[#eef2ee] text-slate-900">
    <nav className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><div className="flex items-center gap-3"><BrandIcon size={34}/><span className="font-black">Replysis</span><span className="text-xs font-black text-emerald-700">Proof Center</span></div><Link href="/trust" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"><ArrowLeft size={14}/> Trust Center</Link></div></nav>
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_390px]"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800">Evidence over slogans</p><h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Check the product before you trust it.</h1><p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">Live compatibility checks, honest platform scope, and customer reviews that are only labeled verified after a confirmed purchase. No placeholder testimonials.</p></div><div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><ShieldCheck className="text-emerald-800"/><p className="mt-5 text-sm font-black">What “verified” means here</p><p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">A verified review requires a paid plan or credit purchase and is moderated before publication. It does not mean Replysis is SOC 2 certified or independently endorsed.</p></div></div>

      <section className="mt-10"><div className="mb-4 flex items-center gap-2"><Activity size={17} className="text-emerald-800"/><h2 className="text-xl font-black">This browser’s compatibility check</h2></div><div className="grid gap-3 md:grid-cols-2">{tests.map(test=><div key={test.label} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${test.ok?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-700"}`}>{test.ok?<Check size={14}/>:<CircleAlert size={14}/>}</span><div><p className="text-sm font-black">{test.label}</p><p className="mt-1 text-xs font-medium text-slate-500">{test.detail}</p></div></div>)}</div></section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><Laptop size={18} className="text-emerald-800"/><h2 className="text-xl font-black">Platform scope</h2></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400"><th className="pb-3">Platform</th><th className="pb-3">Live audio</th><th className="pb-3">Setup check</th><th className="pb-3">Screen workflow</th><th className="pb-3">What to verify</th></tr></thead><tbody>{[
        ["Web","Available","Audio + network","Browser screen share","Permissions and meeting audio routing"],
        ["Windows app","Available","Audio + network + capture","Full, primary, or selected region","Your specific meeting app and capture method"],
        ["macOS app","Available","Audio + network + capture","Full screen or interactive region","Screen Recording permission and meeting app"],
      ].map(row=><tr key={row[0]} className="border-b border-slate-100"><td className="py-4 font-black">{row[0]}</td>{row.slice(1).map((cell,index)=><td key={cell} className={`py-4 text-xs font-semibold ${index<3?"text-emerald-800":"text-slate-500"}`}>{cell}</td>)}</tr>)}</tbody></table></div><p className="mt-4 text-[11px] font-medium text-slate-500">Compatibility is environment-dependent. Run the in-product setup check before every real interview; this table is scope documentation, not a guarantee for every meeting or capture configuration.</p></section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_420px]"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Star size={18} className="text-amber-600"/><h2 className="text-xl font-black">Verified customer reviews</h2></div><span className="text-xs font-black text-slate-400">{reviews.length} published</span></div>{reviews.length===0?<div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="font-black">No verified reviews published yet</p><p className="mt-2 text-xs font-medium text-slate-500">The section stays empty until a real customer review is approved.</p></div>:<div className="mt-5 space-y-3">{reviews.map(review=><article key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between"><span className="text-amber-600">{"★".repeat(review.rating)}</span>{review.verifiedPurchase&&<span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">Verified purchase</span>}</div><h3 className="mt-3 font-black">{review.title}</h3><p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">{review.body}</p><p className="mt-3 text-[10px] font-bold text-slate-400">{review.displayName} · {review.role||"Customer"} · {review.platform}</p></article>)}</div>}</div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Submit a verified review</h2><p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">Paid customers can submit one review. Every review is moderated; critical reviews are allowed when they are specific and genuine.</p><div className="mt-5 space-y-3"><select value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold">{[5,4,3,2,1].map(value=><option key={value} value={value}>{value} stars</option>)}</select><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Review title" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none"/><textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={5} placeholder="What worked, what did not, and which workflow did you use?" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none"/><div className="grid grid-cols-2 gap-3"><input value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="Role (optional)" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none"/><select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold"><option>Web</option><option>Windows</option><option>macOS</option></select></div><button onClick={submitReview} className="w-full rounded-xl bg-emerald-800 py-3 text-sm font-black text-white">Submit for moderation</button>{reviewState&&<p className="text-xs font-bold text-slate-600">{reviewState}</p>}</div></div></section>
    </div>
  </main>;
}
