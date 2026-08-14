import { Activity, AlertTriangle, Calendar, Gauge, ListChecks, MessageCircleWarning, Sparkles, Target, TrendingUp } from "lucide-react";
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

function CompetencyBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span>{label}</span><span>{score}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-700 to-sky-400" style={{ width: `${score}%` }} />
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
            <div className="mb-2 flex items-center gap-2"><ListChecks size={14} className="text-emerald-800"/><p className="text-[11px] font-black uppercase tracking-widest text-slate-600">What to fix next</p></div>
            <div className="space-y-2">
              {report.improvementPlan.map((item, index) => <div key={item} className="flex gap-2 text-[11px] font-semibold leading-relaxed text-slate-600"><span className="text-emerald-800">{index + 1}.</span><span>{item}</span></div>)}
            </div>
          </div>
        </div>
      </div>

      {report.competencies.some(c => c.score > 0) && (
        <div className="rounded-xl border p-4" style={{ background: C.card, borderColor: C.border }}>
          <div className="mb-1 flex items-center gap-2"><TrendingUp size={14} className="text-sky-700"/><p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Competencies</p></div>
          {(report.strongestCompetency || report.weakestCompetency) && (
            <p className="mb-3 text-[11px] font-medium text-slate-500">
              {report.strongestCompetency && <>Strongest: <span className="font-bold text-emerald-800">{report.strongestCompetency}</span></>}
              {report.strongestCompetency && report.weakestCompetency && "  ·  "}
              {report.weakestCompetency && <>Weakest: <span className="font-bold text-amber-700">{report.weakestCompetency}</span></>}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {report.competencies.map(c => <CompetencyBar key={c.name} label={c.name} score={c.score} />)}
          </div>
        </div>
      )}

      {report.questions.length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: C.card, borderColor: C.border }}>
          <div className="mb-3 flex items-center gap-2"><ListChecks size={14} className="text-emerald-800"/><p className="text-[11px] font-black uppercase tracking-widest text-slate-600">Question by question</p></div>
          <div className="space-y-2">
            {report.questions.map((q, i) => (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: C.border, background: C.panel }}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{q.question}</p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: q.score >= 70 ? "#dcfce7" : q.score >= 45 ? "#fef3c7" : "#fee2e2", color: q.score >= 70 ? "#166534" : q.score >= 45 ? "#92400e" : "#991b1b" }}>
                    {q.score}%
                  </span>
                </div>
                {q.flags.length > 0 && (
                  <p className="mt-1.5 text-[10px] font-medium text-amber-700">{q.flags.join(" · ")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {report.repeatedAnswers.length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
          <div className="mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-red-700"/><p className="text-[11px] font-black uppercase tracking-widest text-red-800">Repeated answers</p></div>
          <p className="text-[11px] font-medium text-red-700">
            {report.repeatedAnswers.length} pair{report.repeatedAnswers.length === 1 ? "" : "s"} of answers overlap heavily
            {" "}(question {report.repeatedAnswers[0].firstIndex + 1} and {report.repeatedAnswers[0].secondIndex + 1} share about {report.repeatedAnswers[0].similarity}% of the same wording).
            Prepare a distinct example for each question category.
          </p>
        </div>
      )}

      {report.sevenDayPlan.length > 0 && (
        <div className="rounded-xl border p-4" style={{ background: C.card, borderColor: C.border }}>
          <div className="mb-3 flex items-center gap-2"><Calendar size={14} className="text-emerald-800"/><p className="text-[11px] font-black uppercase tracking-widest text-slate-600">7-day improvement plan</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {report.sevenDayPlan.map(day => (
              <div key={day.day} className="rounded-lg border p-3" style={{ borderColor: C.border, background: C.panel }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800">Day {day.day} · {day.focus}</p>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600">{day.drill}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
