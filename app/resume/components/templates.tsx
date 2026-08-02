import React from "react";

export type TemplateId =
  | "cornerstone"
  | "meridian"
  | "dualaxis"
  | "apex"
  | "density"
  | "pillar"
  | "executive"
  | "prestige"
  | "ats_clean"
  | "ats_minimal"
  | "techpro"
  | "faang";

export const TEMPLATE_LIST: { id: TemplateId; name: string; desc: string; ats: boolean }[] = [
  { id: "cornerstone", name: "Cornerstone",  desc: "Classic centered executive",    ats: false },
  { id: "meridian",    name: "Meridian",     desc: "Airy minimal with hairlines",   ats: false },
  { id: "dualaxis",    name: "Dualaxis",     desc: "Structured two-column grid",    ats: false },
  { id: "apex",        name: "Apex",         desc: "Full-bleed color header",       ats: false },
  { id: "density",     name: "Density",      desc: "Maximum information density",   ats: false },
  { id: "pillar",      name: "Pillar",       desc: "Lateral accent stripe",         ats: false },
  { id: "executive",   name: "Executive",    desc: "Dark slate professional",       ats: false },
  { id: "prestige",    name: "Prestige",     desc: "Serif refinement & grace",      ats: false },
  { id: "ats_clean",   name: "ATS Clean",    desc: "100% ATS-safe, plain text",     ats: true  },
  { id: "ats_minimal", name: "ATS Minimal",  desc: "Minimal formatting, max parse", ats: true  },
  { id: "techpro",     name: "TechPro",      desc: "FAANG-style engineering",       ats: true  },
  { id: "faang",       name: "FAANG Elite",  desc: "Google/Meta recruiter format",  ats: true  },
];

/* ─────────────────────────────────────────────────────────────────
   THUMBNAIL SVG GENERATOR
───────────────────────────────────────────────────────────────── */
export function getTemplateThumbnail(id: TemplateId, accent = "#2563eb"): string {
  const W = 100, H = 141;
  const g = "#e5e7eb", dg = "#d1d5db", mg = "#9ca3af", lg = "#f3f4f6";
  const ac = accent;

  const r = (x: number, y: number, w: number, h: number, fill: string, rx = 0) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
  const ln = (x1: number, y1: number, x2: number, y2: number, c: string, sw = 0.5) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}"/>`;
  const bullets = (x: number, y: number, n = 3, maxW = 40) => {
    let s = "";
    const widths = [maxW, maxW - 6, maxW - 2];
    for (let i = 0; i < n; i++) {
      s += r(x, y + i * 5, 2.5, 2.5, mg, 0.5);
      s += r(x + 5, y + i * 5 + 0.5, widths[i % 3], 1.8, dg, 1);
    }
    return s;
  };
  const skillRow = (x: number, y: number, lw = 18, vw = 30) =>
    r(x, y, lw, 1.8, "#6b7280", 1) + r(x + lw + 3, y, vw, 1.8, dg, 1);
  const sh = (x: number, y: number, w: number, label = 14) =>
    r(x, y, label, 1.8, ac, 1) + ln(x, y + 3, x + w, y + 3, ac, 0.6);
  const shLine = (x: number, y: number, totalW: number, label = 14) =>
    r(x, y, label, 1.8, ac, 1) + ln(x + label + 3, y + 0.9, x + totalW, y + 0.9, dg);
  const expBlock = (x: number, y: number, w: number, lines = 2) => {
    let s = r(x, y, w * 0.55, 2, "#374151", 1) + r(x + w * 0.6, y, w * 0.35, 1.5, mg, 1);
    for (let i = 0; i < lines; i++) s += r(x + 4, y + 4 + i * 4, w - 4, 1.5, g, 1);
    return s;
  };

  const svgs: Record<TemplateId, string> = {
    cornerstone: `
      ${r(0, 0, W, H, "#fff")}
      ${r(0, 0, W, 1.5, ac)}${r(0, 3, W, 0.6, ac)}
      ${r(25, 8, 50, 5, "#1e293b", 1)}
      ${r(30, 15, 40, 2, mg, 1)}${r(33, 19, 34, 1.5, dg, 1)}
      ${sh(10, 27, 80)}
      ${r(10, 32, 80, 1.5, g, 1)}${r(10, 35, 68, 1.5, g, 1)}${r(10, 38, 74, 1.5, g, 1)}
      ${sh(10, 44, 80)}
      ${bullets(13, 49, 3, 38)}
      ${bullets(13, 64, 3, 38)}
      ${sh(10, 78, 80)}
      ${r(10, 83, 80, 1.5, g, 1)}${r(10, 86, 66, 1.5, g, 1)}
      ${sh(10, 92, 80)}
      ${expBlock(10, 97, 80, 2)}
    `,
    meridian: `
      ${r(0, 0, W, H, "#fff")}
      ${r(8, 8, 60, 6, "#0f172a", 1)}
      ${r(8, 16, 34, 2, ac, 1)}
      ${ln(8, 21, 92, 21, "#e2e8f0", 0.8)}
      ${r(8, 24, 65, 1.5, mg, 1)}
      ${shLine(8, 31, 84, 20)}
      ${r(8, 35, 82, 1.5, g, 1)}${r(8, 38, 70, 1.5, g, 1)}${r(8, 41, 76, 1.5, g, 1)}
      ${shLine(8, 48, 84, 22)}
      ${bullets(11, 53, 3, 40)}
      ${bullets(11, 68, 3, 40)}
      ${shLine(8, 80, 84, 18)}
      ${r(8, 84, 82, 1.5, g, 1)}${r(8, 87, 66, 1.5, g, 1)}
      ${shLine(8, 93, 84, 16)}
      ${r(8, 97, 82, 1.5, g, 1)}
    `,
    dualaxis: `
      ${r(0, 0, W, H, "#fff")}
      ${r(0, 0, W, 22, ac)}
      ${r(6, 5, 52, 5, "#fff", 1)}
      ${r(6, 12, 28, 2, "rgba(255,255,255,0.75)", 1)}
      ${r(6, 16, 44, 1.5, "rgba(255,255,255,0.55)", 1)}
      ${r(0, 22, 34, H - 22, "#f8fafc")}
      ${ln(34, 22, 34, H, "#e2e8f0")}
      ${r(4, 26, 16, 1.8, ac, 1)}${ln(4, 29, 30, 29, dg)}
      ${skillRow(4, 31, 10, 14)}${skillRow(4, 35, 12, 12)}${skillRow(4, 39, 8, 16)}
      ${r(4, 45, 16, 1.8, ac, 1)}${ln(4, 48, 30, 48, dg)}
      ${r(4, 51, 26, 2, "#374151", 1)}${r(4, 55, 22, 1.5, g, 1)}${r(4, 58, 20, 1.5, g, 1)}
      ${r(4, 63, 26, 2, "#374151", 1)}${r(4, 67, 24, 1.5, g, 1)}
      ${sh(37, 26, 59, 18)}
      ${bullets(39, 32, 3, 36)}
      ${bullets(39, 47, 3, 36)}
      ${sh(37, 60, 59, 22)}
      ${r(37, 65, 55, 2, "#374151", 1)}${r(37, 69, 44, 1.5, g, 1)}${r(37, 72, 50, 1.5, g, 1)}
    `,
    apex: `
      ${r(0, 0, W, H, "#fff")}
      ${r(0, 0, W, 30, ac)}
      ${r(22, 5, 56, 6, "#fff", 1)}
      ${ln(37, 13, 63, 13, "rgba(255,255,255,0.4)", 0.7)}
      ${r(18, 16, 64, 2, "rgba(255,255,255,0.85)", 1)}
      ${r(20, 20, 60, 1.5, "rgba(255,255,255,0.6)", 1)}
      ${r(22, 24, 56, 1.5, "rgba(255,255,255,0.45)", 1)}
      ${sh(8, 35, 84)}
      ${r(8, 40, 80, 1.5, g, 1)}${r(8, 43, 68, 1.5, g, 1)}${r(8, 46, 74, 1.5, g, 1)}
      ${sh(8, 52, 84)}
      ${bullets(11, 57, 3, 40)}
      ${bullets(11, 72, 3, 40)}
      ${sh(8, 84, 84)}
      ${r(8, 89, 80, 1.5, g, 1)}${r(8, 92, 64, 1.5, g, 1)}
    `,
    density: `
      ${r(0, 0, W, H, "#fff")}
      ${r(5, 6, 48, 5, "#0f172a", 1)}
      ${r(5, 13, 26, 2, ac, 1)}
      ${ln(5, 18, 95, 18, ac, 1.2)}
      ${r(63, 7, 30, 2, mg, 1)}${r(63, 11, 26, 1.5, g, 1)}${r(63, 15, 20, 1.5, dg, 1)}
      ${r(5, 21, 18, 1.6, ac, 1)}${ln(5, 24, 95, 24, ac, 0.5)}
      ${skillRow(5, 26, 12, 22)}${skillRow(5, 30, 10, 26)}${skillRow(5, 34, 14, 18)}
      ${r(5, 39, 24, 1.6, ac, 1)}${ln(5, 42, 95, 42, ac, 0.5)}
      ${bullets(7, 44, 3, 42)}
      ${bullets(7, 59, 3, 42)}
      ${r(5, 70, 18, 1.6, ac, 1)}${ln(5, 73, 95, 73, ac, 0.5)}
      ${r(5, 76, 88, 1.5, g, 1)}${r(5, 79, 72, 1.5, g, 1)}
      ${r(5, 84, 22, 1.6, ac, 1)}${ln(5, 87, 95, 87, ac, 0.5)}
      ${r(5, 90, 88, 1.5, g, 1)}
    `,
    pillar: `
      ${r(0, 0, W, H, "#fff")}
      ${r(0, 0, 5, H, ac)}
      ${r(10, 8, 52, 5, ac, 1)}
      ${r(10, 15, 32, 2, mg, 1)}
      ${ln(10, 20, 93, 20, "#cbd5e1", 0.8)}
      ${r(10, 23, 62, 1.5, mg, 1)}${r(10, 27, 42, 1.5, dg, 1)}
      ${sh(10, 34, 83, 20)}
      ${r(10, 39, 82, 1.5, g, 1)}${r(10, 42, 70, 1.5, g, 1)}${r(10, 45, 76, 1.5, g, 1)}
      ${sh(10, 51, 83, 24)}
      ${bullets(13, 56, 3, 40)}
      ${bullets(13, 71, 3, 40)}
      ${sh(10, 83, 83, 18)}
      ${r(10, 88, 82, 1.5, g, 1)}${r(10, 91, 66, 1.5, g, 1)}
    `,
    executive: `
      ${r(0, 0, W, H, "#fff")}
      ${r(0, 0, W, 30, "#1e293b")}
      ${r(8, 5, 55, 5, "#f8fafc", 1)}
      ${r(8, 12, 32, 2, "#94a3b8", 1)}
      ${r(8, 16, 14, 1.5, ac)}
      ${r(8, 20, 55, 1.5, "#94a3b8", 1)}
      ${r(8, 24, 44, 1.5, "#64748b", 1)}
      ${sh(8, 35, 84)}
      ${r(8, 40, 80, 1.5, g, 1)}${r(8, 43, 68, 1.5, g, 1)}${r(8, 46, 74, 1.5, g, 1)}
      ${sh(8, 52, 84)}
      ${bullets(11, 57, 3)}
      ${bullets(11, 72, 3)}
      ${sh(8, 83, 84)}
      ${r(8, 88, 80, 1.5, g, 1)}${r(8, 91, 64, 1.5, g, 1)}
    `,
    prestige: `
      ${r(0, 0, W, H, "#fff")}
      ${r(20, 7, 60, 4.5, "#111827", 1)}
      ${r(20, 13, 24, 0.5, dg)}${r(73, 13, 7, 0.5, dg)}${r(48, 12, 4, 4, ac, 2)}
      ${r(28, 19, 44, 1.5, "#4b5563", 1)}
      ${r(28, 23, 44, 1.5, mg, 1)}
      ${shLine(8, 30, 84, 16)}
      ${r(8, 34, 82, 1.5, g, 1)}${r(8, 37, 72, 1.5, g, 1)}${r(8, 40, 77, 1.5, g, 1)}
      ${shLine(8, 47, 84, 24)}
      ${bullets(11, 52, 3, 38)}
      ${bullets(11, 67, 3, 38)}
      ${shLine(8, 79, 84, 18)}
      ${r(8, 83, 82, 1.5, g, 1)}${r(8, 86, 66, 1.5, g, 1)}
      ${shLine(8, 93, 84, 14)}
      ${r(8, 97, 82, 1.5, g, 1)}
    `,
    ats_clean: `
      ${r(0, 0, W, H, "#fff")}
      ${r(8, 8, 54, 5, "#111827", 1)}
      ${r(8, 15, 34, 2, "#374151", 1)}
      ${r(8, 19, 72, 1.5, "#6b7280", 1)}
      ${ln(8, 25, 92, 25, "#111827", 0.8)}
      ${r(8, 28, 24, 2, "#111827", 1)}
      ${r(8, 32, 82, 1.5, g, 1)}${r(8, 35, 70, 1.5, g, 1)}${r(8, 38, 76, 1.5, g, 1)}
      ${ln(8, 44, 92, 44, "#111827", 0.8)}
      ${r(8, 47, 28, 2, "#111827", 1)}
      ${bullets(10, 52, 3, 44)}
      ${bullets(10, 67, 3, 44)}
      ${ln(8, 78, 92, 78, "#111827", 0.8)}
      ${r(8, 81, 22, 2, "#111827", 1)}
      ${r(8, 85, 82, 1.5, g, 1)}${r(8, 88, 66, 1.5, g, 1)}
    `,
    ats_minimal: `
      ${r(0, 0, W, H, "#fff")}
      ${r(8, 8, 54, 5, "#111827", 1)}
      ${r(8, 15, 34, 2, "#374151", 1)}
      ${r(8, 19, 82, 1.5, dg, 1)}
      ${r(8, 26, 20, 2, "#374151", 1)}
      ${ln(8, 29.5, 92, 29.5, "#374151", 0.5)}
      ${r(8, 32, 82, 1.5, g, 1)}${r(8, 35, 70, 1.5, g, 1)}
      ${r(8, 41, 24, 2, "#374151", 1)}
      ${ln(8, 44.5, 92, 44.5, "#374151", 0.5)}
      ${bullets(10, 47, 3, 44)}
      ${bullets(10, 62, 3, 44)}
      ${r(8, 73, 20, 2, "#374151", 1)}
      ${ln(8, 76.5, 92, 76.5, "#374151", 0.5)}
      ${r(8, 79, 82, 1.5, g, 1)}${r(8, 82, 66, 1.5, g, 1)}
      ${r(8, 88, 18, 2, "#374151", 1)}
      ${ln(8, 91.5, 92, 91.5, "#374151", 0.5)}
      ${r(8, 94, 82, 1.5, g, 1)}
    `,
    techpro: `
      ${r(0, 0, W, H, "#fff")}
      ${r(0, 0, W, 2, ac)}
      ${r(8, 6, 54, 5.5, "#0f172a", 1)}
      ${r(8, 13, 36, 2, ac, 1)}
      ${r(8, 17, 72, 1.5, mg, 1)}
      ${ln(8, 23, 92, 23, dg)}
      ${r(8, 26, 30, 1.8, "#0f172a", 1)}${ln(8, 29.5, 92, 29.5, dg)}
      ${skillRow(8, 31.5, 22, 28)}${skillRow(8, 35.5, 18, 32)}${skillRow(8, 39.5, 24, 24)}
      ${r(8, 46, 30, 1.8, "#0f172a", 1)}${ln(8, 49.5, 92, 49.5, dg)}
      ${r(8, 52, 52, 2, "#374151", 1)}${r(64, 52, 26, 2, mg, 1)}
      ${bullets(10, 57, 3, 42)}
      ${r(8, 72, 52, 2, "#374151", 1)}${r(64, 72, 26, 2, mg, 1)}
      ${bullets(10, 77, 2, 42)}
      ${r(8, 88, 28, 1.8, "#0f172a", 1)}${ln(8, 91.5, 92, 91.5, dg)}
      ${r(8, 94, 82, 1.5, g, 1)}
    `,
    faang: `
      ${r(0, 0, W, H, "#fff")}
      ${r(8, 7, 56, 6, "#0f172a", 1)}
      ${r(8, 15, 38, 2, "#374151", 1)}
      ${r(8, 19, 82, 1.5, mg, 1)}
      ${ln(8, 25.5, 92, 25.5, "#0f172a", 1)}
      ${r(8, 28, 26, 2, "#0f172a", 1)}
      ${r(8, 32, 30, 1.8, "#374151", 1)}${r(56, 32, 32, 1.8, "#94a3b8", 1)}
      ${bullets(10, 37, 3, 44)}
      ${r(8, 53, 30, 1.8, "#374151", 1)}${r(56, 53, 32, 1.8, "#94a3b8", 1)}
      ${bullets(10, 58, 2, 44)}
      ${ln(8, 69.5, 92, 69.5, "#0f172a", 1)}
      ${r(8, 72, 20, 2, "#0f172a", 1)}
      ${skillRow(8, 76, 20, 38)}${skillRow(8, 80, 16, 42)}${skillRow(8, 84, 22, 36)}
      ${ln(8, 90.5, 92, 90.5, "#0f172a", 1)}
      ${r(8, 93, 22, 2, "#0f172a", 1)}
      ${r(8, 97, 82, 1.5, g, 1)}
    `,
  };

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    ${svgs[id] || r(0, 0, W, H, lg)}
  </svg>`;
}

/* ─────────────────────────────────────────────────────────────────
   TEMPLATE PICKER COMPONENT
───────────────────────────────────────────────────────────────── */
interface TemplatePickerProps {
  selected: TemplateId;
  accentColor?: string;
  onSelect: (id: TemplateId) => void;
}

export function TemplatePicker({ selected, accentColor = "#2563eb", onSelect }: TemplatePickerProps) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 12,
      }}>
        {TEMPLATE_LIST.map((t) => {
          const isSelected = selected === t.id;
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{
                cursor: "pointer",
                borderRadius: 10,
                border: isSelected ? `2px solid ${accentColor}` : "1.5px solid #e2e8f0",
                overflow: "hidden",
                background: "#fff",
                transition: "border-color 0.15s, transform 0.12s, box-shadow 0.15s",
                transform: isSelected ? "translateY(-2px)" : "none",
                boxShadow: isSelected ? `0 4px 14px ${accentColor}30` : "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{
                width: "100%",
                aspectRatio: "0.707",
                background: "#fff",
                overflow: "hidden",
                position: "relative",
              }}
                dangerouslySetInnerHTML={{ __html: getTemplateThumbnail(t.id, accentColor) }}
              />
              <div style={{
                padding: "7px 9px 8px",
                borderTop: "0.5px solid #f1f5f9",
                background: isSelected ? `${accentColor}08` : "#fff",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: isSelected ? accentColor : "#111827",
                    lineHeight: 1.2,
                  }}>{t.name}</span>
                  {t.ats && (
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      background: "#dcfce7", color: "#15803d",
                      padding: "1px 5px", borderRadius: 4,
                      letterSpacing: "0.04em",
                    }}>ATS</span>
                  )}
                </div>
                <div style={{ fontSize: 10.5, color: "#6b7280", lineHeight: 1.3 }}>{t.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STYLE CONTEXT TYPES
───────────────────────────────────────────────────────────────── */
type StyleCtx = {
  ff: string;
  ac: string;
  fs: number;
  lh: number;
  sg: number;
  pagePad: string;
  data: any;
  sectionOrder: string[];
};

type PrintCtx = StyleCtx & {
  fontUrl?: string;
  paperSize: string;
};

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const linkLine = (d: any): string[] => {
  const parts: string[] = [];
  if (d.linkedin)  parts.push(d.linkedin);
  if (d.github)    parts.push(d.github);
  if (d.portfolio) parts.push(d.portfolio);
  (d.customLinks || []).forEach((l: any) => {
    if (l.url) parts.push(l.label ? `${l.label}: ${l.url}` : l.url);
  });
  return parts;
};

const contactLine = (d: any): string =>
  [d.email, d.phone, d.location].filter(Boolean).join("  ·  ");

/* Parse "48px 52px" → [48, 52] */
export function parsePagePad(pagePad: string): [number, number] {
  if (!pagePad || !pagePad.trim()) {
    console.warn("parsePagePad: empty value, using defaults [48, 48]");
    return [48, 48];
  }
  const parts = pagePad.split(" ").map(p => parseInt(p, 10));
  const v = isNaN(parts[0]) ? 48 : parts[0];
  const h = isNaN(parts[1]) ? v : parts[1];
  if (isNaN(parts[0])) console.warn(`parsePagePad: invalid value "${pagePad}", using defaults`);
  return [v, h];
}

/* ================================================================
   SHARED SECTION BUILDERS
================================================================ */
function buildSectionBuilders(ctx: StyleCtx) {
  const { ff, ac, fs, lh, sg, data } = ctx;

  const tx = (
    size = fs,
    color = "#111827",
    extra: React.CSSProperties = {}
  ): React.CSSProperties => ({
    margin: 0, padding: 0,
    fontFamily: ff, fontSize: `${size}px`,
    color, lineHeight: lh, ...extra,
  });

  const liSt: React.CSSProperties = {
    fontFamily: ff, fontSize: `${fs}px`,
    color: "#374151", lineHeight: lh,
    marginBottom: 2, listStyleType: "disc",
    listStylePosition: "outside", display: "list-item",
  };

  const bul = (arr: unknown) =>
    (Array.isArray(arr) ? arr : [arr])
      .filter(Boolean)
      .map((b, j) => <li key={j} style={liSt}>{String(b)}</li>);

  /* Section heading variants */
  const SH = ({ title, acOverride }: { title: string; acOverride?: string }) => {
    const c = acOverride || ac;
    return (
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontFamily: ff, fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: c, marginBottom: 4 }}>{title}</div>
        <div style={{ height: 1, backgroundColor: c, width: "100%" }} />
      </div>
    );
  };

  const SH_LINE = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 5, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontFamily: ff, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: ac, whiteSpace: "nowrap" as const }}>{title}</div>
      <div style={{ flex: 1, height: 1, backgroundColor: "#d1d5db" }} />
    </div>
  );

  const SH_FLUSH = ({ title }: { title: string }) => (
    <div style={{ fontFamily: ff, fontSize: 8, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.14em", color: ac, borderBottom: `1px solid ${ac}`, paddingBottom: 2, marginBottom: 5 }}>{title}</div>
  );

  const SH_PLAIN = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 5 }}>
      <div style={{ fontFamily: ff, fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#111827", marginBottom: 3 }}>{title}</div>
      <div style={{ height: 1, backgroundColor: "#111827", width: "100%" }} />
    </div>
  );

  const SH_MINIMAL = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 5 }}>
      <div style={{ fontFamily: ff, fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#374151", marginBottom: 3 }}>{title}</div>
      <div style={{ height: 0.5, backgroundColor: "#374151", width: "100%" }} />
    </div>
  );

  const SH_TECH = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontFamily: ff, fontSize: 9, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: ac, marginBottom: 4 }}>{title}</div>
      <div style={{ height: 1, backgroundColor: "#e2e8f0", width: "100%" }} />
    </div>
  );

  return { tx, bul, liSt, SH, SH_LINE, SH_FLUSH, SH_PLAIN, SH_MINIMAL, SH_TECH };
}

/* ================================================================
   TEMPLATE SECTIONS INTERFACE
================================================================ */
export interface TemplateSections {
  header: React.ReactNode;
  sections: { key: string; node: React.ReactNode }[];
  pageWrap: (children: React.ReactNode, pageIndex: number, totalPages: number) => React.ReactNode;
}

/* ================================================================
   GRANULAR SECTION BUILDER
   
   Instead of one big React node per section (e.g. all of "Work Experience"),
   we emit granular sub-units that the packer can place individually:
   
     "experience:heading"  → the "WORK EXPERIENCE" title + rule
     "experience:0"        → first job entry (with marginTop for gap)
     "experience:1"        → second job entry
     "projects:heading"
     "projects:0"
     ...
   
   This lets the packer break mid-section  -  e.g. put job 0 on page 1
   and job 1 on page 2  -  instead of moving the entire section when
   even one entry overflows, which caused the huge gaps.
================================================================ */
function buildGranularSections(
  ctx: StyleCtx,
  SHComp: any,
  sectionOrder: string[],
  data: any,
  expRenderer?: (exp: any, i: number, isFirst: boolean) => React.ReactNode
): { key: string; node: React.ReactNode }[] {
  const { ff, ac, fs, lh, sg } = ctx;
  const b = buildSectionBuilders(ctx);
  const { tx, bul, liSt } = b;

  const out: { key: string; node: React.ReactNode }[] = [];
  const knownSections = ["summary", "skills", "experience", "projects", "education", "certifications"];

  for (const secId of sectionOrder) {
    if (!knownSections.includes(secId)) {
      console.warn(`buildGranularSections: unknown section "${secId}" in sectionOrder, skipping`);
    }
    if (secId === "summary" && data.summary) {
      out.push({
        key: "summary",
        node: (
          <div style={{ marginBottom: sg }}>
            <SHComp title="Professional Summary" />
            <div style={tx(fs, "#1f2937", { textAlign: "justify", lineHeight: lh })}>{data.summary}</div>
          </div>
        ),
      });
    }

    else if (secId === "skills" && (data.skillCategories?.length ?? 0) > 0) {
      out.push({
        key: "skills",
        node: (
          <div style={{ marginBottom: sg }}>
            <SHComp title="Technical Skills" />
            {data.skillCategories.map((cat: any, i: number) => (
              <div key={i} style={{ marginTop: i === 0 ? 0 : 3 }}>
                <span style={tx(fs, "#111827", { fontWeight: 700 })}>{cat.name}:</span>{" "}
                <span style={tx(fs, "#374151")}>{cat.skills}</span>
              </div>
            ))}
          </div>
        ),
      });
    }

    else if (secId === "experience" && (data.experience?.length ?? 0) > 0) {
      // Heading as its own packer unit
      out.push({
        key: "experience:heading",
        node: <div style={{ marginBottom: 0 }}><SHComp title="Work Experience" /></div>,
      });
      // Each job entry as its own packer unit
      data.experience.forEach((exp: any, i: number) => {
        const isFirst = i === 0;
        const node = expRenderer
          ? expRenderer(exp, i, isFirst)
          : (
            <div style={{ marginTop: isFirst ? 0 : 12, marginBottom: i === data.experience.length - 1 ? sg : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={tx(fs, "#111827", { fontWeight: 700 })}>{exp.company}{exp.role ? `  -  ${exp.role}` : ""}</span>
                <span style={tx(8.5, "#6b7280", { whiteSpace: "nowrap", marginLeft: 10 })}>{exp.period}</span>
              </div>
              {exp.location && <div style={tx(8.5, "#9ca3af", { fontStyle: "italic", marginTop: 1, marginBottom: 3 })}>{exp.location}</div>}
              <ul style={{ margin: "4px 0 0", paddingLeft: 16, listStyle: "disc" }}>{bul(exp.bullets)}</ul>
            </div>
          );
        out.push({ key: `experience:${i}`, node });
      });
    }

    else if (secId === "projects" && (data.projects?.length ?? 0) > 0) {
      out.push({
        key: "projects:heading",
        node: <div style={{ marginBottom: 0 }}><SHComp title="Projects" /></div>,
      });
      data.projects.forEach((proj: any, i: number) => {
        const isFirst = i === 0;
        out.push({
          key: `projects:${i}`,
          node: (
            <div style={{ marginTop: isFirst ? 0 : 10, marginBottom: i === data.projects.length - 1 ? sg : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={tx(fs, ac, { fontWeight: 700 })}>{proj.title || proj.name}</span>
                {proj.period && <span style={tx(8.5, "#6b7280")}>{proj.period}</span>}
              </div>
              {proj.tech && <div style={tx(8.5, "#6b7280", { fontStyle: "italic", marginTop: 1, marginBottom: 3 })}>{proj.tech}</div>}
              {(proj.bullets?.length ?? 0) > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 16, listStyle: "disc" }}>{bul(proj.bullets)}</ul>}
            </div>
          ),
        });
      });
    }

    else if (secId === "education" && (data.education?.length ?? 0) > 0) {
      out.push({
        key: "education:heading",
        node: <div style={{ marginBottom: 0 }}><SHComp title="Education" /></div>,
      });
      data.education.forEach((edu: any, i: number) => {
        const isFirst = i === 0;
        out.push({
          key: `education:${i}`,
          node: (
            <div style={{ marginTop: isFirst ? 0 : 10, marginBottom: i === data.education.length - 1 ? sg : 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={tx(fs, "#111827", { fontWeight: 700 })}>{edu.school || edu.institution || "Unknown School"}</div>
                <div style={tx(fs - 0.5, "#374151", { marginTop: 2 })}>{edu.degree || ""}{edu.gpa ? `  -  GPA: ${edu.gpa}` : ""}</div>
              </div>
              <span style={tx(8.5, "#6b7280", { whiteSpace: "nowrap", marginLeft: 10 })}>{edu.period || edu.year || ""}</span>
            </div>
          ),
        });
      });
    }

    else if (secId === "certifications") {
      const valid = (data.certifications || []).filter((c: any) =>
        typeof c === "string" ? c.trim() : c?.name?.trim()
      );
      if (valid.length > 0) {
        out.push({
          key: "certifications",
          node: (
            <div style={{ marginBottom: sg }}>
              <SHComp title="Certifications" />
              <ul style={{ margin: "5px 0 0", paddingLeft: 16, listStyle: "disc" }}>
                {valid.map((cert: any, i: number) => (
                  <li key={i} style={liSt}>
                    {typeof cert === "string" ? cert : `${cert.name ?? ""}${cert.issuer ? `  -  ${cert.issuer}` : ""}${cert.year ? ` (${cert.year})` : ""}`}
                  </li>
                ))}
              </ul>
            </div>
          ),
        });
      }
    }
  }

  return out;
}

/* ================================================================
   renderPreviewSections  -  main export used by ResumePreview
================================================================ */
export function renderPreviewSections(templateId: TemplateId, ctx: StyleCtx): TemplateSections {
  const { ff, ac, fs, lh, sg, pagePad, data, sectionOrder } = ctx;
  const pi = data.personalInfo || {};
  const b = buildSectionBuilders(ctx);
  const { tx, bul, SH, SH_LINE, SH_FLUSH, SH_PLAIN, SH_MINIMAL, SH_TECH } = b;

  const links   = linkLine(pi);
  const contact = contactLine(pi);

  const LinksRow = ({ color = "#6b7280", size = 8.5 }: { color?: string; size?: number }) =>
    links.length > 0 ? (
      <div style={tx(size, color, { marginTop: 3 })}>{links.join("  ·  ")}</div>
    ) : null;

  /* ── CORNERSTONE ── */
  if (templateId === "cornerstone") {
    const header = (
      <>
        <div style={{ textAlign: "center", paddingBottom: 12, marginBottom: 4 }}>
          <div style={tx(26, "#0f172a", { fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.1 })}>{pi.name || "Your Name"}</div>
          <div style={tx(9, "#64748b", { marginTop: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em" })}>{pi.headline || "Your Headline"}</div>
          <div style={tx(8.5, "#6b7280", { marginTop: 5 })}>{contact || "email · phone · location"}</div>
          <LinksRow size={8} color="#9ca3af" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 2, backgroundColor: ac }} />
          <div style={{ height: 1, backgroundColor: ac, marginTop: 2 }} />
        </div>
      </>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, height: "100%", boxSizing: "border-box" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── MERIDIAN ── */
  if (templateId === "meridian") {
    const header = (
      <div style={{ marginBottom: 18 }}>
        <div style={tx(30, "#0f172a", { fontWeight: 200, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.1 })}>{pi.name || "Your Name"}</div>
        <div style={tx(9.5, ac, { marginTop: 5, fontWeight: 600, letterSpacing: "0.06em" })}>{pi.headline || "Your Headline"}</div>
        <div style={{ height: 1, backgroundColor: "#e2e8f0", margin: "10px 0" }} />
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const }}>
          <div style={tx(8.5, "#6b7280")}>{contact}</div>
          <LinksRow size={8.5} />
        </div>
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH_LINE, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, height: "100%", boxSizing: "border-box" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── DUALAXIS ── */
  if (templateId === "dualaxis") {
    const header = (
      <div style={{ padding: "26px 34px 22px", backgroundColor: ac, marginLeft: `-${parsePagePad(pagePad)[1]}px`, marginRight: `-${parsePagePad(pagePad)[1]}px`, marginTop: `-${parsePagePad(pagePad)[0]}px`, marginBottom: 18 }}>
        <div style={tx(26, "#ffffff", { fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.1 })}>{pi.name || "Your Name"}</div>
        <div style={tx(9, "#ffffff", { marginTop: 5, opacity: 0.85, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" })}>{pi.headline || "Your Headline"}</div>
        <div style={tx(8.5, "#ffffff", { marginTop: 6, opacity: 0.75 })}>{contact}</div>
        {links.length > 0 && <div style={tx(8, "#ffffff", { marginTop: 3, opacity: 0.65 })}>{links.join("  ·  ")}</div>}
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, height: "100%", boxSizing: "border-box", overflow: "hidden" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── APEX ── */
  if (templateId === "apex") {
    const [padVa, padH] = parsePagePad(pagePad);
    const header = (
      <div style={{
        backgroundColor: ac, padding: "34px 46px 30px", textAlign: "center",
        marginLeft: `-${padH}px`, marginRight: `-${padH}px`,
        marginTop: `-${padVa}px`, marginBottom: 22,
      }}>
        <div style={tx(28, "#ffffff", { fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.1 })}>{pi.name || "Your Name"}</div>
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.3)", width: "60px", margin: "10px auto 0" }} />
        <div style={tx(9.5, "#ffffff", { marginTop: 8, opacity: 0.9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" })}>{pi.headline || "Your Headline"}</div>
        <div style={tx(8.5, "#ffffff", { marginTop: 6, opacity: 0.75 })}>{contact}</div>
        {links.length > 0 && <div style={tx(8, "#ffffff", { marginTop: 3, opacity: 0.6 })}>{links.join("  |  ")}</div>}
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, height: "100%", boxSizing: "border-box", overflow: "hidden" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── DENSITY ── */
  if (templateId === "density") {
    const header = (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `1.5px solid ${ac}`, paddingBottom: 8, marginBottom: 10 }}>
        <div>
          <div style={tx(22, "#0f172a", { fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1.1 })}>{pi.name || "Your Name"}</div>
          <div style={tx(8.5, ac, { fontWeight: 600, marginTop: 3 })}>{pi.headline || "Headline"}</div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={tx(8, "#4b5563")}>{pi.email}</div>
          <div style={tx(8, "#4b5563")}>{pi.phone}{pi.location ? `  ·  ${pi.location}` : ""}</div>
          {links.length > 0 && <div style={tx(7.5, "#9ca3af")}>{links[0]}</div>}
        </div>
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH_FLUSH, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: "24px 34px", backgroundColor: "#ffffff", colorScheme: "light" as any, height: "100%", boxSizing: "border-box" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── PILLAR ── */
  if (templateId === "pillar") {
    const header = (
      <div style={{ marginBottom: 16, paddingLeft: 4 }}>
        <div style={tx(26, ac, { fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.1 })}>{pi.name || "Your Name"}</div>
        <div style={tx(9.5, "#475569", { marginTop: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" })}>{pi.headline || "Your Headline"}</div>
        <div style={{ height: 1, backgroundColor: "#cbd5e1", margin: "10px 0" }} />
        <div style={tx(8.5, "#6b7280")}>{contact}</div>
        <LinksRow size={8} color="#94a3b8" />
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ display: "flex", height: "100%", backgroundColor: "#ffffff", colorScheme: "light" as any, boxSizing: "border-box" }}>
          <div style={{ width: 5, backgroundColor: ac, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: pagePad, boxSizing: "border-box" }}>
            {children}
          </div>
        </div>
      ),
    };
  }

  /* ── EXECUTIVE ── */
  if (templateId === "executive") {
    const [padVe, padH] = parsePagePad(pagePad);
    const header = (
      <div style={{
        backgroundColor: "#1e293b", padding: "30px 46px",
        marginLeft: `-${padH}px`, marginRight: `-${padH}px`,
        marginTop: `-${padVe}px`, marginBottom: 22,
      }}>
        <div style={tx(26, "#f8fafc", { fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1.1 })}>{pi.name || "Your Name"}</div>
        <div style={tx(9, "#94a3b8", { marginTop: 5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" })}>{pi.headline || "Your Headline"}</div>
        <div style={{ height: 1.5, backgroundColor: ac, width: 40, marginTop: 10, marginBottom: 8 }} />
        <div style={tx(8.5, "#94a3b8")}>{contact}</div>
        {links.length > 0 && <div style={tx(8, "#64748b", { marginTop: 3 })}>{links.join("  ·  ")}</div>}
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, height: "100%", boxSizing: "border-box", overflow: "hidden" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── PRESTIGE ── */
  if (templateId === "prestige") {
    const header = (
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={tx(24, "#111827", { fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.2 })}>{pi.name || "Your Name"}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "8px 0" }}>
          <div style={{ height: 1, backgroundColor: "#d1d5db", width: 60 }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: ac }} />
          <div style={{ height: 1, backgroundColor: "#d1d5db", width: 60 }} />
        </div>
        <div style={tx(9, "#4b5563", { fontWeight: 500, fontStyle: "italic" })}>{pi.headline || "Your Headline"}</div>
        <div style={tx(8.5, "#6b7280", { marginTop: 5 })}>{contact}</div>
        <LinksRow size={8} color="#9ca3af" />
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH_LINE, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, height: "100%", boxSizing: "border-box" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── ATS CLEAN ── */
  if (templateId === "ats_clean") {
    const header = (
      <div style={{ marginBottom: 12, borderBottom: "1px solid #111827", paddingBottom: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: "0.02em" }}>{pi.name || "Your Name"}</div>
        <div style={{ fontSize: 10, color: "#374151", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{pi.headline}</div>
        <div style={{ fontSize: 9, color: "#374151", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{contact}</div>
        {links.length > 0 && <div style={{ fontSize: 9, color: "#374151", fontFamily: "Arial, sans-serif", marginTop: 2 }}>{links.join("  |  ")}</div>}
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH_PLAIN, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, fontFamily: "Arial, sans-serif", height: "100%", boxSizing: "border-box" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── ATS MINIMAL ── */
  if (templateId === "ats_minimal") {
    const header = (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", fontFamily: "Calibri, Arial, sans-serif" }}>{pi.name || "Your Name"}</div>
        <div style={{ fontSize: 10, color: "#374151", fontFamily: "Calibri, Arial, sans-serif", marginTop: 3 }}>{pi.headline}</div>
        <div style={{ fontSize: 9.5, color: "#6b7280", fontFamily: "Calibri, Arial, sans-serif", marginTop: 4 }}>{contact}{links.length > 0 ? "  |  " + links.join("  |  ") : ""}</div>
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH_MINIMAL, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, fontFamily: "Calibri, Arial, sans-serif", height: "100%", boxSizing: "border-box" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── TECHPRO ── */
  if (templateId === "techpro") {
    const header = (
      <div style={{ marginBottom: 14 }}>
        <div style={tx(24, "#0f172a", { fontWeight: 800, letterSpacing: "0.01em", lineHeight: 1.1 })}>{pi.name || "Your Name"}</div>
        <div style={tx(10, ac, { marginTop: 4, fontWeight: 600 })}>{pi.headline || "Software Engineer"}</div>
        <div style={{ height: 1, backgroundColor: "#e2e8f0", margin: "8px 0" }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
          <span style={tx(8.5, "#64748b")}>{contact}</span>
          {links.map((l, i) => <span key={i} style={tx(8.5, ac)}>{l}</span>)}
        </div>
      </div>
    );
    return {
      header,
      sections: buildGranularSections(ctx, SH_TECH, sectionOrder, data),
      pageWrap: (children) => (
        <div style={{ backgroundColor: "#ffffff", colorScheme: "light" as any, height: "100%", boxSizing: "border-box", borderTop: `3px solid ${ac}`, padding: pagePad, paddingTop: "28px" }}>
          {children}
        </div>
      ),
    };
  }

  /* ── FAANG ELITE ── */
  if (templateId === "faang") {
    const faangExpRenderer = (exp: any, i: number, isFirst: boolean) => (
      <div style={{ marginTop: isFirst ? 0 : 14, marginBottom: i === (data.experience?.length ?? 1) - 1 ? sg : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={tx(fs, "#111827", { fontWeight: 700 })}>{exp.company}</span>
          <span style={tx(8.5, "#6b7280", { whiteSpace: "nowrap" })}>{exp.period}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={tx(fs - 0.5, "#374151", { fontStyle: "italic" })}>{exp.role}</span>
          {exp.location && <span style={tx(8.5, "#9ca3af")}>{exp.location}</span>}
        </div>
        <ul style={{ margin: "4px 0 0", paddingLeft: 16, listStyle: "disc" }}>{bul(exp.bullets)}</ul>
      </div>
    );

    const header = (
      <div style={{ marginBottom: 14, borderBottom: "1.5px solid #111827", paddingBottom: 10 }}>
        <div style={tx(22, "#111827", { fontWeight: 700, lineHeight: 1.15 })}>{pi.name || "Your Name"}</div>
        <div style={tx(9.5, "#374151", { marginTop: 3 })}>{pi.headline}</div>
        <div style={tx(8.5, "#6b7280", { marginTop: 4 })}>{contact}{links.length > 0 ? "  |  " + links.join("  |  ") : ""}</div>
      </div>
    );

    return {
      header,
      sections: buildGranularSections(ctx, SH_PLAIN, sectionOrder, data, faangExpRenderer),
      pageWrap: (children) => (
        <div style={{ padding: pagePad, backgroundColor: "#ffffff", colorScheme: "light" as any, fontFamily: ff, height: "100%", boxSizing: "border-box" }}>
          {children}
        </div>
      ),
    };
  }

  /* Fallback */
  return {
    header: null,
    sections: buildGranularSections(ctx, SH, sectionOrder, data),
    pageWrap: (children) => (
      <div style={{ padding: pagePad, backgroundColor: "#ffffff", height: "100%", boxSizing: "border-box" }}>
        {children}
      </div>
    ),
  };
}

/* ================================================================
   LEGACY renderPreview (kept for backward-compat)
================================================================ */
export function renderPreview(templateId: TemplateId, ctx: StyleCtx): React.ReactNode {
  const sections = renderPreviewSections(templateId, ctx);
  return sections.pageWrap(
    <>
      {sections.header}
      {sections.sections.map(s => <React.Fragment key={s.key}>{s.node}</React.Fragment>)}
    </>,
    0, 1
  );
}

/* ================================================================
   PRINT HTML BUILDER (unchanged)
================================================================ */
export function buildPrintHTML(templateId: TemplateId, ctx: PrintCtx): string {
  const { ff, ac, fs, lh, sg, pagePad, data, sectionOrder, fontUrl, paperSize } = ctx;
  const pi = data.personalInfo || {};

  const padParts = pagePad.split(" ");
  const padV = padParts[0] || "48px";
  const padH = padParts[1] || "52px";

  const fontLink = fontUrl
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
       <link rel="stylesheet" href="${fontUrl}&display=block">`
    : "";

  const pageCSS = paperSize === "letter"
  ? `size: letter portrait; margin: ${padV} ${padH};`
  : `size: A4 portrait; margin: ${padV} ${padH};`;

  const paperPx = paperSize === "letter" ? 816 : 794;

  const links = linkLine(pi);
  const contact = contactLine(pi);
  const linksHtml = links.length > 0
    ? `<div class="r-links">${links.join("  ·  ")}</div>` : "";

  const bul = (arr: any): string =>
    (Array.isArray(arr) ? arr : [arr])
      .filter(Boolean)
      .map((b: string) => `<li class="r-bullet">${b}</li>`)
      .join("");

  const sh = (title: string) =>
    `<div class="r-sh-wrap"><div class="r-sh">${title}</div><div class="r-sh-line"></div></div>`;
  const shLine = (title: string) =>
    `<div class="r-shl-wrap"><div class="r-shl">${title}</div><div class="r-shl-hr"></div></div>`;
  const shFlush = (title: string) =>
    `<div class="r-shf">${title}</div>`;
  const shPlain = (title: string) =>
    `<div class="r-shp-wrap"><div class="r-shp">${title}</div><div class="r-shp-line"></div></div>`;
  const shMinimal = (title: string) =>
    `<div class="r-shm-wrap"><div class="r-shm">${title}</div><div class="r-shm-line"></div></div>`;
  const shTech = (title: string) =>
    `<div class="r-sht-wrap"><div class="r-sht">${title}</div><div class="r-sht-line"></div></div>`;

  const SEC = {
    summary: (SHfn: (t: string) => string = sh) =>
      data.summary
        ? `<div class="r-sec">${SHfn("Professional Summary")}<div class="r-body r-justify">${data.summary}</div></div>` : "",

    skills: (SHfn = sh) =>
      (data.skillCategories?.length ?? 0) > 0
        ? `<div class="r-sec">${SHfn("Technical Skills")}${(data.skillCategories || []).map((c: any) =>
            `<div class="r-skill-row"><span class="r-bold">${c.name}:</span> <span class="r-body">${c.skills}</span></div>`
          ).join("")}</div>` : "",

    experience: (SHfn = sh) =>
      (data.experience?.length ?? 0) > 0
        ? `<div class="r-sec">${SHfn("Work Experience")}${(data.experience || []).map((e: any, i: number) =>
            `<div class="${i ? "r-entry-gap" : ""}">
              <div class="r-row"><span class="r-bold">${e.company || ""}${e.role ? `  -  ${e.role}` : ""}</span><span class="r-meta">${e.period ?? ""}</span></div>
              ${e.location ? `<div class="r-location">${e.location}</div>` : ""}
              <ul class="r-list">${bul(e.bullets)}</ul>
            </div>`
          ).join("")}</div>` : "",

    experience_faang: (SHfn = shPlain) =>
      (data.experience?.length ?? 0) > 0
        ? `<div class="r-sec">${SHfn("Experience")}${(data.experience || []).map((e: any, i: number) =>
            `<div class="${i ? "r-entry-gap" : ""}">
              <div class="r-row"><span class="r-bold">${e.company || ""}</span><span class="r-meta">${e.period ?? ""}</span></div>
              <div class="r-row"><span class="r-italic r-dim">${e.role || ""}</span>${e.location ? `<span class="r-meta">${e.location}</span>` : ""}</div>
              <ul class="r-list">${bul(e.bullets)}</ul>
            </div>`
          ).join("")}</div>` : "",

    projects: (SHfn = sh) =>
      (data.projects?.length ?? 0) > 0
        ? `<div class="r-sec">${SHfn("Projects")}${(data.projects || []).map((p: any, i: number) =>
            `<div class="${i ? "r-proj-gap" : ""}">
              <div class="r-row"><span class="r-bold r-accent">${p.title || p.name || ""}</span>${p.period ? `<span class="r-meta">${p.period}</span>` : ""}</div>
              ${p.tech ? `<div class="r-tech">${p.tech}</div>` : ""}
              ${(p.bullets?.length ?? 0) > 0 ? `<ul class="r-list">${bul(p.bullets)}</ul>` : ""}
            </div>`
          ).join("")}</div>` : "",

    education: (SHfn = sh) =>
      (data.education?.length ?? 0) > 0
        ? `<div class="r-sec">${SHfn("Education")}${(data.education || []).map((e: any, i: number) =>
            `<div class="r-row ${i ? "r-edu-gap" : ""}">
              <div><div class="r-bold">${e.school || e.institution || ""}</div><div class="r-body r-sm">${e.degree ?? ""}${e.gpa ? `  -  GPA: ${e.gpa}` : ""}</div></div>
              <span class="r-meta">${e.period || e.year || ""}</span>
            </div>`
          ).join("")}</div>` : "",

    certifications: (SHfn = sh) => {
      const valid = (data.certifications || []).filter((c: any) =>
        typeof c === "string" ? c.trim() : c?.name?.trim()
      );
      return valid.length > 0
        ? `<div class="r-sec">${SHfn("Certifications")}<ul class="r-list r-cert-list">${valid.map((c: any) =>
            `<li class="r-bullet">${typeof c === "string" ? c : `${c.name ?? ""}${c.issuer ? `  -  ${c.issuer}` : ""}${c.year ? ` (${c.year})` : ""}`}</li>`
          ).join("")}</ul></div>` : "";
    },
  };

  const ordered = (SHfn: any = sh) =>
    sectionOrder.map(id => (SEC as any)[id]?.(SHfn) || "").join("");

  const css = `
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    html, body { margin: 0; padding: 0; background: #ffffff !important; color-scheme: light only; }
    body { width: ${paperPx}px; font-family: ${ff}; font-size: ${fs}px; line-height: ${lh}; color: #111827; }

    .r-name-xl   { font-size:26px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;line-height:1.1;color:#0f172a }
    .r-name-2xl  { font-size:30px;font-weight:200;text-transform:uppercase;letter-spacing:0.06em;line-height:1.1;color:#0f172a }
    .r-name-lg   { font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;line-height:1.2;color:#111827 }
    .r-name-md   { font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;line-height:1.1;color:#0f172a }
    .r-name-wh   { font-size:26px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;line-height:1.1;color:#ffffff }
    .r-name-wh-lg{ font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;line-height:1.1;color:#ffffff }
    .r-name-dark { font-size:26px;font-weight:800;letter-spacing:0.02em;line-height:1.1;color:#f8fafc }
    .r-name-ac   { font-size:26px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;line-height:1.1;color:${ac} }
    .r-name-plain{ font-size:22px;font-weight:700;color:#111827;font-family:Arial,sans-serif }
    .r-name-faang{ font-size:22px;font-weight:700;line-height:1.15;color:#111827 }
    .r-name-tech { font-size:24px;font-weight:800;letter-spacing:0.01em;line-height:1.1;color:#0f172a }

    .r-headline     { font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;margin-top:5px }
    .r-headline-ac  { font-size:9.5px;font-weight:600;letter-spacing:0.06em;color:${ac};margin-top:5px }
    .r-headline-wh  { font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#ffffff;margin-top:5px }
    .r-headline-it  { font-size:9px;font-weight:500;font-style:italic;color:#4b5563 }
    .r-headline-sub { font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#475569;margin-top:5px }
    .r-headline-gr  { font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-top:5px }
    .r-headline-ac2 { font-size:8.5px;font-weight:600;color:${ac};margin-top:3px }
    .r-headline-plain{ font-size:10px;color:#374151;margin-top:4px;font-family:Arial,sans-serif }
    .r-headline-tech{ font-size:10px;font-weight:600;color:${ac};margin-top:4px }
    .r-headline-faang{ font-size:9.5px;color:#374151;margin-top:3px }

    .r-contact   { font-size:8.5px;color:#6b7280;margin-top:5px }
    .r-links     { font-size:8px;color:#9ca3af;margin-top:3px }
    .r-contact-wh{ font-size:8.5px;color:#ffffff;margin-top:6px }
    .r-links-wh  { font-size:8px;color:#ffffff;margin-top:3px }
    .r-contact-gr{ font-size:8.5px;color:#94a3b8 }
    .r-links-gr  { font-size:8px;color:#64748b;margin-top:3px }
    .r-contact-plain{ font-size:9px;color:#374151;margin-top:4px;font-family:Arial,sans-serif }
    .r-links-plain{ font-size:9px;color:#374151;margin-top:2px;font-family:Arial,sans-serif }
    .r-contact-faang{ font-size:8.5px;color:#6b7280;margin-top:4px }
    .r-links-bar { font-size:8px;color:#6b7280;margin-top:2px }

    .r-sh-wrap  { margin-bottom:6px }
    .r-sh       { font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:${ac};margin-bottom:3px }
    .r-sh-line  { height:1px;background:${ac};width:100% }

    .r-shl-wrap { margin-bottom:5px;display:flex;align-items:center;gap:10px }
    .r-shl      { font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:${ac};white-space:nowrap }
    .r-shl-hr   { flex:1;height:1px;background:#d1d5db }

    .r-shf      { font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.14em;color:${ac};border-bottom:1px solid ${ac};padding-bottom:2px;margin-bottom:5px }

    .r-shp-wrap { margin-bottom:6px }
    .r-shp      { font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#111827;margin-bottom:3px;font-family:Arial,sans-serif }
    .r-shp-line { height:1px;background:#111827;width:100% }

    .r-shm-wrap { margin-bottom:5px }
    .r-shm      { font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#374151;margin-bottom:3px }
    .r-shm-line { height:0.5px;background:#374151;width:100% }

    .r-sht-wrap { margin-bottom:6px }
    .r-sht      { font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:${ac};margin-bottom:3px }
    .r-sht-line { height:1px;background:#e2e8f0;width:100% }

    .r-sec       { margin-bottom:${sg}px }
    .r-body      { font-size:${fs}px;color:#1f2937;line-height:${lh} }
    .r-justify   { text-align:justify }
    .r-sm        { font-size:${fs - 0.5}px;color:#374151;margin-top:2px }
    .r-bold      { font-weight:700;color:#111827 }
    .r-accent    { color:${ac} }
    .r-meta      { font-size:8.5px;color:#6b7280;white-space:nowrap;margin-left:10px }
    .r-location  { font-size:8.5px;color:#9ca3af;font-style:italic;margin-top:1px;margin-bottom:3px }
    .r-tech      { font-size:8.5px;color:#6b7280;font-style:italic;margin-top:1px;margin-bottom:3px }
    .r-italic    { font-style:italic }
    .r-dim       { color:#374151 }

    .r-row       { display:flex;justify-content:space-between;align-items:baseline }
    .r-list      { margin:4px 0 0;padding-left:16px;list-style:disc }
    .r-cert-list { margin-top:5px }
    .r-bullet    { font-size:${fs}px;color:#374151;line-height:${lh};margin-bottom:2px;display:list-item }
    .r-skill-row { margin-top:3px }
    .r-skill-row:first-of-type { margin-top:0 }
    .r-entry-gap { margin-top:12px }
    .r-proj-gap  { margin-top:10px }
    .r-edu-gap   { margin-top:10px }

    .r-center    { text-align:center }
    .r-pad       { padding:${padV} ${padH} }
    .r-pad-bold  { padding:22px 46px }
    .r-pad-exec  { padding:22px 46px }
    .r-pad-comp  { padding:24px 34px }
    .r-pad-ats   { padding:${padV} ${padH};font-family:Arial,sans-serif }

    .r-header-bar  { padding-bottom:12px;margin-bottom:4px }
    .r-divider-top { height:2px;background:${ac};margin-bottom:2px }
    .r-divider-bot { height:1px;background:${ac};margin-bottom:16px }
    .r-divider-hz  { height:1px;background:#e2e8f0;margin:10px 0 }
    .r-divider-sl  { height:1px;background:#cbd5e1;margin:10px 0 }
    .r-divider-plain{ height:1px;background:#111827;margin-bottom:10px;margin-top:0 }

    .r-hdr-ac    { background:${ac};padding:26px 34px 22px }
    .r-hdr-bold  { background:${ac};padding:34px 46px 30px;text-align:center }
    .r-hdr-exec  { background:#1e293b;padding:30px 46px }
    .r-hdr-tech  { border-top:3px solid ${ac};padding:${padV} ${padH};padding-top:28px }
    .r-hdr-ac-line { height:1.5px;background:${ac};width:40px;margin:10px 0 8px }
    .r-hdr-wh-line { height:1px;background:rgba(255,255,255,0.4);width:60px;margin:10px auto 0 }

    .r-2col      { display:flex }
    .r-2col-left { width:34%;padding:20px 16px 20px 24px;background:#f8fafc;border-right:1px solid #e2e8f0 }
    .r-2col-right{ width:66%;padding:20px 24px 20px 20px }

    .r-sidebar      { display:flex;min-height:100% }
    .r-sidebar-bar  { width:5px;background:${ac};flex-shrink:0 }
    .r-sidebar-body { flex:1;padding:${padV} ${padH} }
    .r-sidebar-hdr  { margin-bottom:16px;padding-left:4px }

    .r-dot-row  { display:flex;align-items:center;justify-content:center;gap:8px;margin:8px 0 }
    .r-dot-line { height:1px;background:#d1d5db;width:60px }
    .r-dot      { width:4px;height:4px;border-radius:50%;background:${ac} }

    .r-comp-hdr     { display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5px solid ${ac};padding-bottom:8px;margin-bottom:10px }
    .r-comp-contact { text-align:right }
    .r-comp-email   { font-size:8px;color:#4b5563 }
    .r-comp-link    { font-size:7.5px;color:#9ca3af }

    .r-faang-hdr    { border-bottom:1.5px solid #111827;padding-bottom:10px;margin-bottom:14px }
    .r-tech-contact { display:flex;gap:16px;flex-wrap:wrap }
    .r-tech-lnk     { font-size:8.5px;color:${ac} }

    @page { ${pageCSS} }
    @media print {
      html, body { width:100% !important;background:#ffffff !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important }
      * { -webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important }
    }
  `;

  const shell = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${paperPx}">
<meta name="color-scheme" content="light only">
<title>Resume</title>
${fontLink}
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;

  if (templateId === "cornerstone") {
    return shell(`<div class="r-pad"><div class="r-center r-header-bar">
      <div class="r-name-xl">${pi.name ?? ""}</div>
      <div class="r-headline">${pi.headline ?? ""}</div>
      <div class="r-contact">${contact}</div>${linksHtml}
    </div>
    <div class="r-divider-top"></div><div class="r-divider-bot"></div>
    ${ordered(sh)}</div>`);
  }

  if (templateId === "meridian") {
    return shell(`<div class="r-pad">
      <div style="margin-bottom:18px">
        <div class="r-name-2xl">${pi.name ?? ""}</div>
        <div class="r-headline-ac">${pi.headline ?? ""}</div>
        <div class="r-divider-hz"></div>
        <div class="r-contact" style="margin-top:0">${contact}${links.length > 0 ? `  ·  ${links[0]}` : ""}</div>
      </div>${ordered(shLine)}</div>`);
  }

  if (templateId === "dualaxis") {
    const leftIds = ["skills", "education", "certifications"];
    const rightIds = sectionOrder.filter(s => !leftIds.includes(s));
    return shell(`
      <div class="r-hdr-ac">
        <div class="r-name-wh">${pi.name ?? ""}</div>
        <div class="r-headline-wh">${pi.headline ?? ""}</div>
        <div class="r-contact-wh">${contact}</div>
        ${links.length > 0 ? `<div class="r-links-wh">${links.join("  ·  ")}</div>` : ""}
      </div>
      <div class="r-2col">
        <div class="r-2col-left">${leftIds.map(id => (SEC as any)[id]?.(shFlush) || "").join("")}</div>
        <div class="r-2col-right">${rightIds.map(id => (SEC as any)[id]?.(sh) || "").join("")}</div>
      </div>`);
  }

  if (templateId === "apex") {
    return shell(`
      <div class="r-hdr-bold">
        <div class="r-name-wh-lg">${pi.name ?? ""}</div>
        <div class="r-hdr-wh-line"></div>
        <div class="r-headline-wh" style="margin-top:8px">${pi.headline ?? ""}</div>
        <div class="r-contact-wh">${contact}</div>
        ${links.length > 0 ? `<div class="r-links-wh">${links.join("  |  ")}</div>` : ""}
      </div>
      <div class="r-pad-bold">${ordered(sh)}</div>`);
  }

  if (templateId === "density") {
    return shell(`<div class="r-pad-comp">
      <div class="r-comp-hdr">
        <div><div class="r-name-md">${pi.name ?? ""}</div><div class="r-headline-ac2">${pi.headline ?? ""}</div></div>
        <div class="r-comp-contact">
          <div class="r-comp-email">${pi.email ?? ""}</div>
          <div class="r-comp-email">${pi.phone ?? ""}${pi.location ? `  ·  ${pi.location}` : ""}</div>
          ${links.length > 0 ? `<div class="r-comp-link">${links[0]}</div>` : ""}
        </div>
      </div>${ordered(shFlush)}</div>`);
  }

  if (templateId === "pillar") {
    return shell(`<div class="r-sidebar">
      <div class="r-sidebar-bar"></div>
      <div class="r-sidebar-body">
        <div class="r-sidebar-hdr">
          <div class="r-name-ac">${pi.name ?? ""}</div>
          <div class="r-headline-sub">${pi.headline ?? ""}</div>
          <div class="r-divider-sl"></div>
          <div class="r-contact" style="margin-top:0">${contact}</div>${linksHtml}
        </div>${ordered(sh)}
      </div></div>`);
  }

  if (templateId === "executive") {
    return shell(`
      <div class="r-hdr-exec">
        <div class="r-name-dark">${pi.name ?? ""}</div>
        <div class="r-headline-gr">${pi.headline ?? ""}</div>
        <div class="r-hdr-ac-line"></div>
        <div class="r-contact-gr">${contact}</div>
        ${links.length > 0 ? `<div class="r-links-gr">${links.join("  ·  ")}</div>` : ""}
      </div>
      <div class="r-pad-exec">${ordered(sh)}</div>`);
  }

  if (templateId === "prestige") {
    return shell(`<div class="r-pad">
      <div class="r-center" style="margin-bottom:18px">
        <div class="r-name-lg">${pi.name ?? ""}</div>
        <div class="r-dot-row"><div class="r-dot-line"></div><div class="r-dot"></div><div class="r-dot-line"></div></div>
        <div class="r-headline-it">${pi.headline ?? ""}</div>
        <div class="r-contact">${contact}</div>${linksHtml}
      </div>${ordered(shLine)}</div>`);
  }

  if (templateId === "ats_clean") {
    return shell(`<div class="r-pad-ats">
      <div style="border-bottom:1px solid #111827;padding-bottom:10px;margin-bottom:12px">
        <div class="r-name-plain">${pi.name ?? ""}</div>
        <div class="r-headline-plain">${pi.headline ?? ""}</div>
        <div class="r-contact-plain">${contact}</div>
        ${links.length > 0 ? `<div class="r-links-plain">${links.join("  |  ")}</div>` : ""}
      </div>${ordered(shPlain)}</div>`);
  }

  if (templateId === "ats_minimal") {
    return shell(`<div class="r-pad">
      <div style="margin-bottom:14px">
        <div style="font-size:22px;font-weight:700;color:#111827">${pi.name ?? ""}</div>
        <div style="font-size:10px;color:#374151;margin-top:3px">${pi.headline ?? ""}</div>
        <div style="font-size:9.5px;color:#6b7280;margin-top:4px">${contact}${links.length > 0 ? "  |  " + links.join("  |  ") : ""}</div>
      </div>${ordered(shMinimal)}</div>`);
  }

  if (templateId === "techpro") {
    return shell(`<div class="r-hdr-tech">
      <div style="margin-bottom:14px">
        <div class="r-name-tech">${pi.name ?? ""}</div>
        <div class="r-headline-tech">${pi.headline ?? ""}</div>
        <div class="r-divider-hz"></div>
        <div class="r-tech-contact">
          <span class="r-contact" style="margin-top:0">${contact}</span>
          ${links.map(l => `<span class="r-tech-lnk">${l}</span>`).join("")}
        </div>
      </div>${ordered(shTech)}</div>`);
  }

  if (templateId === "faang") {
    const faangSections = sectionOrder.map(id => {
      if (id === "experience") return (SEC as any)["experience_faang"]?.(shPlain) || "";
      return (SEC as any)[id]?.(shPlain) || "";
    }).join("");
    return shell(`<div class="r-pad">
      <div class="r-faang-hdr">
        <div class="r-name-faang">${pi.name ?? ""}</div>
        <div class="r-headline-faang">${pi.headline ?? ""}</div>
        <div class="r-contact-faang">${contact}${links.length > 0 ? "  |  " + links.join("  |  ") : ""}</div>
      </div>${faangSections}</div>`);
  }

  return shell(`<div class="r-pad">${ordered(sh)}</div>`);
}