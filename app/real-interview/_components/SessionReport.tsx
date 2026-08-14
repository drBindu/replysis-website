import { Activity, Gauge, ListChecks, MessageCircleWarning, Sparkles, Target } from "lucide-react";
import type { Turn } from "../_hooks/useSession";
import { analyzeInterviewTurns } from "../_lib/interviewAnalytics";

const C = { panel: "#f7f8fb", card: "#edf0f6", border: "#d4dae6", green: "#1C7A3E" };

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span>{label}</span><span>{score}/25</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-500" style={{ width: `${score * 4}%` }} />
      </div>
    </div>
  );
}

export default function SessionReport({ turns }: { turns: Turn[] }) {
  const report = analyzeInterviewTurns(turns);
  const cards = [
    { icon: Target, label: "Coaching score", value: `${report.overallScore}%` },
    { icon: Sparkles, label: "STAR structure", value: `${report.starScore}%` },
    { icon: Activity, label: "Avg. answer", value: `${report.averageAnswerWords} words` },
    { icon: Gauge, label: "Delivery pace", value: report.paceWpm ? `${report.paceWpm} wpm` : "Use Mock Interview" },
  ];

  return (
    <section className="space-y-4 rounded-2xl border p-4" style={{ background: C.panel, borderColor: C.border }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-800">Session report</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Live-session scores evaluate the saved coaching answers. Use Mock Interview to measure your actual spoken pace and fillers.
          </p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-800">
          {report.answerCount} analyzed
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border p-3" style={{ background: C.card, borderColor: C.border }}>
            <Icon size={14} className="mb-3 text-emerald-800" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-1 text-[14px] font-black text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ background: C.card, borderColor: C.border }}>
          <div className="mb-4 flex items-center gap-2"><Target size={14} className="text-emerald-800"/><p className="text-[11px] font-black uppercase tracking-widest text-slate-600">STAR breakdown</p></div>
          <div className="space-y-3">
            <ScoreBar label="Situation" score={report.star.situation}/>
            <ScoreBar label="Task" score={report.star.task}/>
            <ScoreBar label="Action" score={report.star.action}/>
            <ScoreBar label="Result" score={report.star.result}/>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border p-4" style={{ background: C.card, borderColor: C.border }}>
            <div className="mb-2 flex items-center gap-2"><MessageCircleWarning size={14} className="text-amber-700"/><p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Filler check</p></div>
            <p className="text-[13px] font-bold text-slate-700">{report.fillerTotal === 0 ? "No common filler phrases in saved answers" : `${report.fillerTotal} filler phrase${report.fillerTotal === 1 ? "" : "s"} found`}</p>
            {report.fillers.length > 0 && <p className="mt-1 text-[11px] text-slate-500">{report.fillers.slice(0, 3).map(item => `${item.phrase} ×${item.count}`).join(" · ")}</p>}
          </div>
          <div className="rounded-xl border p-4" style={{ background: C.card, borderColor: C.border }}>
            <div className="mb-2 flex items-center gap-2"><ListChecks size={14} className="text-emerald-800"/><p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Next practice plan</p></div>
            <div className="space-y-2">
              {report.improvementPlan.map((item, index) => <div key={item} className="flex gap-2 text-[11px] font-semibold leading-relaxed text-slate-600"><span className="text-emerald-800">{index + 1}.</span><span>{item}</span></div>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
