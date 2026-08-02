// app/real-interview/_lib/formatAnswer.ts
// Formats AI answer text into readable bullet points

import React from "react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export type AnswerLine =
  | { type: "bullet"; text: string }
  | { type: "text";   text: string };

// ─────────────────────────────────────────────
// PARSE  -  converts raw answer string into lines
// ─────────────────────────────────────────────
export function parseAnswer(raw: string): AnswerLine[] {
  if (!raw?.trim()) return [];

  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map(line => {
    if (line.startsWith("•")) {
      return { type: "bullet", text: line.slice(1).trim() };
    }
    return { type: "text", text: line };
  });
}

// ─────────────────────────────────────────────
// IS MICRO  -  short answer with no bullets
// ─────────────────────────────────────────────
export function isMicroAnswer(raw: string): boolean {
  if (!raw?.trim()) return false;
  return !raw.includes("•");
}

// ─────────────────────────────────────────────
// CLEAN  -  removes markdown artifacts
// Keeps • bullets intact  -  never strips them
// ─────────────────────────────────────────────
export function cleanAnswer(raw: string): string {
  if (!raw?.trim()) return "";

  return raw
    // Remove code fences
    .replace(/```[a-z]*|```/g, "")
    // Remove bold/italic/header markers
    .replace(/(?<!\s)[*#_]{1,3}(?!\s)/g, "")
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Collapse 3+ blank lines into 2
    .replace(/\n{3,}/g, "\n\n")
    // Never strip • bullets  -  they are intentional
    .trim();
}

// ─────────────────────────────────────────────
// FORMAT FOR READING
// Ensures blank line between each bullet
// so eyes land cleanly on each point
// ─────────────────────────────────────────────
export function formatForReading(raw: string): string {
  if (!raw?.trim()) return "";

  const cleaned = cleanAnswer(raw);

  if (!cleaned.includes("•")) return cleaned;

  const lines  = cleaned.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("•")) {
      // Blank line before each bullet except the first
      if (result.length > 0) result.push("");
      result.push(trimmed);
    } else {
      result.push(trimmed);
    }
  }

  return result.join("\n").trim();
}

// ─────────────────────────────────────────────
// GET FONT SIZE  -  smaller text for long answers
// ─────────────────────────────────────────────
export function getAnswerFontSize(text: string): string {
  if (!text) return "text-xl";
  if (text.length > 600) return "text-base";
  if (text.length > 300) return "text-lg";
  return "text-xl";
}