export type InterviewQuestion = {
  id: string;
  company: "General" | "Amazon" | "Google" | "Meta" | "Microsoft" | "Apple";
  role: "Software Engineering" | "Product" | "Data" | "Sales" | "Leadership";
  category: "Behavioral" | "Coding" | "System Design" | "Role Knowledge";
  difficulty: "Foundation" | "Intermediate" | "Advanced";
  question: string;
  focus: string;
};

// Representative practice prompts assembled by Replysis. Company filters mean
// "useful for preparing for this interview style"; these are not leaked,
// guaranteed, or officially supplied questions from those companies.
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  { id:"g-se-1", company:"General", role:"Software Engineering", category:"Behavioral", difficulty:"Foundation", question:"Tell me about yourself and why this role is the right next step.", focus:"A focused 60–90 second career narrative" },
  { id:"g-se-2", company:"General", role:"Software Engineering", category:"Coding", difficulty:"Foundation", question:"Given a string, return the first non-repeating character and explain the complexity.", focus:"Hash maps, edge cases, complexity" },
  { id:"g-se-3", company:"General", role:"Software Engineering", category:"Coding", difficulty:"Intermediate", question:"Design an LRU cache with O(1) get and put operations.", focus:"Data structure composition and invariants" },
  { id:"g-se-4", company:"General", role:"Software Engineering", category:"System Design", difficulty:"Advanced", question:"Design a notification service for email, SMS, and push at large scale.", focus:"Queues, preferences, retries, idempotency" },
  { id:"g-se-5", company:"General", role:"Software Engineering", category:"Role Knowledge", difficulty:"Intermediate", question:"How do you investigate a production latency regression when no deployment is obvious?", focus:"Observability and hypothesis-driven debugging" },
  { id:"g-pm-1", company:"General", role:"Product", category:"Behavioral", difficulty:"Foundation", question:"Tell me about a product decision you changed after learning from customers.", focus:"Judgment, learning, and measurable impact" },
  { id:"g-pm-2", company:"General", role:"Product", category:"Role Knowledge", difficulty:"Intermediate", question:"How would you prioritize a roadmap when sales, support, and engineering disagree?", focus:"Framework, evidence, and stakeholder alignment" },
  { id:"g-pm-3", company:"General", role:"Product", category:"System Design", difficulty:"Advanced", question:"Design the product and success metrics for a collaborative document approval workflow.", focus:"User journeys, states, permissions, metrics" },
  { id:"g-da-1", company:"General", role:"Data", category:"Role Knowledge", difficulty:"Foundation", question:"Explain the difference between correlation and causation to a non-technical stakeholder.", focus:"Clarity and decision risk" },
  { id:"g-da-2", company:"General", role:"Data", category:"Coding", difficulty:"Intermediate", question:"Write SQL to calculate seven-day retention by signup cohort.", focus:"Cohorts, joins, date logic" },
  { id:"g-da-3", company:"General", role:"Data", category:"System Design", difficulty:"Advanced", question:"Design an experimentation platform that supports guardrail metrics and delayed outcomes.", focus:"Assignment, metrics, bias, governance" },
  { id:"g-sa-1", company:"General", role:"Sales", category:"Behavioral", difficulty:"Foundation", question:"Walk me through a deal you lost and what you changed afterward.", focus:"Ownership, diagnosis, and adaptation" },
  { id:"g-sa-2", company:"General", role:"Sales", category:"Role Knowledge", difficulty:"Intermediate", question:"How do you qualify an opportunity without making the buyer feel interrogated?", focus:"Discovery, value, and mutual fit" },
  { id:"g-le-1", company:"General", role:"Leadership", category:"Behavioral", difficulty:"Advanced", question:"Tell me about a high-performing employee whose growth required difficult feedback.", focus:"Candor, coaching, and outcome" },
  { id:"g-le-2", company:"General", role:"Leadership", category:"System Design", difficulty:"Advanced", question:"How would you redesign an organization that repeatedly misses cross-team commitments?", focus:"Operating model, ownership, and feedback loops" },
  { id:"am-1", company:"Amazon", role:"Software Engineering", category:"Behavioral", difficulty:"Intermediate", question:"Tell me about a time you made an important decision with incomplete data.", focus:"Bias for action with reversible-risk thinking" },
  { id:"am-2", company:"Amazon", role:"Leadership", category:"Behavioral", difficulty:"Advanced", question:"Describe a time you disagreed with a decision, committed, and helped the team succeed.", focus:"Constructive dissent and commitment" },
  { id:"am-3", company:"Amazon", role:"Software Engineering", category:"System Design", difficulty:"Advanced", question:"Design a globally available order-status tracking service.", focus:"Event flow, consistency, regional failure" },
  { id:"am-4", company:"Amazon", role:"Product", category:"Role Knowledge", difficulty:"Intermediate", question:"A key customer metric drops 8% overnight. How do you investigate and communicate the response?", focus:"Customer obsession and structured diagnosis" },
  { id:"go-1", company:"Google", role:"Software Engineering", category:"Coding", difficulty:"Advanced", question:"Given a dependency graph, return a valid build order or explain why none exists.", focus:"Graph traversal and cycle detection" },
  { id:"go-2", company:"Google", role:"Software Engineering", category:"System Design", difficulty:"Advanced", question:"Design type-ahead search suggestions for hundreds of millions of users.", focus:"Ranking, latency, caching, freshness" },
  { id:"go-3", company:"Google", role:"Product", category:"Role Knowledge", difficulty:"Intermediate", question:"How would you measure whether a search-result explanation improves user trust?", focus:"Metrics, experiment design, side effects" },
  { id:"go-4", company:"Google", role:"Leadership", category:"Behavioral", difficulty:"Advanced", question:"Tell me about a technically correct idea that failed to gain adoption.", focus:"Influence, empathy, and iteration" },
  { id:"me-1", company:"Meta", role:"Software Engineering", category:"Coding", difficulty:"Intermediate", question:"Merge overlapping activity intervals and return the total active time.", focus:"Sorting, interval invariants, complexity" },
  { id:"me-2", company:"Meta", role:"Software Engineering", category:"System Design", difficulty:"Advanced", question:"Design a real-time feed ranking and delivery system.", focus:"Fan-out, ranking, freshness, abuse" },
  { id:"me-3", company:"Meta", role:"Product", category:"Role Knowledge", difficulty:"Advanced", question:"A feature grows engagement but also increases negative reports. What do you do next?", focus:"Metric trade-offs and integrity" },
  { id:"me-4", company:"Meta", role:"Data", category:"Role Knowledge", difficulty:"Intermediate", question:"How would you determine whether a social feature creates meaningful interaction rather than empty clicks?", focus:"North-star and quality metrics" },
  { id:"ms-1", company:"Microsoft", role:"Software Engineering", category:"System Design", difficulty:"Advanced", question:"Design a multi-tenant collaboration service with enterprise permissions and audit logs.", focus:"Identity, authorization, tenancy, auditability" },
  { id:"ms-2", company:"Microsoft", role:"Product", category:"Behavioral", difficulty:"Intermediate", question:"Tell me about a time customer accessibility needs changed your product plan.", focus:"Inclusive product judgment" },
  { id:"ms-3", company:"Microsoft", role:"Leadership", category:"Behavioral", difficulty:"Advanced", question:"Describe how you built alignment across teams with different incentives.", focus:"Clarity, listening, and shared outcomes" },
  { id:"ms-4", company:"Microsoft", role:"Sales", category:"Role Knowledge", difficulty:"Intermediate", question:"How would you position a platform migration when the customer fears vendor lock-in?", focus:"Risk, trust, and phased value" },
  { id:"ap-1", company:"Apple", role:"Software Engineering", category:"Role Knowledge", difficulty:"Intermediate", question:"How do you balance performance, battery life, privacy, and user experience in a client feature?", focus:"Systems trade-offs and product quality" },
  { id:"ap-2", company:"Apple", role:"Product", category:"Behavioral", difficulty:"Advanced", question:"Tell me about a detail most people overlooked that materially improved the product.", focus:"Craft, judgment, and customer impact" },
  { id:"ap-3", company:"Apple", role:"Data", category:"Role Knowledge", difficulty:"Advanced", question:"How would you evaluate an on-device model when privacy prevents centralized raw-data collection?", focus:"Privacy-preserving evaluation" },
  { id:"ap-4", company:"Apple", role:"Leadership", category:"Behavioral", difficulty:"Advanced", question:"Describe a time you protected product quality under intense schedule pressure.", focus:"Standards, trade-offs, and delivery" },
];
