import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, PageFooter } from "../../components/PageShell";
import { INTERVIEW_QUESTIONS } from "../../data/interviewQuestions";
import { questionPath } from "../../data/questionSlugs";
import "../home-v2.css";

export const metadata: Metadata = {
  title: "Interview Questions and How to Answer Them  -  Replysis",
  description: "Practice interview questions for software, product, data, sales and leadership roles, each with an outline of a strong answer and the mistake to avoid.",
  alternates: { canonical: "https://replysis.com/interview-questions" },
};

const ROLES = ["Software Engineering", "Product", "Data", "Sales", "Leadership"] as const;

export default function InterviewQuestionsPage() {
  return (
    <div className="marketing hv2 min-h-screen">
      <PageHeader />

      <section className="hv2-hero" style={{ paddingTop: 112 }}>
        <div className="hv2-wrap">
          <h1 className="hv2-serif hv2-h1" style={{ maxWidth: "13em" }}>
            Interview questions, <em>and how to answer them.</em>
          </h1>
          <p className="hv2-lead">
            {INTERVIEW_QUESTIONS.length} practice questions. Each one has an outline of a strong answer, the mistake that costs
            the most, and a way to practise it out loud.
          </p>
        </div>
      </section>

      {ROLES.map((role) => {
        const items = INTERVIEW_QUESTIONS.filter((q) => q.role === role);
        if (items.length === 0) return null;
        return (
          <section key={role} className="hv2-section" style={{ paddingTop: 56 }}>
            <div className="hv2-wrap">
              <h2 className="hv2-serif hv2-h2">{role}</h2>
              <ul className="hv2-index">
                {items.map((q) => (
                  <li key={q.id}>
                    <h3 className="hv2-serif">
                      <Link href={questionPath(q)} className="hv2-link">{q.question}</Link>
                    </h3>
                    <p>{q.category}, {q.difficulty}. {q.focus}.</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      <section className="hv2-section" style={{ paddingTop: 40, paddingBottom: 72 }}>
        <div className="hv2-wrap">
          <p className="hv2-fine">
            These are Replysis practice questions. They are not leaked or official questions from any company. Want to filter by
            company or search? Use the <Link href="/question-bank" className="hv2-link">question bank</Link>.
          </p>
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
