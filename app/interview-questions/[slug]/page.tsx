import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, PageFooter } from "../../../components/PageShell";
import { INTERVIEW_QUESTIONS, type InterviewQuestion } from "../../../data/interviewQuestions";
import { CATEGORY_FRAMES, QUESTION_GUIDES } from "../../../data/questionGuides";
import { questionPath, questionSlug } from "../../../data/questionSlugs";
import "../../home-v2.css";

const SITE = "https://replysis.com";

export function generateStaticParams() {
  return INTERVIEW_QUESTIONS.map((q) => ({ slug: questionSlug(q) }));
}

function find(slug: string): InterviewQuestion | undefined {
  return INTERVIEW_QUESTIONS.find((q) => questionSlug(q) === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const q = find(slug);
  if (!q) return {};
  const title = `How to answer: ${q.question}`;
  const guide = QUESTION_GUIDES[q.id];
  const description = `${guide?.testing ?? q.focus} A step by step outline for this ${q.category.toLowerCase()} interview question, with the mistake to avoid.`;
  return {
    title: `${title}  -  Replysis`,
    description: description.slice(0, 300),
    alternates: { canonical: `${SITE}${questionPath(q)}` },
    openGraph: { title, description: description.slice(0, 200), url: `${SITE}${questionPath(q)}`, type: "article" },
  };
}

export default async function QuestionGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = find(slug);
  const guide = q ? QUESTION_GUIDES[q.id] : undefined;
  if (!q || !guide) notFound();

  const frame = CATEGORY_FRAMES[q.category];
  const related = INTERVIEW_QUESTIONS
    .filter((o) => o.id !== q.id && (o.role === q.role || o.category === q.category))
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `How to answer: ${q.question}`,
    description: guide.testing,
    mainEntityOfPage: `${SITE}${questionPath(q)}`,
    author: { "@type": "Organization", name: "Replysis" },
    publisher: { "@type": "Organization", name: "Replysis", url: SITE },
  };

  return (
    <div className="marketing hv2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader />

      <section className="hv2-hero" style={{ paddingTop: 112 }}>
        <div className="hv2-wrap">
          <p className="hv2-fine" style={{ marginBottom: 14 }}>
            <Link href="/question-bank" className="hv2-link">Question bank</Link>
            {" / "}{q.role}, {q.category}, {q.difficulty}
          </p>
          <h1 className="hv2-serif hv2-h1" style={{ maxWidth: "16em" }}>
            How to answer: <em>{q.question}</em>
          </h1>
          <p className="hv2-lead">{guide.testing}</p>
        </div>
      </section>

      <section className="hv2-section" style={{ paddingTop: 56 }}>
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">What the interviewer <em>is testing.</em></h2>
          <p className="hv2-p">{q.focus}. {guide.testing}</p>
        </div>
      </section>

      <section className="hv2-section" style={{ paddingTop: 56 }}>
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">An outline for <em>this question.</em></h2>
          <ol style={{ margin: 0, paddingLeft: 22, maxWidth: "40em" }}>
            {guide.outline.map((step) => (
              <li key={step} className="hv2-p" style={{ marginBottom: 12 }}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hv2-section" style={{ paddingTop: 56 }}>
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">The mistake <em>to avoid.</em></h2>
          <p className="hv2-p">{guide.mistake}</p>
        </div>
      </section>

      {frame && (
        <section className="hv2-section" style={{ paddingTop: 56 }}>
          <div className="hv2-wrap">
            <h2 className="hv2-serif hv2-h2">The general method: <em>{frame.name.toLowerCase()}.</em></h2>
            <p className="hv2-p">The same shape works for most {q.category.toLowerCase()} questions, whatever the topic.</p>
            <ul style={{ margin: 0, paddingLeft: 22, maxWidth: "40em" }}>
              {frame.steps.map((step) => (
                <li key={step} className="hv2-p" style={{ marginBottom: 10 }}>{step}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="hv2-section" style={{ paddingTop: 56 }}>
        <div className="hv2-wrap">
          <h2 className="hv2-serif hv2-h2">Practice it, <em>out loud.</em></h2>
          <p className="hv2-p">
            Reading an outline is not the same as saying it. Answer this question in a mock interview, in your own words,
            then compare it with the outline above.
          </p>
          <p style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <Link href="/mock-interview" className="hv2-btn">Practice this question</Link>
            <Link href="/pricing" className="hv2-link">See live interview help</Link>
          </p>
        </div>
      </section>

      {related.length > 0 && (
        <section className="hv2-section" style={{ paddingTop: 56 }}>
          <div className="hv2-wrap">
            <h2 className="hv2-serif hv2-h2">More to <em>practice.</em></h2>
            <ul className="hv2-index">
              {related.map((o) => (
                <li key={o.id}>
                  <h3 className="hv2-serif">
                    <Link href={questionPath(o)} className="hv2-link">{o.question}</Link>
                  </h3>
                  <p>{o.role}, {o.category}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="hv2-section" style={{ paddingTop: 40, paddingBottom: 72 }}>
        <div className="hv2-wrap">
          <p className="hv2-fine">
            This is a Replysis practice question. It is not a leaked or official question from any company, and the outline is
            a guide to structure, not a script. Use your own experience and facts.
          </p>
        </div>
      </section>

      <PageFooter />
    </div>
  );
}
