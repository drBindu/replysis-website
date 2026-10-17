/**
 * Answer guidance for each practice question, written for the "How to answer" pages (owner, 2026-10-17).
 *
 * Each guide is specific to its question: what the interviewer is really testing, how a strong answer is built, and the
 * mistake that costs the most. The category frames (Behavioral, Coding, System Design, Role Knowledge) are in
 * CATEGORY_FRAMES and are shared on purpose: they are the method, the guide is the content. Nothing here is a leaked or
 * official company question; the bank says so, and so does every page.
 */
export type QuestionGuide = {
  /** What the interviewer is actually trying to find out, in one sentence. */
  testing: string;
  /** The beats of a strong answer, in order. */
  outline: string[];
  /** The one mistake that costs the most. */
  mistake: string;
};

export const CATEGORY_FRAMES: Record<string, { name: string; steps: string[] }> = {
  Behavioral: {
    name: "Situation, action, result",
    steps: [
      "Set the scene in two sentences: the team, the stakes, your role.",
      "Say what you did, in the first person. Name the decision you made and why.",
      "Give the result with a number if you have one, and one thing you would do differently.",
    ],
  },
  Coding: {
    name: "Clarify, plan, code, test",
    steps: [
      "Restate the problem and ask about inputs, size limits and edge cases before you write anything.",
      "Describe your approach and its complexity out loud, then check it makes sense with the interviewer.",
      "Write clean code in small steps, narrating as you go.",
      "Walk through a normal case and an edge case by hand, then say what you would test.",
    ],
  },
  "System Design": {
    name: "Requirements, design, trade-offs",
    steps: [
      "Pin down what the system must do, how many users, and what matters most (speed, cost, correctness).",
      "Sketch the main parts and how data moves between them, starting simple.",
      "Pick one or two parts to go deep on, and say what you gave up for each choice.",
      "Finish with how it fails and how you would know: monitoring, retries, limits.",
    ],
  },
  "Role Knowledge": {
    name: "Frame, evidence, recommendation",
    steps: [
      "Frame the problem: what is being decided and who is affected.",
      "Say what evidence you would gather first, and why that order.",
      "Give a clear recommendation and the risk you would watch.",
    ],
  },
};

export const QUESTION_GUIDES: Record<string, QuestionGuide> = {
  "g-se-1": {
    testing: "Whether you can sum up your career and the reason you want this role in a minute and a half, without wandering.",
    outline: [
      "Start with your current role and one result you are proud of.",
      "Take one step back: the experience that led you here, in a sentence or two.",
      "Say why this role is the natural next step, using something specific about the job.",
      "Stop at about ninety seconds and let them ask for more.",
    ],
    mistake: "Reading your resume aloud in order. The interviewer has it. Tell the story that explains why you are in this room.",
  },
  "g-se-2": {
    testing: "Whether you reach for the right structure and handle the edge cases without being prompted.",
    outline: [
      "Ask about the character set and what to return when every character repeats.",
      "Count each character once with a hash map, then scan the string in order for the first count of one.",
      "State the cost: two passes, O(n) time, and O(k) space where k is the number of distinct characters.",
      "Test an empty string, a string with no unique character, and one where the answer is the last character.",
    ],
    mistake: "Comparing every pair of characters. It works, but it is O(n squared) and signals you did not think about a map.",
  },
  "g-se-3": {
    testing: "Whether you can combine two structures so that two operations both stay constant time.",
    outline: [
      "Say why one structure is not enough: a hash map finds fast but cannot order, a list orders but cannot find.",
      "Combine a hash map to nodes with a doubly linked list ordered by recency.",
      "On get, move the node to the front. On put, insert at the front and evict the tail when full.",
      "Name the invariant: the map and the list always hold exactly the same keys.",
    ],
    mistake: "Using a singly linked list. Removing a node from the middle then needs a scan, and the O(1) promise breaks.",
  },
  "g-se-4": {
    testing: "Whether you design for retries, duplicates and user preferences, not just the happy path.",
    outline: [
      "Clarify scale, delivery guarantees and whether messages can be delayed.",
      "Accept requests into a queue, with a worker pool per channel (email, SMS, push) so a slow provider does not block the others.",
      "Check user preferences and rate limits before sending.",
      "Make every send idempotent with a message ID so a retry never delivers twice, and send failures to a dead letter queue.",
    ],
    mistake: "Calling the providers directly from the request. One slow provider then slows every caller.",
  },
  "g-se-5": {
    testing: "Whether you debug with a method instead of guessing.",
    outline: [
      "Define the regression: which endpoint, which percentile, since when, for whom.",
      "List what else changed besides code: traffic, data size, a dependency, a config, a cloud event.",
      "Narrow down with traces and metrics: where does the extra time go, and does it match the start time?",
      "Form one hypothesis at a time, test it, and put the fix behind a way to roll back.",
    ],
    mistake: "Starting from a favourite cause. Say what you would measure first, and let the data point to the cause.",
  },
  "g-pm-1": {
    testing: "Whether you let evidence change your mind and can show what changed.",
    outline: [
      "Describe the original decision and why it looked right at the time.",
      "Say exactly what you heard from customers and how many you heard it from.",
      "Explain what you changed and what you gave up by changing it.",
      "Give the result, and what it taught you about how you decide.",
    ],
    mistake: "Choosing a story where you were right all along. They are listening for how you handle being wrong.",
  },
  "g-pm-2": {
    testing: "Whether you can prioritise with a method and keep three groups on side.",
    outline: [
      "Agree on the goal first: which outcome the roadmap serves this quarter.",
      "Score items by impact, effort and confidence, using customer and revenue data from each group.",
      "Show the trade-off openly, including what is not being done and why.",
      "Commit to a decision, share the reasoning with all three groups, and set a date to revisit it.",
    ],
    mistake: "Saying you would find a compromise everyone likes. Prioritising means someone does not get what they asked for.",
  },
  "g-pm-3": {
    testing: "Whether you design from the user's journey and define how you would know it works.",
    outline: [
      "Name the users: the person who submits, the approver, and anyone who only needs to see the result.",
      "Walk the states: draft, submitted, in review, changes requested, approved, rejected.",
      "Cover permissions and the cases that go wrong: absent approver, edits after approval.",
      "Define success: time to approval, share approved on first review, and a guardrail such as rework rate.",
    ],
    mistake: "Listing features without states. A workflow is defined by what can happen next from each state.",
  },
  "g-da-1": {
    testing: "Whether you can make a subtle idea clear to someone who makes decisions with it.",
    outline: [
      "Start with a plain example: ice cream sales and drownings both rise in summer.",
      "Say what the mistake costs: acting on a link that is not a cause wastes money or backfires.",
      "Explain how you would test a cause: an experiment, or a design that controls for the other factor.",
      "End with what to do tomorrow: treat it as a lead to test, not a conclusion.",
    ],
    mistake: "Using the words confounder and regression. The point of the question is to avoid them.",
  },
  "g-da-2": {
    testing: "Whether you can handle cohorts and date logic in SQL without errors.",
    outline: [
      "Define retention out loud: of the users who signed up on a day, the share who return exactly seven days later.",
      "Build a table of each user's signup date, then join to their activity dates.",
      "Count distinct users active on signup date plus seven, grouped by signup date, and divide by the cohort size.",
      "Check the edge cases: cohorts less than seven days old should not show a rate, and users with several events count once.",
    ],
    mistake: "Dividing by all users instead of each cohort's size. The number looks fine and is wrong.",
  },
  "g-da-3": {
    testing: "Whether you understand that experiments fail in the design, not only in the maths.",
    outline: [
      "Start with what the platform must support: assignment, metrics, analysis and a record of decisions.",
      "Assign users randomly and consistently, with the same user always in the same group.",
      "Separate the metrics: one primary, a few guardrails that must not get worse, and some that arrive late.",
      "Handle delayed outcomes by waiting before reading them, and guard against peeking, bias and overlapping experiments.",
    ],
    mistake: "Stopping at the statistics. Without guardrails and a record of decisions, teams ship harm and cannot explain why.",
  },
  "g-sa-1": {
    testing: "Whether you take ownership and learn, instead of blaming the buyer.",
    outline: [
      "Describe the deal briefly: who, how big, how far it got.",
      "Say honestly why you lost it, naming what you could have done differently.",
      "Explain how you found out: a debrief with the buyer, or your own review of the calls.",
      "Show the change you made afterwards and a later deal where it worked.",
    ],
    mistake: "Blaming price or the competitor. It tells them you did not learn anything.",
  },
  "g-sa-2": {
    testing: "Whether discovery feels like help to the buyer, not an interrogation.",
    outline: [
      "Open with the buyer's goal, not your checklist: what are they trying to achieve?",
      "Ask a few open questions that matter and follow what they say instead of reading down a list.",
      "Share a little as you learn, so the buyer gets value from the conversation.",
      "Confirm fit both ways: budget, timing, who decides, and whether you can really help.",
    ],
    mistake: "Asking every qualifying question in order. The buyer feels processed, and gives short answers.",
  },
  "g-le-1": {
    testing: "Whether you can give hard feedback with care and see it change something.",
    outline: [
      "Explain why feedback was hard: the person was already strong, so the gap was easy to excuse.",
      "Describe how you prepared and delivered it: specific examples, private, and ready to listen.",
      "Say how they reacted and what you agreed together.",
      "Give the outcome over the following months, for them and for the team.",
    ],
    mistake: "Skipping the difficulty. If the feedback was easy, it is not the story they asked for.",
  },
  "g-le-2": {
    testing: "Whether you diagnose a systems problem before you reorganise people.",
    outline: [
      "Find out why commitments are missed: unclear ownership, hidden dependencies, shifting priorities or capacity.",
      "Look at the pattern in data: which teams, which kinds of commitment, how late.",
      "Change the operating model in small steps: one owner per commitment, visible dependencies, a regular cross-team review.",
      "Decide how you will know it worked, such as the share of commitments met on time.",
    ],
    mistake: "Proposing a new org chart as the first answer. Structure is the last tool, not the first.",
  },
  "am-1": {
    testing: "Whether you can act when you do not have everything, and limit the damage if you are wrong.",
    outline: [
      "Describe the decision and why waiting had a cost.",
      "Say what you knew, what you did not, and how you decided what was enough to go on.",
      "Explain how you made the choice easy to undo, or what you watched to catch a mistake.",
      "Give the result and what you learned about how much data is enough.",
    ],
    mistake: "Presenting a reckless guess as boldness. The skill is acting with the risk made small.",
  },
  "am-2": {
    testing: "Whether you can disagree openly and then back the decision fully.",
    outline: [
      "Say what the decision was and why you disagreed, with your evidence.",
      "Show how you raised it: directly, early and respectfully.",
      "Explain that once it was decided you committed and what you did to help it succeed.",
      "Give the outcome, whether you were right or wrong, and what it showed you.",
    ],
    mistake: "A story where you were proved right. The second half, committing, is what they are listening for.",
  },
  "am-3": {
    testing: "Whether you design for failure across regions, and are honest about consistency.",
    outline: [
      "Clarify what status means: how fresh must it be, and who reads it, customers or internal tools.",
      "Publish each order event to a log, and build a read-optimised view of the latest status per order.",
      "Replicate across regions. Say where you accept slightly stale reads and where you need the latest state.",
      "Cover a region failing: route traffic away, replay events, and make updates idempotent.",
    ],
    mistake: "Promising instant global consistency. Say what you trade for availability, and why it is fine for status.",
  },
  "am-4": {
    testing: "Whether you start from the customer and diagnose in a calm order.",
    outline: [
      "First check that the drop is real: data pipeline, tracking, a change in how it is counted.",
      "Break it down: by region, platform, customer type, and the step in the journey where it falls.",
      "Line it up against changes: releases, outages, campaigns, a competitor, a holiday.",
      "Tell people early what you know and do not know, then give a recommendation and the next update time.",
    ],
    mistake: "Jumping to a cause. A broken tracker is the most common reason a metric falls overnight.",
  },
  "go-1": {
    testing: "Whether you recognise a graph problem and handle cycles.",
    outline: [
      "Say that this is a topological sort and that a cycle means no valid order exists.",
      "Count each node's incoming dependencies, and start from the nodes with none.",
      "Remove a node, lower the counts of what depends on it, and add any that reach zero.",
      "If fewer nodes come out than went in, there is a cycle. State O(V + E) time and space.",
    ],
    mistake: "A depth-first search with no cycle check, which loops forever on a circular dependency.",
  },
  "go-2": {
    testing: "Whether you can serve suggestions fast at huge scale and keep them fresh.",
    outline: [
      "Set the target: suggestions in under 100 ms, as the user types.",
      "Store popular queries in a prefix structure such as a trie, precomputed with their ranking.",
      "Cache the top results for short prefixes close to the user, and shard by prefix for the long tail.",
      "Refresh in the background from recent query logs so new trends appear, and filter unsafe suggestions.",
    ],
    mistake: "Querying a database on every keystroke. The latency alone rules it out.",
  },
  "go-3": {
    testing: "Whether you can measure something as soft as trust, and watch for side effects.",
    outline: [
      "Define trust in measurable terms: return use, fewer re-searches, clicking the explained result, and a short survey.",
      "Run a controlled experiment with the explanation shown to one group and not the other.",
      "Pick one primary measure and guardrails such as time to result and complaints.",
      "Look for side effects: people trusting wrong results more, or ignoring explanations that appear everywhere.",
    ],
    mistake: "Using clicks as the only measure. A more convincing explanation can raise clicks and lower real trust.",
  },
  "go-4": {
    testing: "Whether you understand that being right is not enough to get an idea adopted.",
    outline: [
      "Describe the idea and why it was technically sound.",
      "Say honestly why it failed to land: the people who had to change, the cost to them, how you presented it.",
      "Show what you did about it: listening, adjusting the idea, finding an early supporter.",
      "Say what you do differently now when you propose a change.",
    ],
    mistake: "Blaming people for not understanding. The question is about what you learned about influence.",
  },
  "me-1": {
    testing: "Whether you sort first and keep the merging logic tidy.",
    outline: [
      "Sort the intervals by start time.",
      "Walk through them, keeping a current merged interval. If the next one overlaps, extend its end; if not, close it and start a new one.",
      "Add up the lengths of the merged intervals for the total active time.",
      "State O(n log n) for the sort and O(n) after it, and test touching intervals and one interval inside another.",
    ],
    mistake: "Skipping the sort. Without it, overlaps that are far apart in the list are missed.",
  },
  "me-2": {
    testing: "Whether you understand the central trade-off in feeds: do the work when posting or when reading.",
    outline: [
      "Clarify the scale and freshness: how quickly should a new post appear for friends?",
      "For most users, fan out on write: push new posts into each follower's prepared feed.",
      "For accounts with huge followings, fetch on read and merge, since writing to millions is too slow.",
      "Rank in two steps, a cheap candidate pass and a heavier model on the shortlist, and add checks for spam and abuse.",
    ],
    mistake: "Choosing one approach for everyone. The point is that the right choice depends on follower count.",
  },
  "me-3": {
    testing: "Whether you weigh growth against harm instead of celebrating the number.",
    outline: [
      "Ask what kind of engagement is growing and who is filing the reports.",
      "Check whether the extra engagement is the same people, or whether the reports come from the people it touches.",
      "Look at the longer term: do those users stay, or leave?",
      "Decide what to change or limit, with a guardrail on reports so growth cannot be bought with harm.",
    ],
    mistake: "Treating growth as the winner by default. Name the harm out loud, and set a limit before you ship.",
  },
  "me-4": {
    testing: "Whether you can tell real interaction from hollow clicks.",
    outline: [
      "Define meaningful: a reply, a conversation that continues, or a return visit, not a single tap.",
      "Compare users who used the feature with a matched group, or run an experiment.",
      "Look at depth over time: do the conversations last, and do the same people come back?",
      "Add a quality guardrail and read a sample of real interactions to see what the numbers hide.",
    ],
    mistake: "Counting clicks. Clicks are what hollow engagement looks like.",
  },
  "ms-1": {
    testing: "Whether you design tenancy and permissions so that one customer can never see another's data.",
    outline: [
      "Clarify the tenants: a few huge companies or many small ones, and their compliance needs.",
      "Isolate data by tenant in every table and every query, and check the tenant on every request.",
      "Model permissions in layers: organisation, team, document, and roles with inheritance.",
      "Record an audit log of who did what and when, that cannot be edited, and decide how long it is kept.",
    ],
    mistake: "Adding the tenant check in the application code only. One missed query leaks data across companies.",
  },
  "ms-2": {
    testing: "Whether accessibility is part of how you decide, not an afterthought.",
    outline: [
      "Describe the product plan and the accessibility need that surfaced.",
      "Say how you learned it: talking to users who rely on assistive tools, or testing with them.",
      "Explain what changed in the plan and what you gave up to make room.",
      "Give the result, including benefits that reached users beyond the original group.",
    ],
    mistake: "A story about fixing bugs at the end. Show it changing the plan early.",
  },
  "ms-3": {
    testing: "Whether you can get teams moving together when their goals pull apart.",
    outline: [
      "Name the teams and why their incentives conflicted.",
      "Show you listened first: what each team was measured on and afraid of.",
      "Describe the shared outcome you proposed, and how you made it worth it for each team.",
      "Give the result and how the alignment held when pressure came.",
    ],
    mistake: "Saying you escalated to a manager. They want to hear how you built agreement yourself.",
  },
  "ms-4": {
    testing: "Whether you can take a customer's fear seriously and offer a path that lowers it.",
    outline: [
      "Acknowledge that the worry is reasonable and ask what lock-in would cost them in their own terms.",
      "Show portability: open formats, data export, standard interfaces, and exit terms in the contract.",
      "Propose a phased migration that starts with one low-risk workload and proves value before they commit more.",
      "Agree measures of success for the first phase, so the next step is based on evidence.",
    ],
    mistake: "Promising that lock-in is not an issue. Show how they could leave, and it becomes easier to stay.",
  },
  "ap-1": {
    testing: "Whether you can make trade-offs between competing qualities and explain the choice.",
    outline: [
      "Say that these four pull against each other, then rank them for this feature and this user.",
      "Show an example: doing more work on the device saves a network trip and protects privacy, but costs battery.",
      "Choose a design that does the heavy work at a good moment, such as while charging, and measure each quality.",
      "Say what you would cut first if you had to, and why.",
    ],
    mistake: "Claiming you can have all four with no cost. They are testing how you decide what to give up.",
  },
  "ap-2": {
    testing: "Whether you care about craft and can show it affecting real customers.",
    outline: [
      "Describe the detail: small, specific and easy to miss.",
      "Explain how you noticed it, usually by using the product as a customer would.",
      "Say how you made the case for time to fix it when others thought it was minor.",
      "Show the effect: a measure, a support drop, or customer feedback.",
    ],
    mistake: "A detail that is only visual. Show that it changed how people used the product.",
  },
  "ap-3": {
    testing: "Whether you can evaluate without collecting the raw data you would normally rely on.",
    outline: [
      "Start from the constraint: raw user data stays on the device.",
      "Evaluate on the device and send back only aggregate results, with noise added to protect individuals.",
      "Use a small, consented, or synthetic test set for the cases you cannot see in aggregate.",
      "Watch for gaps in coverage, since you cannot inspect individual failures, and say how you would catch them.",
    ],
    mistake: "Asking to collect the data anyway. The constraint is the point of the question.",
  },
  "ap-4": {
    testing: "Whether you hold a quality line when everyone wants to ship.",
    outline: [
      "Describe the schedule pressure and the quality problem at stake.",
      "Say how you decided what could not be compromised, and what could be cut or delayed.",
      "Explain how you made the case: facts about the risk, and options other than a flat no.",
      "Give the outcome and how the team felt about it afterwards.",
    ],
    mistake: "A story where you simply refused. The better answer shows you offered a way to keep the date and the standard.",
  },
};
