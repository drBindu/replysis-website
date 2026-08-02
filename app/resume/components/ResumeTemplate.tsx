"use client";
import React, { useState, useEffect } from "react";

/**
 * ResumeTemplate  -  Legacy standalone component
 * Note: The main resume editor now uses templates.tsx via renderPreview().
 * This component is kept for backward-compatibility. It renders the "cornerstone" style by default.
 */
export default function ResumeTemplate({ data, styles }: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !data?.personalInfo) {
    return (
      <div style={{
        width: "794px", minHeight: "1123px",
        backgroundColor: "#ffffff",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#9ca3af", fontFamily: "Georgia, serif",
      }}>
        Loading…
      </div>
    );
  }

  const fontFamilyMap: Record<string, string> = {
    mono:  '"Courier New", Courier, monospace',
    sans:  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  };

  const ff = (styles?.fontFamily && fontFamilyMap[styles.fontFamily]) || fontFamilyMap.serif;
  const ac = styles?.accentColor || "#1e40af";
  const fs = Number(styles?.fontSize) || 11;
  const lh = Number(styles?.lineHeight) || 1.5;

  const t = (size = fs, color = "#111827", extra: React.CSSProperties = {}): React.CSSProperties => ({
    margin: 0, padding: 0,
    fontFamily: ff, fontSize: `${size}px`,
    color, lineHeight: lh, ...extra,
  });

  const liStyle: React.CSSProperties = {
    fontFamily: ff, fontSize: `${fs}px`,
    color: "#1f2937", lineHeight: lh + 0.1,
    marginBottom: 2, listStyleType: "disc",
    listStylePosition: "outside", display: "list-item",
  };

  const bullets = (arr: any) =>
    (Array.isArray(arr) ? arr : [arr])
      .filter(Boolean)
      .map((b: string, j: number) => <li key={j} style={liStyle}>{b}</li>);

  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: ff, fontSize: 10, fontWeight: 900,
        textTransform: "uppercase" as const, letterSpacing: "0.07em",
        color: ac, borderBottom: `1.5px solid ${ac}`,
        paddingBottom: 2, marginBottom: 4,
      }}>{title}</div>
      {children}
    </div>
  );

  const pi = data.personalInfo;

  return (
    <div
      id="resume-to-print"
      style={{
        fontFamily: ff, fontSize: `${fs}px`,
        lineHeight: lh, backgroundColor: "#ffffff",
        color: "#111827", width: "794px", minHeight: "1123px",
        padding: "48px 52px", boxSizing: "border-box",
        colorScheme: "light" as any,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: `3px solid ${ac}`, paddingBottom: 14, marginBottom: 18 }}>
        <div style={t(24, ac, { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", display: "block" })}>
          {pi.name}
        </div>
        <div style={t(9.5, "#374151", { marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block" })}>
          {pi.headline}
        </div>
        <div style={t(9.5, "#6b7280", { marginTop: 5, display: "block" })}>
          {[pi.email, pi.phone, pi.location].filter(Boolean).join("  ·  ")}
        </div>
        {(pi.linkedin || pi.github || pi.portfolio) && (
          <div style={t(8.5, "#9ca3af", { marginTop: 3, display: "block" })}>
            {[pi.linkedin, pi.github, pi.portfolio].filter(Boolean).join("  ·  ")}
          </div>
        )}
      </div>

      {data.summary && (
        <Sec title="Professional Summary">
          <div style={t(fs, "#1f2937", { textAlign: "justify", lineHeight: lh + 0.1, marginTop: 5 })}>
            {data.summary}
          </div>
        </Sec>
      )}

      {(data.skillCategories?.length ?? 0) > 0 && (
        <Sec title="Technical Skills">
          {data.skillCategories.map((cat: any, i: number) => (
            <div key={i} style={{ marginTop: i === 0 ? 5 : 3 }}>
              <span style={t(fs, "#111827", { fontWeight: 700 })}>{cat.name}: </span>
              <span style={t(fs, "#374151")}>{cat.skills}</span>
            </div>
          ))}
        </Sec>
      )}

      {(data.experience?.length ?? 0) > 0 && (
        <Sec title="Work Experience">
          {data.experience.map((exp: any, i: number) => (
            <div key={i} style={{ marginTop: i === 0 ? 5 : 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={t(fs + 0.5, "#111827", { fontWeight: 700 })}>
                  {exp.company}{exp.role ? `  -  ${exp.role}` : ""}
                </span>
                <span style={t(9, "#6b7280", { whiteSpace: "nowrap", marginLeft: 10 })}>{exp.period}</span>
              </div>
              {exp.location && (
                <div style={t(9, "#9ca3af", { fontStyle: "italic", marginTop: 1, marginBottom: 3 })}>{exp.location}</div>
              )}
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc" }}>{bullets(exp.bullets)}</ul>
            </div>
          ))}
        </Sec>
      )}

      {(data.projects?.length ?? 0) > 0 && (
        <Sec title="Projects">
          {data.projects.map((proj: any, i: number) => (
            <div key={i} style={{ marginTop: i === 0 ? 5 : 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={t(fs + 0.5, ac, { fontWeight: 700 })}>{proj.title || proj.name || "Untitled Project"}</span>
                {proj.period && <span style={t(9, "#6b7280")}>{proj.period}</span>}
              </div>
              {proj.tech && (
                <div style={t(9, "#6b7280", { fontStyle: "italic", marginTop: 1, marginBottom: 3 })}>{proj.tech}</div>
              )}
              {(proj.bullets?.length ?? 0) > 0 && (
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc" }}>{bullets(proj.bullets)}</ul>
              )}
            </div>
          ))}
        </Sec>
      )}

      {(data.education?.length ?? 0) > 0 && (
        <Sec title="Education">
          {data.education.map((edu: any, i: number) => (
            <div key={i} style={{ marginTop: i === 0 ? 5 : 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={t(fs + 0.5, "#111827", { fontWeight: 700 })}>{edu.school || edu.institution || "Unknown School"}</div>
                <div style={t(fs, "#374151", { marginTop: 2 })}>
                  {edu.degree || ""}{edu.gpa ? `  -  GPA: ${edu.gpa}` : ""}
                </div>
              </div>
              <span style={t(9, "#6b7280", { whiteSpace: "nowrap", marginLeft: 10 })}>{edu.period || edu.year || ""}</span>
            </div>
          ))}
        </Sec>
      )}

      {(data.certifications?.length ?? 0) > 0 && (
        <Sec title="Certifications">
          <ul style={{ margin: "5px 0 0", paddingLeft: 18, listStyle: "disc" }}>
            {data.certifications.map((cert: any, i: number) => (
              <li key={i} style={liStyle}>
                {typeof cert === "string"
                  ? cert
                  : `${cert.name ?? ""}${cert.issuer ? `  -  ${cert.issuer}` : ""}${cert.year ? ` (${cert.year})` : ""}`}
              </li>
            ))}
          </ul>
        </Sec>
      )}
    </div>
  );
}