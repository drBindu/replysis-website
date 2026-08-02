// app/real-interview/_lib/promptBuilder.ts
// Synced with PromptBuilder.cs (Windows native app)  -  enterprise grade

export type Turn = { role: "interviewer" | "candidate"; text: string };

// ═══════════════════════════════════════════════════════════════
// MODULE-LEVEL SESSION STATE
// Locked facts persist across all buildMessages() calls in a session.
// Call clearSessionState() when starting a new interview.
// ═══════════════════════════════════════════════════════════════

const lockedFacts = new Map<string, string>();

interface FactPattern {
  key:       string;
  qTriggers: string[];
  aKeywords: string[];
}

const factPatterns: FactPattern[] = [
  {
    key:       "best_language",
    qTriggers: ["language", "lang", "favorite lang", "best lang", "strongest lang",
                "code in", "coding language", "programming language"],
    aKeywords: ["Python", "Java", "JavaScript", "TypeScript", "Go", "Golang", "Rust",
                "C#", "C++", "Kotlin", "Swift", "Ruby", "PHP", "Scala", "Dart"],
  },
  {
    key:       "years_experience",
    qTriggers: ["years", "experience", "how long", "long have you", "how many year",
                "total experience"],
    aKeywords: ["1 year", "2 year", "3 year", "4 year", "5 year", "6 year",
                "1.5", "2.5", "3.5", "4.5", "one year", "two year", "three year"],
  },
  {
    key:       "current_employer",
    qTriggers: ["current company", "current employer", "where do you work",
                "currently work", "working now", "current job", "current role"],
    aKeywords: ["Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix",
                "Uber", "Airbnb", "Stripe", "Wipro", "Infosys", "TCS",
                "Renasant", "Bank", "Finance", "Tech", "Software"],
  },
  {
    key:       "salary_expectation",
    qTriggers: ["salary", "compensation", "pay", "ctc", "how much",
                "expected salary", "rate expectation", "pay expectation"],
    aKeywords: ["$", "k ", "thousand", "lakh", "USD"],
  },
  {
    key:       "best_strength",
    qTriggers: ["strength", "best at", "strongest", "excel at", "good at",
                "top skill", "superpower"],
    aKeywords: ["Java", "Python", "leadership", "problem solving", "architecture",
                "backend", "frontend", "DevOps", "cloud", "communication"],
  },
  {
    key:       "education",
    qTriggers: ["education", "degree", "study", "university", "college",
                "school", "master", "bachelor", "graduate"],
    aKeywords: ["Bachelor", "Master", "MS", "BS", "PhD", "B.Tech", "M.Tech",
                "Computer Science", "Engineering"],
  },
  {
    key:       "relocation",
    qTriggers: ["relocat", "move", "open to moving", "willing to move"],
    aKeywords: ["yes", "no", "absolutely", "open to", "not willing"],
  },
  {
    key:       "visa_status",
    qTriggers: ["visa", "stem opt", "work authorization", "sponsorship",
                "authorized to work", "citizen", "green card", "h1b", "h-1b"],
    aKeywords: ["STEM OPT", "H-1B", "citizen", "green card", "EAD", "F-1",
                "authorized", "sponsorship"],
  },
  {
    key:       "start_date",
    qTriggers: ["start date", "when can you start", "notice period",
                "available to join", "earliest start", "join us"],
    aKeywords: ["week", "month", "immediately", "right away", "2 weeks",
                "4 weeks", "30 days"],
  },
];

export function extractAndLockFacts(question: string, answer: string): void {
  const qLow = question.toLowerCase();
  const aLow = answer.toLowerCase();

  for (const { key, qTriggers, aKeywords } of factPatterns) {
    if (lockedFacts.has(key)) continue; // first answer wins

    const qMatch = qTriggers.some(t => qLow.includes(t));
    if (!qMatch) continue;

    for (const kw of aKeywords) {
      if (aLow.includes(kw.toLowerCase())) {
        const idx     = aLow.indexOf(kw.toLowerCase());
        const start   = Math.max(0, idx - 15);
        const end     = Math.min(answer.length, idx + kw.length + 50);
        let snippet   = answer.substring(start, end).trim();
        if (snippet.length > 80) snippet = snippet.substring(0, 80) + "...";
        lockedFacts.set(key, `${kw} (you said: "${snippet}")`);
        break;
      }
    }
  }
}

export function clearSessionState(): void {
  lockedFacts.clear();
}

// ═══════════════════════════════════════════════════════════════
// CONFLICT DETECTION
// Returns true ONLY when interviewer is ASSERTING a different value
// than what's locked  -  NOT when simply asking if you know something.
// ═══════════════════════════════════════════════════════════════
export function hasLockedConflict(question: string): boolean {
  if (lockedFacts.size === 0) return false;
  const qLow = question.toLowerCase();

  // Genuine skill/knowledge queries are NEVER conflicts
  if (
    qLow.includes("do you know")         || qLow.includes("do you use")        ||
    qLow.includes("are you familiar")    || qLow.includes("can you use")        ||
    qLow.includes("have you used")       || qLow.includes("have you worked with")||
    qLow.includes("do you have experience") || qLow.includes("are you good at") ||
    (qLow.startsWith("do you") && !qLow.includes("right?"))
  ) return false;

  // Only trigger if interviewer is ASSERTING a different value
  const isAssertion =
    qLow.includes("you said")         || qLow.includes("you mentioned")   ||
    qLow.includes("you told")         || qLow.includes("i thought you")   ||
    qLow.includes("so your")          || qLow.includes("your favorite is")||
    qLow.includes("your best is")     || qLow.includes("your strongest")  ||
    qLow.includes("so you're a")      || qLow.includes("so you are a")    ||
    (qLow.includes(", right") && !qLow.includes("do you")) ||
    (qLow.includes("right?") && !qLow.includes("do you"));

  if (!isAssertion) return false;

  for (const { key, aKeywords } of factPatterns) {
    const lockedValue = lockedFacts.get(key);
    if (!lockedValue) continue;
    for (const kw of aKeywords) {
      if (
        qLow.includes(kw.toLowerCase()) &&
        !lockedValue.toLowerCase().includes(kw.toLowerCase())
      ) return true;
    }
  }
  return false;
}

function buildLockedConstraintBlock(currentQuestion: string): string {
  if (lockedFacts.size === 0) return "";

  const qLow    = currentQuestion.toLowerCase();
  const lines:   string[] = [];
  const conflicts: string[] = [];

  lines.push("LOCKED FACTS FROM THIS SESSION  -  DO NOT CHANGE UNDER ANY CIRCUMSTANCES:");

  for (const { key, aKeywords } of factPatterns) {
    const lockedValue = lockedFacts.get(key);
    if (!lockedValue) continue;

    const label = ({
      best_language:      "Best/favorite language",
      years_experience:   "Years of experience",
      current_employer:   "Current employer",
      salary_expectation: "Salary expectation",
      best_strength:      "Top strength",
      education:          "Education",
      relocation:         "Relocation",
      visa_status:        "Visa/work auth",
      start_date:         "Start date",
    } as Record<string, string>)[key] ?? key;

    const shortVal = lockedValue.split("(")[0].trim();
    lines.push(`  [${label}]: ${shortVal}`);

    for (const kw of aKeywords) {
      if (
        qLow.includes(kw.toLowerCase()) &&
        !lockedValue.toLowerCase().includes(kw.toLowerCase())
      ) {
        conflicts.push(
          `  CONFLICT: Interviewer said '${kw}' but your locked answer is '${shortVal}'. ` +
          `Hold your ground: "Actually, I said ${shortVal} earlier."`
        );
        break;
      }
    }
  }

  if (conflicts.length > 0) {
    lines.push("");
    lines.push("  INTERVIEWER IS PUSHING A DIFFERENT ANSWER  -  DO NOT AGREE:");
    lines.push(...conflicts);
  }

  return lines.join("\n") + "\n\n";
}

// ═══════════════════════════════════════════════════════════════
// GREETING / SMALL TALK DETECTION
// ═══════════════════════════════════════════════════════════════
export function isGreeting(q: string): boolean {
  const t = q.trim().toLowerCase().replace(/[.,!?]+$/, "");
  return [
    "hi", "hello", "hey", "hi there", "good morning",
    "good afternoon", "good evening", "greetings", "hey there",
  ].includes(t);
}

export function isSmallTalk(q: string): boolean {
  const t         = q.toLowerCase();
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  // Only fire if question is SHORT (≤8 words)  -  not when greeting is embedded in a real question
  return (
    wordCount <= 8 &&
    (
      t.includes("how are you")       || t.includes("how's it going") ||
      t.includes("how you doing")     || t.includes("how have you been") ||
      t.includes("nice to meet")      || t.includes("thanks for coming") ||
      t.includes("pleasure to meet")
    )
  );
}

export function isGreetingPlusSmallTalk(q: string): boolean {
  const t = q.toLowerCase();
  // Only match if the question is primarily a greeting + small talk (no real question after)
  return (
    /^(hi|hello|hey)[\s,]+.*(how are you|how's it going|how you doing)/i.test(t) &&
    q.trim().split(/\s+/).length <= 10
  );
}

export function isNoisyGreeting(q: string): boolean {
  const t     = q.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  return words.length <= 4 && /\bhi\b|\bhello\b|\bhey\b/i.test(t);
}

export function isCompanyPitch(q: string): boolean {
  const wordCount = q.split(/\s+/).filter(Boolean).length;
  return (
    wordCount > 80 ||
    /(about|regarding) (the company|our company|this company|us|our organization)/i.test(q) ||
    /day to day|daily (duties|responsibilities)|what (you|you'll) (do|be doing)/i.test(q)
  );
}

export function getGreetingResponse(): string {
  return "Hey, great to be here  -  really looking forward to this conversation!";
}

export function getSmallTalkResponse(): string {
  return "Doing really well, thanks! Excited to be here and learn more about the role.";
}

// ═══════════════════════════════════════════════════════════════
// QUESTION TYPE DETECTION
// ═══════════════════════════════════════════════════════════════
type QuestionType =
  | "yesno"
  | "intro"
  | "technical"
  | "behavioral"
  | "situational"
  | "weakness"
  | "whyrole"
  | "salary"
  | "availability"
  | "followup"
  | "preference"
  | "general";

export function detectType(q: string): QuestionType {
  const t = q.toLowerCase().trim();

  // Follow-up
  if (
    t.includes("tell me more")   || t.includes("can you elaborate") ||
    t.includes("expand on that") || t.includes("go deeper")         ||
    t.includes("elaborate on")   || t.includes("go on")             ||
    t.includes("continue")
  ) return "followup";

  // Yes/No
  if (
    /^(are you|do you|can you|will you|have you|is your|would you|did you|are u|r u)/.test(t)
  ) return "yesno";

  if (
    t.includes("stem opt")         || t.includes("work authorization") ||
    t.includes("sponsorship")      || t.includes("relocat")            ||
    t.includes("visa")             || t.includes("authorized to work") ||
    t.includes("willing to")       || t.includes("background check")   ||
    t.includes("drug test")        || t.includes("citizen")            ||
    t.includes("green card")       || t.includes("overtime")           ||
    t.includes("hybrid")           || t.includes("on-site")            ||
    t.includes("onsite")
  ) return "yesno";

  // Salary
  if (
    t.includes("salary")          || t.includes("compensation")   ||
    t.includes("pay expectation") || t.includes("how much")       ||
    t.includes("package")         || t.includes("ctc")
  ) return "salary";

  // Availability
  if (
    t.includes("start date")      || t.includes("when can you start") ||
    t.includes("notice period")   || t.includes("available to join")  ||
    t.includes("earliest start")  || t.includes("join us")
  ) return "availability";

  // Intro
  if (
    t.includes("tell me about yourself") || t.includes("walk me through") ||
    t.includes("introduce yourself")     || t.includes("tell us about you") ||
    (t.includes("background") && t.includes("yourself"))
  ) return "intro";

  // Behavioral
  if (
    t.includes("tell me a time")         || t.includes("tell me about a time") ||
    t.includes("give me an example")     || t.includes("describe a situation")  ||
    t.includes("walk me through a time") || t.includes("share an example")      ||
    t.includes("have you ever faced")    || t.includes("when did you")
  ) return "behavioral";

  // Weakness
  if (
    t.includes("weakness")              || t.includes("biggest failure")     ||
    t.includes("made a mistake")        || t.includes("area of improvement") ||
    t.includes("constructive feedback") || t.includes("weaknesses")
  ) return "weakness";

  // Why role
  if (
    (t.includes("why") && (
      t.includes("role")     || t.includes("company") ||
      t.includes("this job") || t.includes("us")      ||
      t.includes("here")     || t.includes("position")
    )) ||
    t.includes("what interest you")  || t.includes("what attracted")  ||
    t.includes("what excites you")   || t.includes("what motivates")  ||
    t.includes("why should we hire") || t.includes("strengths")       ||
    t.includes("what makes you")
  ) return "whyrole";

  // Situational
  if (
    t.includes("what would you do")  || t.includes("how would you handle") ||
    t.includes("if you were")        || t.includes("hypothetically")       ||
    t.includes("imagine you")        || t.includes("scenario where")
  ) return "situational";

  // Preference  -  MUST come before Technical
  if (
    t.includes("favorite")       || t.includes("favourite")      ||
    t.includes("preferred")      || t.includes("prefer")         ||
    t.includes("best language")  || t.includes("strongest language") ||
    t.includes("best at")        || t.includes("strongest in")   ||
    t.includes("what language")  || t.includes("which language")  ||
    t.includes("go-to language") || t.includes("language you")   ||
    t.includes("you like most")  || t.includes("you enjoy most") ||
    t.includes("what tool")      || t.includes("which tool")     ||
    t.includes("which framework")|| t.includes("what framework") ||
    t.includes("which database") || t.includes("which cloud")
  ) return "preference";

  // Technical
  if (
    t.includes("what is")              || t.includes("explain")               ||
    t.includes("how does")             || t.includes("describe how")           ||
    t.includes("what are")             || t.includes("difference between")     ||
    t.includes("how do you")           || t.includes("what do you know about") ||
    t.includes("define")               || t.includes("compare")                ||
    t.includes("architecture")         || t.includes("implement")
  ) return "technical";

  return "general";
}

// ═══════════════════════════════════════════════════════════════
// DRILL-DOWN DETECTION
// ═══════════════════════════════════════════════════════════════
export function isDrillDown(q: string, history: Turn[]): boolean {
  if (history.length === 0) return false;
  const t = q.toLowerCase().trim();

  // ── NEVER treat definition/explanation questions as drill-downs ──
  // "What is X?", "What are X?", "How does X work?", "Explain X", "Define X"
  // These are technical questions that need full answers, not history lookups.
  if (/^what (is|are|does|did|was|were)\b/.test(t))   return false;
  if (/^how (does|do|did|is|are|was|were)\b/.test(t)) return false;
  if (/^(explain|describe|define|tell me about|talk about)\b/.test(t)) return false;

  if (/^how (many|long|much|often|far|soon|old)/.test(t))           return true;
  if (/^which (version|one|tool|language|framework|company|team|project|platform|stack|cloud|database|year|month|role|position)/.test(t)) return true;
  if (/^what (version|year|company|team|tool|language|framework|platform|size|number|percentage|metric|result|outcome|role|project)/.test(t)) return true;
  if (/^who (said|was|were|is|told|mentioned|managed|led)/.test(t))  return true;
  if (/^when (was|did|were|is|did you)/.test(t))                     return true;
  if (/^where (was|did|were|is)/.test(t))                            return true;
  if (/^(you said|you mentioned|you told|you talked about|u said|you just said)/.test(t)) return true;
  if (/^(what did you mean|what do you mean by|can you clarify|clarify that)/.test(t))    return true;
  if (/(years? of|year experience|how many years|years? experience)/.test(t))             return true;

  // Short ≤6 words with reference word  -  but NOT if it looks like a definition question
  const words = t.split(" ").filter(Boolean);
  if (words.length <= 6) {
    // Skip if it's clearly asking for a definition/explanation
    if (/\b(is|are|does|mean|work|difference|between|explain|define)\b/.test(t)) return false;
    const refWords = [
      "which","who","when","where",
      "years","version","size","team","number",
      "much","many","long","old","big","use","used",
    ];
    if (refWords.some(w => t.includes(w))) return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════
// FORMAT REMINDER
// ═══════════════════════════════════════════════════════════════
export function buildFormatReminder(
  type:      QuestionType,
  q:         string,
  drillDown: boolean,
  hasResume: boolean = true
): string {
  // Conflict push: interviewer asserting a different value than locked  -  always MICRO
  if (hasLockedConflict(q))
    return "[FORMAT: MICRO  -  1-2 sentences MAX. No bullets. Politely correct the interviewer and restate your locked answer. EXAMPLE: 'Actually I said Python earlier  -  that's still my answer.' Do NOT explain or justify with bullets.]";

  if (drillDown)
    return "[FORMAT: MICRO  -  1-2 sentences ONLY. NO bullets. Pull the EXACT fact from history. Answer ONLY that specific thing. Do NOT re-explain. Do NOT add background.]";

  const t = q.toLowerCase();

  switch (type) {
    case "preference":
      return "[FORMAT: MICRO  -  1 sentence ONLY. Say the name + one short reason. CORRECT: 'Python  -  that's what I've worked with most.' WRONG: bullets, theory, history, long explanation. Check locked facts first  -  if already answered, use that same answer.]";

    case "yesno":
      if (t.includes("stem opt") || t.includes("visa") || t.includes("sponsorship") || t.includes("authorized"))
        return "[FORMAT: MICRO  -  2-3 sentences. NO bullets. Confirm work authorization status + intent. Confident and factual.]";
      if (t.includes("relocat"))
        return "[FORMAT: MICRO  -  1-2 sentences. NO bullets. Yes/No + openness to location.]";
      if (t.includes("remote") || t.includes("hybrid") || t.includes("on-site") || t.includes("onsite"))
        return "[FORMAT: MICRO  -  1-2 sentences. NO bullets. State flexibility clearly.]";
      if (t.includes("travel"))
        return "[FORMAT: MICRO  -  1-2 sentences. NO bullets. Yes + comfortable with stated %.]";
      if (t.includes("background") || t.includes("drug"))
        return "[FORMAT: MICRO  -  1 sentence. NO bullets. Confident yes.]";
      return "[FORMAT: MICRO  -  1-3 sentences. NO bullets. Direct answer + one supporting fact. Confident.]";

    case "intro":
      return "[FORMAT: FULL  -  5-6 bullets using • only. NEVER start with education or oldest job. Structure: WHO YOU ARE NOW (current role) → KEY WIN (specific metric) → previous role briefly → education in 1 sentence → side projects → why THIS company specifically. Each bullet 1-2 sentences. No filler opener.]";

    case "technical":
      return hasResume
        ? "[FORMAT: FULL  -  4-5 bullets using • only. Bullet 1 = clean 1-sentence definition. Bullet 2 = real example from your most recent experience + outcome. Bullet 3 = supporting example from previous role. Practitioner tone, not textbook.]"
        : "[FORMAT: FULL  -  4-5 bullets using • only. Bullet 1 = clean 1-sentence definition. Bullet 2 = key technical concept or use case. Bullet 3 = real-world application or benefit. Bullet 4 = practical insight. Pure technical explanation  -  do NOT invent personal work experience or fabricate company/project names.]";

    case "behavioral":
      return "[FORMAT: FULL  -  4-5 bullets using • only. STAR: Situation (brief) → Action (detailed) → Result (specific numbers). Lead with most recent experience. Company, tool, team size, outcome.]";

    case "weakness":
      return "[FORMAT: FULL  -  3-4 bullets using • only. Real weakness → concrete steps taken → evidence of improvement. Not a fake strength. Self-aware.]";

    case "whyrole":
      return "[FORMAT: FULL  -  3-4 bullets using • only. Specific to THIS company's tech + mission. Reference something specific about the company. No generic answers.]";

    case "salary":
      return "[FORMAT: MICRO  -  2-3 sentences. NO bullets. Give a range. Total comp flexible. Anchored to market rate for this role/location.]";

    case "availability":
      return "[FORMAT: MICRO  -  1-2 sentences. NO bullets. Notice period or availability date directly and confidently.]";

    case "situational":
      return "[FORMAT: FULL  -  3-4 bullets using • only. Anchor in real past situation first, then apply to scenario. Grounded, not theoretical.]";

    case "followup":
      return "[FORMAT: MEDIUM  -  2-3 bullets using • only. NEW detail ONLY. Never repeat what was already said. Go deeper  -  new layer, new number, new angle.]";

    default:
      return "[FORMAT: FULL  -  4-5 bullets using • only. Lead with most recent experience. Specific tools, numbers, outcomes. No filler opener. Sound human and spoken.]";
  }
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT  -  resume-conditional, no hardcoded company names
// ═══════════════════════════════════════════════════════════════
export function buildSystemPrompt(resume: string): string {
  const hasResume = resume && resume.trim().length > 20;

  const resumeBlock = hasResume
    ? `════════════════════════════════════════════════════
YOUR RESUME  -  USE ONLY THESE REAL FACTS. NEVER INVENT:
════════════════════════════════════════════════════
${resume}
`
    : `════════════════════════════════════════════════════
NO RESUME PROVIDED  -  GENERIC PROFESSIONAL MODE
════════════════════════════════════════════════════
Answer as a generic software engineering professional.
CRITICAL RULES FOR NO-RESUME MODE:
- Do NOT invent or use any specific employer names, company names, or university names.
- Use placeholders like "a mid-size tech company" or "my previous employer".
- For salary: give a range like $100k-$130k base, open to discussion.
- For visa: say you are authorized to work, can discuss details.
- For education: say "Computer Science background"  -  no school name.
- NEVER invent specific project names, teams, or metrics.
- For pure technical/definition questions ("What is Java?", "Explain REST", "How does TCP work?"):
  Give a clean technical explanation ONLY. NO fabricated personal experience. NO "at my company..." stories.
`;

  const rule3 = hasResume
    ? `════════════════════════════════════════════════════
RULE #3  -  CURRENT JOB ALWAYS FIRST
════════════════════════════════════════════════════
ALWAYS mention your most recent role from your resume first.
NEVER lead with an older role or education.
CORRECT: "At [current company] I currently... and before that at [previous company] I..."
WRONG:   Leading with education or your oldest job.
`
    : `════════════════════════════════════════════════════
RULE #3  -  CURRENT JOB ALWAYS FIRST
════════════════════════════════════════════════════
Lead with your current/most recent role.
Do NOT invent a specific company name  -  say "my current company" or "the company I'm at now."
CORRECT: "At the company I'm at now, I work on..."
WRONG: Inventing "At Google I..." or "At Microsoft I..."
`;

  const rule4 = hasResume
    ? `════════════════════════════════════════════════════
RULE #4  -  TELL ME ABOUT YOURSELF  -  EXACT STRUCTURE
════════════════════════════════════════════════════
NEVER start with "I studied" or "I graduated"  -  WEAK.
START with WHO YOU ARE RIGHT NOW.

  • WHO YOU ARE NOW: current role + what you do (from resume)
  • KEY WIN: one specific achievement with metric from resume
  • PREVIOUS ROLE: briefly (years, what you built, tools used)
  • EDUCATION: 1 sentence only
  • SIDE PROJECTS: if any
  • WHY THIS COMPANY: specific tech/challenge at this company
`
    : `════════════════════════════════════════════════════
RULE #4  -  TELL ME ABOUT YOURSELF  -  EXACT STRUCTURE
════════════════════════════════════════════════════
NEVER start with "I studied"  -  WEAK. START with who you are now.

  • WHO YOU ARE NOW: generic current role (no company name invented)
  • KEY WIN: generic metric (e.g. "reduced build time by 30%")  -  no company name
  • PREVIOUS EXPERIENCE: briefly (years, technologies  -  no company name)
  • EDUCATION: "Computer Science background"  -  no school name invented
  • WHY THIS OPPORTUNITY: what genuinely interests you
`;

  const rule8 = hasResume
    ? `════════════════════════════════════════════════════
RULE #8  -  BE SPECIFIC ALWAYS
════════════════════════════════════════════════════
Name company (from resume). Name tool. Give number. State outcome.
BAD:  "I worked on cloud infra and improved things."
GOOD: "At [company from resume]  -  Terraform on AWS, cut setup time by 40%."
`
    : `════════════════════════════════════════════════════
RULE #8  -  BE SPECIFIC (within what you know)
════════════════════════════════════════════════════
Give realistic metrics but do NOT name specific companies or schools.
BAD:  "At Google / Renasant Bank / Microsoft I..."
GOOD: "At my previous company, using Terraform, we cut setup time by 40%."
`;

  return `
You ARE the candidate in a live job interview. You are a real professional, not an AI.
${hasResume ? "The resume below is YOUR life  -  YOUR jobs, YOUR wins, YOUR skills, YOUR growth." : "Answer as a sharp, experienced software engineering professional."}
Always speak in first person. Be sharp, confident, and completely human.
You are mid-conversation with a hiring manager right now.

${resumeBlock}
════════════════════════════════════════════════════
RULE #1  -  MOST CRITICAL: READ HISTORY, ANSWER EXACTLY WHAT WAS ASKED
════════════════════════════════════════════════════

BEFORE every answer, do this check:
  STEP 1: Read the current question.
  STEP 2: Read the full conversation history.
  STEP 3: Is this question referencing something ALREADY SAID in a previous answer?
  STEP 4: Pick the mode:

  ╔══════════════════════════════════════════════════════╗
  ║ Conflict push (interviewer asserting wrong value)   ║
  ║ → MICRO: correct politely in 1-2 sentences.        ║
  ╠══════════════════════════════════════════════════════╣
  ║ Referencing previous answer → MICRO MODE            ║
  ║ 1-2 sentences. Direct fact only. NO bullets.        ║
  ╠══════════════════════════════════════════════════════╣
  ║ Going deeper on one specific topic → MEDIUM MODE    ║
  ║ 2-3 bullets. New detail only. Never repeat.         ║
  ╠══════════════════════════════════════════════════════╣
  ║ Brand new topic → FULL MODE                         ║
  ║ 4-5 bullets. Real examples. Numbers. Outcomes.      ║
  ╚══════════════════════════════════════════════════════╝

REAL EXAMPLES:
  History had: "...3.5 years of experience..."
  Q: "How many years?" → CORRECT: "3.5 years total." (MICRO, no bullets)
  WRONG: Re-explaining full career history.

  History had: "...reduced setup time by 40%..."
  Q: "How did you achieve that 40%?" → CORRECT: 2-3 bullets going DEEPER.
  WRONG: Re-telling the full story from scratch.

  You said Python. Interviewer says "so Java is your best, right?"
  → CORRECT: "Actually I said Python earlier  -  that's still my answer." (MICRO)
  → WRONG: Agreeing with Java or giving 5 bullets of explanation.

════════════════════════════════════════════════════
RULE #2  -  GREETING / SMALL TALK / NOISE
════════════════════════════════════════════════════
If the question is ONLY a greeting (hi, hello, hey, good morning):
  → Reply with ONE sentence: "Hey, great to be here!"
  → NO bullets. NO career info. NO background.

If interviewer says "how are you" (short question, no real ask after):
  → ONE sentence: "Doing well, thanks  -  excited to be here!"

If background noise or short random words (≤4 words, no clear question):
  → "Sorry, could you repeat that?"

${rule3}
${rule4}
════════════════════════════════════════════════════
RULE #5  -  THREE ANSWER FORMATS
════════════════════════════════════════════════════
MICRO  → 1-2 sentences, NO bullets.
         For: drill-downs, yes/no, preferences, greetings, conflict corrections.

MEDIUM → 2-3 bullets using •.
         For: follow-ups going deeper on one topic.

FULL   → 4-5 bullets using •.
         For: all new topics not yet in conversation.
         Format:
           • [Direct answer  -  hit it immediately, no wind-up]
           • [Real example  -  tool + metric + outcome]
           • [Second example or different angle]
           • [Insight or lesson from real experience]
           • [Tie to this role  -  only if genuinely strong]

Each bullet = 1-2 sentences MAX. Short. Punchy. Spoken.
Leave ONE blank line between each bullet.
Use ONLY • for bullets. NEVER - or * or numbers.

════════════════════════════════════════════════════
RULE #6  -  BANNED OPENERS
════════════════════════════════════════════════════
NEVER start with:
"Great question!" / "Good question!" / "Absolutely!" / "Of course!"
"Sure!" / "Definitely!" / "That's a great point!" / "Certainly!"
"Happy to answer!" / "That's interesting!"

START directly with the answer or:
"Yeah so..." / "Honestly..." / "So..." / Direct fact.

════════════════════════════════════════════════════
RULE #7  -  SOUND HUMAN
════════════════════════════════════════════════════
Always use contractions: I'm, I've, didn't, wasn't, it's, that's, we'd.
Natural openers: "Yeah so..." / "Honestly..." / "What I found was..."
BANNED words: robust, comprehensive, spearheaded, streamlined,
leverage, synergy, utilize, delve, passionate about, results-driven,
innovative, cutting-edge, best-in-class, dynamic, proactive, holistic,
impactful, scalable solution, paradigm, circle back, deep dive, bandwidth.
BANNED phrases: "I am proficient in" / "I possess" / "I am responsible for"
Say instead: "I work with" / "I have" / "I handle"

${rule8}
════════════════════════════════════════════════════
RULE #9  -  SESSION MEMORY (most important)
════════════════════════════════════════════════════
You have perfect recall of everything said in this interview.
Every prior Q&A is something YOU said. Those facts are LOCKED.
If asked the same topic again → give the SAME answer, naturally rephrased.
If interviewer pushes a different value → politely hold your answer.
Example: You said Python. Interviewer says "so your best is Java."
CORRECT: "Actually I said Python earlier  -  still my answer."
WRONG: Agreeing with Java.

════════════════════════════════════════════════════
RULE #10  -  NATURAL MEMORY CALLBACKS
════════════════════════════════════════════════════
When referencing a prior answer:
"Yeah, like I mentioned..." / "Going back to what I said..."
"That ties into what I described earlier..." / "Building on that..."
NEVER say "As I mentioned in my previous answer"  -  robotic.

════════════════════════════════════════════════════
PERMANENTLY BANNED
════════════════════════════════════════════════════
- Any filler opener
- Starting intro with education or oldest job
- ${hasResume ? "Inventing experience not in resume" : "Inventing specific employer names, school names, or project names"}
- Re-explaining when asked a drill-down
- Agreeing with interviewer-suggested value that contradicts your prior answer
- Repeating same example already used this session
- Paragraphs when bullets are required
- Bullets when MICRO mode is required
`.trim();
}

// ═══════════════════════════════════════════════════════════════
// BUILD MESSAGES  -  main entry point
// ═══════════════════════════════════════════════════════════════
export function buildMessages(
  resume:          string,
  currentQuestion: string,
  history:         Turn[]
): Array<{ role: string; content: string }> {

  const q         = currentQuestion.trim();
  const type      = detectType(q);
  const drillDown = isDrillDown(q, history);
  const hasResume = resume.trim().length > 20;
  const reminder  = buildFormatReminder(type, q, drillDown, hasResume);

  const messages: Array<{ role: string; content: string }> = [];

  // 1. System prompt (resume-conditional)
  messages.push({
    role:    "system",
    content: buildSystemPrompt(resume),
  });

  // 2. Full conversation history = per-session memory
  for (const turn of history) {
    messages.push({
      role:    turn.role === "interviewer" ? "user" : "assistant",
      content: turn.text,
    });
  }

  // 3. Build user message: lock block + format reminder + hints + question
  const lockBlock = buildLockedConstraintBlock(q);

  const lastAnswer = history
    .filter(t => t.role === "candidate")
    .slice(-1)[0]?.text ?? "";

  const historyHint = lastAnswer
    ? `[YOUR LAST ANSWER WAS:\n${lastAnswer.slice(0, 400)}${lastAnswer.length > 400 ? "..." : ""}\nCHECK: is the current question a drill-down or conflict push on that answer? If YES → MICRO (1-2 sentences). If NO → use format reminder below.]\n\n`
    : "";

  const greetingHint =
    isGreeting(q) || isNoisyGreeting(q)
      ? "[THIS IS A GREETING. Reply with ONE sentence only. No career info. No bullets. Just warm: 'Hey, great to be here!']\n\n"
      : isSmallTalk(q) || isGreetingPlusSmallTalk(q)
      ? "[THIS IS SMALL TALK. Reply with ONE sentence only. Professional and warm. No career info.]\n\n"
      : isCompanyPitch(q)
      ? "[INTERVIEWER GAVE A LONG INTRO. Acknowledge in 10-15 words max. Show interest. Do NOT explain your background yet.]\n\n"
      : "";

  messages.push({
    role:    "user",
    content: `${lockBlock}${greetingHint}${historyHint}QUESTION: ${q}\n\n${reminder}`,
  });

  return messages;
}
