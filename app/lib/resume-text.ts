/** Resume fields are plain text. The on screen preview shows them as text, so the PDF must too: without this, a bullet
 *  like "Built the <Header> component" lost "<Header>" in the PDF and "&nbsp;" turned into a space. */
export function escapeResumeText(value: unknown): any {
  if (typeof value === "string") {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  if (Array.isArray(value)) return value.map(escapeResumeText);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, escapeResumeText(v)]));
  }
  return value;
}
