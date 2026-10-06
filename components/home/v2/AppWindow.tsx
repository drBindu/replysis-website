import React from "react";

/**
 * The Replysis window as it looks on a desktop: the real app's header (logo, microphone, Listening, Screen live),
 * an answer panel and the Interviewer panel. Drawn in HTML so it stays sharp and scales as one piece (every size inside
 * is in em, and the parent sets the base size from its own width).
 */
export const SAY_TWO_SUM =
  "I would keep a hash map from each value to its index. For every number I check whether its complement is already in the map, so one pass is enough.";

export const CODE_TWO_SUM = `seen = {}
for i, n in enumerate(nums):
    if target - n in seen:
        return [seen[target - n], i]
    seen[n] = i`;

export default function AppWindow({
  say,
  typing = false,
  showCode = false,
  question = "Walk me through how you would solve Two Sum.",
  chip = "Screen live",
}: {
  say: string;
  typing?: boolean;
  showCode?: boolean;
  question?: string;
  chip?: string;
}) {
  return (
    <div className="hv2-app" role="img" aria-label="The Replysis window showing a written answer to the interviewer's question">
      <div className="hv2-app-head">
        <span className="hv2-app-logo">
          <img src="/brand/replysis-icon-64.png" alt="" draggable={false} />
          Replysis AI
        </span>
        <span className="hv2-app-mic" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="#e8edf3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </span>
        <span className="hv2-app-live">LISTENING</span>
        <span className="hv2-app-chip">{chip}</span>
      </div>

      <div className="hv2-app-body">
        <p className="hv2-app-label">AI ANSWER</p>
        <p className="hv2-app-say">
          {say}
          {typing ? <span className="hv2-caret" aria-hidden /> : null}
        </p>
        <pre className={`hv2-app-code${showCode ? " is-in" : ""}`}>{CODE_TWO_SUM}</pre>
        <p className={`hv2-app-cx${showCode ? " is-in" : ""}`}>Time O(n), space O(n)</p>
      </div>

      <div className="hv2-app-foot">
        <p className="hv2-app-label">INTERVIEWER</p>
        <p>{question}</p>
      </div>
    </div>
  );
}
