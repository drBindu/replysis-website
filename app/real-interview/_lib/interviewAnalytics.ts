export type AnalyticsTurn = {
  role: "interviewer" | "candidate";
  text: string;
};

export type FillerFinding = { phrase: string; count: number };

export type QuestionScore = {
  question: string;
  answer: string;
  words: number;
  star: { situation: number; task: number; action: number; result: number };
  score: number;
  hasEvidence: boolean;
  flags: string[];
};

export type CompetencyScore = { name: string; score: number };

export type RepeatedAnswerFinding = {
  firstIndex: number;
  secondIndex: number;
  similarity: number;
};

export type InterviewReport = {
  overallScore: number;
  starScore: number;
  star: {
    situation: number;
    task: number;
    action: number;
    result: number;
  };
  answerCount: number;
  totalWords: number;
  averageAnswerWords: number;
  paceWpm: number | null;
  paceLabel: string;
  fillers: FillerFinding[];
  fillerTotal: number;
  strengths: string[];
  improvementPlan: string[];
  questions: QuestionScore[];
  repeatedAnswers: RepeatedAnswerFinding[];
  missingEvidenceCount: number;
  competencies: CompetencyScore[];
  strongestCompetency: string | null;
  weakestCompetency: string | null;
  sevenDayPlan: { day: number; focus: string; drill: string }[];
};

const FILLERS = [
  "you know", "kind of", "sort of", "basically", "actually", "honestly",
  "literally", "I mean", "um", "uh", "erm",
];

function words(text: string): string[] {
  return text.trim().match(/[A-Za-z0-9+#.%'-]+/g) ?? [];
}

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text));
}

function starBreakdown(text: string) {
  const situation = containsAny(text, [
    /\bwhen\b/i, /\bduring\b/i, /\bat (?:my|the)\b/i, /\bproject\b/i,
    /\bteam\b/i, /\bchallenge\b/i, /\bsituation\b/i,
  ]) ? 25 : 10;
  const task = containsAny(text, [
    /\bgoal\b/i, /\bneeded to\b/i, /\bresponsib(?:le|ility)\b/i,
    /\bobjective\b/i, /\btask\b/i, /\bmy role\b/i,
  ]) ? 25 : 10;
  const action = containsAny(text, [
    /\bi (?:built|created|led|implemented|designed|changed|investigated|organized|resolved|decided|proposed|tested|measured)\b/i,
    /\baction\b/i, /\bfirst[, ]/i, /\bthen[, ]/i,
  ]) ? 25 : 12;
  const result = containsAny(text, [
    /\bresult(?:ed)?\b/i, /\b(?:increased|decreased|reduced|improved|saved|grew|delivered)\b/i,
    /\b\d+(?:\.\d+)?%\b/, /\bmetric\b/i, /\boutcome\b/i,
  ]) ? 25 : 8;
  return { situation, task, action, result };
}

function countFillers(answers: string[]): FillerFinding[] {
  const text = ` ${answers.join(" ").toLowerCase()} `;
  return FILLERS.map(phrase => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(`\\b${escaped}\\b`, "gi"));
    return { phrase, count: matches?.length ?? 0 };
  }).filter(item => item.count > 0).sort((a, b) => b.count - a.count);
}

function hasEvidence(text: string): boolean {
  return containsAny(text, [/\b\d+(?:\.\d+)?%?\b/, /\bfor \d+\b/i, /\b(?:increased|decreased|reduced|improved|saved|grew|delivered)\b/i]);
}

/** Word-overlap ratio between two answers, 0-1. Cheap stand-in for a real
 *  similarity model — good enough to flag a candidate reusing one canned
 *  answer for multiple questions, which reads badly to a real interviewer. */
function similarity(a: string, b: string): number {
  const setA = new Set(words(a.toLowerCase()).filter(w => w.length > 3));
  const setB = new Set(words(b.toLowerCase()).filter(w => w.length > 3));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const w of setA) if (setB.has(w)) shared += 1;
  return shared / Math.min(setA.size, setB.size);
}

const COMPETENCIES: Array<{ name: string; patterns: RegExp[] }> = [
  { name: "Ownership", patterns: [/\bi (?:owned|drove|led|took charge|decided|proposed)\b/i, /\bmy responsibility\b/i, /\baccountable\b/i] },
  { name: "Technical depth", patterns: [/\b(?:architecture|algorithm|database|api|system|latency|scalab|infrastructure|pipeline|framework)\b/i, /\bcomplexity\b/i] },
  { name: "Communication", patterns: [/\bexplained\b/i, /\bpresented\b/i, /\baligned\b/i, /\bstakeholder\b/i, /\bcommunicat/i] },
  { name: "Problem solving", patterns: [/\binvestigat/i, /\bdebugg/i, /\bidentified the (?:root cause|issue|problem)\b/i, /\btrade-?off/i, /\balternative/i] },
  { name: "Impact", patterns: [/\b\d+(?:\.\d+)?%\b/, /\b(?:increased|decreased|reduced|improved|saved|grew|delivered)\b/i, /\bresult(?:ed)?\b/i] },
];

function scoreCompetencies(answers: string[]): CompetencyScore[] {
  const joined = answers.join(" ");
  return COMPETENCIES.map(({ name, patterns }) => {
    const hits = patterns.reduce((sum, p) => sum + (joined.match(new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g")) ?? []).length, 0);
    // Diminishing returns so one repeated phrase cannot fake a high score.
    const score = Math.min(100, Math.round(35 + Math.sqrt(hits) * 28));
    return { name, score: answers.length ? score : 0 };
  });
}

function findRepeatedAnswers(answers: string[]): RepeatedAnswerFinding[] {
  const findings: RepeatedAnswerFinding[] = [];
  for (let i = 0; i < answers.length; i++) {
    if (words(answers[i]).length < 12) continue;
    for (let j = i + 1; j < answers.length; j++) {
      if (words(answers[j]).length < 12) continue;
      const sim = similarity(answers[i], answers[j]);
      if (sim >= 0.55) findings.push({ firstIndex: i, secondIndex: j, similarity: Math.round(sim * 100) });
    }
  }
  return findings;
}

function buildSevenDayPlan(
  star: { situation: number; task: number; action: number; result: number },
  fillerTotal: number,
  answersCount: number,
  paceWpm: number | null,
  weakestCompetency: string | null,
  hasRepeats: boolean,
): { day: number; focus: string; drill: string }[] {
  const candidates: { focus: string; drill: string }[] = [];
  if (star.situation < 25 || star.task < 25) candidates.push({ focus: "Framing", drill: "Practice opening five behavioral answers with one sentence of context and the exact responsibility you owned." });
  if (star.action < 25) candidates.push({ focus: "Ownership language", drill: "Rewrite three past answers using first-person action verbs: decided, built, changed, verified." });
  if (star.result < 25) candidates.push({ focus: "Closing with impact", drill: "Add a measurable result or concrete learning to the end of every practice answer, even an estimate." });
  if (fillerTotal > Math.max(2, answersCount)) candidates.push({ focus: "Delivery", drill: "Record two answers and cut every filler word on playback; replace each with a one-second pause." });
  if (paceWpm != null && paceWpm > 175) candidates.push({ focus: "Pacing", drill: "Slow down before the result of each answer; practice pausing after the setup line." });
  if (paceWpm != null && paceWpm < 105) candidates.push({ focus: "Energy", drill: "Shorten the setup of each answer so you reach the action within two sentences." });
  if (hasRepeats) candidates.push({ focus: "Answer variety", drill: "Prepare a distinct example for each common question category (conflict, failure, leadership, technical challenge) so no two answers overlap." });
  if (weakestCompetency) candidates.push({ focus: weakestCompetency, drill: `Prepare two new stories that clearly demonstrate ${weakestCompetency.toLowerCase()}, drawn from different projects.` });
  candidates.push({ focus: "Mock run", drill: "Run a full mock interview end to end and compare this report against the new one." });
  candidates.push({ focus: "Company research", drill: "Read the company's engineering blog or recent news and prepare one tailored question to ask them." });
  candidates.push({ focus: "Review", drill: "Re-read your resume aloud and confirm you can defend every number and claim on it." });

  const plan: { day: number; focus: string; drill: string }[] = [];
  for (let day = 1; day <= 7; day++) {
    const pick = candidates[(day - 1) % candidates.length];
    plan.push({ day, focus: pick.focus, drill: pick.drill });
  }
  return plan;
}

export function analyzeInterviewTurns(
  turns: AnalyticsTurn[],
  responseDurationsSecs: number[] = [],
): InterviewReport {
  // Pair each candidate answer with the question that came before it, so the
  // report can show a real question-by-question breakdown instead of one
  // number for the whole session.
  const qaPairs: { question: string; answer: string }[] = [];
  let pendingQuestion = "";
  for (const turn of turns) {
    const text = turn.text.trim();
    if (!text) continue;
    if (turn.role === "interviewer") {
      pendingQuestion = text;
    } else {
      qaPairs.push({ question: pendingQuestion || "Question not captured", answer: text });
      pendingQuestion = "";
    }
  }

  const answers = qaPairs.map(pair => pair.answer);
  const answerWords = answers.map(answer => words(answer).length);
  const totalWords = answerWords.reduce((sum, count) => sum + count, 0);
  const averageAnswerWords = answers.length ? Math.round(totalWords / answers.length) : 0;
  const fillers = countFillers(answers);
  const fillerTotal = fillers.reduce((sum, item) => sum + item.count, 0);

  const joined = answers.join(" ");
  const star = starBreakdown(joined);
  const starScore = star.situation + star.task + star.action + star.result;

  const measuredSeconds = responseDurationsSecs
    .filter(value => Number.isFinite(value) && value > 0)
    .reduce((sum, value) => sum + value, 0);
  const paceWords = answerWords.slice(0, responseDurationsSecs.length)
    .reduce((sum, count) => sum + count, 0);
  const paceWpm = measuredSeconds >= 5 && paceWords > 0
    ? Math.round((paceWords / measuredSeconds) * 60)
    : null;
  const paceLabel = paceWpm == null
    ? "Practice recording required"
    : paceWpm < 105
      ? "Slow — add energy"
      : paceWpm > 175
        ? "Fast — add pauses"
        : "Clear conversational pace";

  const lengthScore = answers.length === 0 ? 0
    : Math.round(answerWords.reduce((sum, count) => {
        if (count >= 45 && count <= 180) return sum + 100;
        if (count >= 25 && count <= 240) return sum + 75;
        return sum + 45;
      }, 0) / answers.length);
  const fillerScore = totalWords === 0 ? 0 : Math.max(35, 100 - Math.round((fillerTotal / totalWords) * 700));
  const specificityScore = containsAny(joined, [/\b\d+(?:\.\d+)?%?\b/, /\bfor \d+\b/i]) ? 95 : 65;
  const overallScore = Math.round(
    starScore * 0.4 + lengthScore * 0.25 + fillerScore * 0.2 + specificityScore * 0.15,
  );

  // Per-question breakdown.
  const questions: QuestionScore[] = qaPairs.map(({ question, answer }) => {
    const qStar = starBreakdown(answer);
    const qWords = words(answer).length;
    const qLengthOk = qWords >= 25 && qWords <= 240;
    const evidence = hasEvidence(answer);
    const score = Math.round(
      (qStar.situation + qStar.task + qStar.action + qStar.result) * 0.6
      + (qLengthOk ? 25 : 12)
      + (evidence ? 15 : 0),
    );
    const flags: string[] = [];
    if (!evidence) flags.push("No measurable evidence");
    if (qWords < 20) flags.push("Answer is too short to evaluate fully");
    if (qStar.action < 25) flags.push("Unclear what the candidate personally did");
    return { question, answer, words: qWords, star: qStar, score: Math.min(100, score), hasEvidence: evidence, flags };
  });

  const repeatedAnswers = findRepeatedAnswers(answers);
  const missingEvidenceCount = questions.filter(q => !q.hasEvidence).length;

  const competencies = scoreCompetencies(answers);
  const rankedCompetencies = [...competencies].filter(c => c.score > 0).sort((a, b) => b.score - a.score);
  const strongestCompetency = rankedCompetencies[0]?.name ?? null;
  const weakestCompetency = rankedCompetencies[rankedCompetencies.length - 1]?.name ?? null;

  const strengths: string[] = [];
  if (star.action >= 25) strengths.push("Actions are owned with clear first-person decisions.");
  if (star.result >= 25) strengths.push("Results include outcomes or measurable evidence.");
  if (fillerTotal === 0 && answers.length > 0) strengths.push("Responses avoid common filler phrases.");
  if (averageAnswerWords >= 45 && averageAnswerWords <= 180) strengths.push("Answer length is interview-friendly and focused.");
  if (paceWpm != null && paceWpm >= 105 && paceWpm <= 175) strengths.push("Delivery pace is within a clear conversational range.");
  if (strengths.length === 0 && answers.length > 0) strengths.push("The session contains complete responses that can be refined with another practice pass.");

  const improvementPlan: string[] = [];
  if (star.situation < 25 || star.task < 25) improvementPlan.push("Open behavioral answers with one sentence of context and the exact responsibility you owned.");
  if (star.action < 25) improvementPlan.push("Use two or three first-person action steps: what you decided, changed, and verified.");
  if (star.result < 25) improvementPlan.push("Close each example with a measurable result, learning, or business impact.");
  if (fillerTotal > Math.max(2, answers.length)) improvementPlan.push(`Replace repeated filler phrases with a one-second pause; ${fillers[0]?.phrase ?? "fillers"} appeared most often.`);
  if (paceWpm != null && paceWpm > 175) improvementPlan.push("Slow down at transitions and pause before the result so the key point lands.");
  if (paceWpm != null && paceWpm < 105) improvementPlan.push("Increase energy by shortening setup and moving to the action sooner.");
  if (averageAnswerWords > 180) improvementPlan.push("Aim for 60–150 words per behavioral answer unless the interviewer asks for more detail.");
  if (averageAnswerWords > 0 && averageAnswerWords < 35) improvementPlan.push("Add one concrete action and one outcome; the current answers are too brief to prove impact.");
  if (repeatedAnswers.length > 0) improvementPlan.push("Two or more answers overlap heavily — prepare a distinct story for each question category.");
  if (improvementPlan.length === 0 && answers.length > 0) improvementPlan.push("Raise the difficulty and practice one follow-up question for every example.");

  const sevenDayPlan = buildSevenDayPlan(star, fillerTotal, answers.length, paceWpm, weakestCompetency, repeatedAnswers.length > 0);

  return {
    overallScore, starScore, star, answerCount: answers.length,
    totalWords, averageAnswerWords, paceWpm, paceLabel,
    fillers, fillerTotal, strengths: strengths.slice(0, 3),
    improvementPlan: improvementPlan.slice(0, 5),
    questions, repeatedAnswers, missingEvidenceCount,
    competencies, strongestCompetency, weakestCompetency,
    sevenDayPlan,
  };
}
