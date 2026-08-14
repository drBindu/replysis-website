export type AnalyticsTurn = {
  role: "interviewer" | "candidate";
  text: string;
};

export type FillerFinding = { phrase: string; count: number };

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

function starBreakdown(answers: string[]) {
  if (answers.length === 0) return { situation: 0, task: 0, action: 0, result: 0 };

  const joined = answers.join(" ");
  const situation = containsAny(joined, [
    /\bwhen\b/i, /\bduring\b/i, /\bat (?:my|the)\b/i, /\bproject\b/i,
    /\bteam\b/i, /\bchallenge\b/i, /\bsituation\b/i,
  ]) ? 25 : 10;
  const task = containsAny(joined, [
    /\bgoal\b/i, /\bneeded to\b/i, /\bresponsib(?:le|ility)\b/i,
    /\bobjective\b/i, /\btask\b/i, /\bmy role\b/i,
  ]) ? 25 : 10;
  const action = containsAny(joined, [
    /\bi (?:built|created|led|implemented|designed|changed|investigated|organized|resolved|decided|proposed|tested|measured)\b/i,
    /\baction\b/i, /\bfirst[, ]/i, /\bthen[, ]/i,
  ]) ? 25 : 12;
  const result = containsAny(joined, [
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

export function analyzeInterviewTurns(
  turns: AnalyticsTurn[],
  responseDurationsSecs: number[] = [],
): InterviewReport {
  const answers = turns
    .filter(turn => turn.role === "candidate")
    .map(turn => turn.text.trim())
    .filter(Boolean);
  const answerWords = answers.map(answer => words(answer).length);
  const totalWords = answerWords.reduce((sum, count) => sum + count, 0);
  const averageAnswerWords = answers.length ? Math.round(totalWords / answers.length) : 0;
  const fillers = countFillers(answers);
  const fillerTotal = fillers.reduce((sum, item) => sum + item.count, 0);
  const star = starBreakdown(answers);
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
  const specificityScore = containsAny(answers.join(" "), [/\b\d+(?:\.\d+)?%?\b/, /\bfor \d+\b/i]) ? 95 : 65;
  const overallScore = Math.round(
    starScore * 0.4 + lengthScore * 0.25 + fillerScore * 0.2 + specificityScore * 0.15,
  );

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
  if (improvementPlan.length === 0 && answers.length > 0) improvementPlan.push("Raise the difficulty and practice one follow-up question for every example.");

  return {
    overallScore, starScore, star, answerCount: answers.length,
    totalWords, averageAnswerWords, paceWpm, paceLabel,
    fillers, fillerTotal, strengths: strengths.slice(0, 3),
    improvementPlan: improvementPlan.slice(0, 4),
  };
}
