"use client";
import React, {
  useRef, useEffect, useState, useMemo, useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { Keyboard, Pencil } from "lucide-react";
import {
  TEMPLATE_LIST,
  renderPreviewSections,
  parsePagePad,
  type TemplateId,
  type TemplateSections,
} from "./components/templates";

const T = {
  bgPanel:      "#ffffff",
  border:       "#e8e4df",
  textSecondary:"#6b6460",
  textTertiary: "#a09893",
  success:      "#15803d",
  successLight: "rgba(21,128,61,0.08)",
  shadow:       "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:     "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
};

function Tooltip({ children, tip, side = "top" }: {
  children: React.ReactNode; tip: string; side?: "top" | "bottom" | "right";
}) {
  const [show, setShow] = useState(false);
  const pos = side === "top"
    ? { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : side === "bottom"
    ? { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : { left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" };
  return (
    <div style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: "absolute", ...pos, zIndex: 9999, pointerEvents: "none",
          background: "#1a1714", color: "#fff", fontSize: 11, fontWeight: 600,
          padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap",
          boxShadow: T.shadowMd,
        }}>
          {tip}
        </div>
      )}
    </div>
  );
}

interface ResumePreviewProps {
  paper: { w: number; h: number; label: string };
  paperSize: "a4" | "letter";
  templateId: TemplateId;
  styleCtx: {
    ff: string; ac: string; fs: number; lh: number;
    sg: number; pagePad: string; data: any; sectionOrder: string[];
  };
  fontObj: { key: string; label: string; family: string; cat: string; url?: string };
  onShowShortcuts: () => void;
  onSectionClick?: (sectionKey: string) => void;
}

const PAGE_GAP = 24;

interface PagePlan {
  pageIndex: number;
  showHeader: boolean;
  sectionKeys: string[]; // may include granular keys like "experience:0"
}

function getSectionLabel(key: string): string {
  if (key === "personal") return "Edit Personal Info";
  if (key === "summary")  return "Edit Summary";
  if (key === "skills")   return "Edit Skills";
  if (key === "certifications") return "Edit Certifications";
  const [base, idx] = key.split(":");
  const names: Record<string, string> = {
    experience: "Experience", projects: "Project",
    education: "Education", skills: "Skills",
  };
  const label = names[base] || base;
  if (idx === "heading") return `Edit ${label}`;
  if (idx !== undefined) return `Edit ${label} #${parseInt(idx) + 1}`;
  return `Edit ${label}`;
}

export default function ResumePreview({
  paper, paperSize, templateId, styleCtx, fontObj, onShowShortcuts, onSectionClick,
}: ResumePreviewProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const wrapperRef       = useRef<HTMLDivElement>(null);
  const portalHostRef    = useRef<HTMLDivElement | null>(null);
  const measureRef       = useRef<HTMLDivElement>(null);
  const headerMeasureRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs      = useRef<Map<string, HTMLDivElement>>(new Map());

  const planRef = useRef<PagePlan[]>([{ pageIndex: 0, showHeader: true, sectionKeys: [] }]);
  const [plan, setPlanState] = useState<PagePlan[]>(planRef.current);

  const setPlan = (pages: PagePlan[]) => {
    planRef.current = pages;
    setPlanState(pages);
  };

  const [mounted, setMounted] = useState(false);
  const [scale, setScale]     = useState(0.75);

  useEffect(() => {
    const div = document.createElement("div");
    div.style.cssText = [
      "position:fixed", "top:0",
      `left:-${paper.w + 600}px`,
      `width:${paper.w}px`,
      "height:auto", "overflow:visible",
      "visibility:hidden", "pointer-events:none", "z-index:-9999",
    ].join(";");
    document.body.appendChild(div);
    portalHostRef.current = div;
    setMounted(true);
    return () => { document.body.removeChild(div); portalHostRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (portalHostRef.current) {
      portalHostRef.current.style.left  = `-${paper.w + 600}px`;
      portalHostRef.current.style.width = `${paper.w}px`;
    }
  }, [paper.w]);

  const tmpl: TemplateSections = useMemo(() => {
    try {
      return renderPreviewSections(templateId, styleCtx);
    } catch (e) {
      console.error("[ResumePreview] renderPreviewSections threw:", e);
      return { header: null, sections: [], pageWrap: (c) => <div>{c}</div> };
    }
  }, [templateId, styleCtx]);

  useEffect(() => {
    const calc = () => {
      if (!wrapperRef.current) return;
      const available = wrapperRef.current.getBoundingClientRect().width - 80;
      setScale(Math.min(Math.max(available / paper.w, 0.3), 1));
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [paper.w]);

  const dataSig = useMemo(() => {
    try { return JSON.stringify(styleCtx.data); } catch { return ""; }
  }, [styleCtx.data]);

  useLayoutEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const rafIds: number[] = [];

    const runPagination = () => {
      if (cancelled || !measureRef.current || !portalHostRef.current) return;

      let padV = 48;
      try { padV = parsePagePad(styleCtx.pagePad)[0]; } catch { padV = 48; }

      const pageContentH = paper.h - 2 * padV;
      if (pageContentH <= 50) return;

      const portalTop = portalHostRef.current.getBoundingClientRect().top;
      const originTop = measureRef.current.getBoundingClientRect().top;

      const headerEl = headerMeasureRef.current;
      let headerH = 0;

      if (headerEl) {
        const hRect    = headerEl.getBoundingClientRect();
        const isFullBleed = hRect.top < originTop - 2;
        headerH = isFullBleed
          ? Math.max(0, hRect.bottom - portalTop)
          : Math.max(0, hRect.bottom - originTop);
      }

      const isFullBleed = headerEl
        ? headerEl.getBoundingClientRect().top < originTop - 2
        : false;

      const usableP1   = isFullBleed
        ? Math.max(10, paper.h - headerH - padV)
        : Math.max(10, pageContentH - headerH);
      const usableRest = Math.max(10, pageContentH);

      // Collect measurements for ALL clone elements
      const rendered: { key: string; top: number; bottom: number }[] = [];
      for (const sec of tmpl.sections) {
        const el = sectionRefs.current.get(sec.key);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        rendered.push({ key: sec.key, top: r.top - originTop, bottom: r.bottom - originTop });
      }
      if (rendered.length === 0) return;

      // Build height map using actual element height + gap to next
      const sectionHeights = new Map<string, number>();
      for (let i = 0; i < rendered.length; i++) {
        const cur = rendered[i];
        const nxt = rendered[i + 1];
        const elH = cur.bottom - cur.top;
        const gap = nxt ? Math.max(0, nxt.top - cur.bottom) : 0;
        sectionHeights.set(cur.key, Math.max(0, elH + gap));
      }

      /* ── GREEDY BIN-PACK ──────────────────────────────────────────
         Key insight: sections like "experience", "projects" etc. are
         broken into sub-units in tmpl.sections:
           experience:heading  ← just the "WORK EXPERIENCE" label+line
           experience:0        ← first job entry
           experience:1        ← second job entry
           projects:heading
           projects:0
           ...
         This means the packer works at entry-level granularity.
         An entry that doesn't fit on the current page moves to the
         next  -  no more whole-section jumps creating huge gaps.

         The heading key (e.g. "experience:heading") is kept with its
         first entry by "looking ahead": if a heading fits but its
         first entry doesn't, we treat them as a unit and break both.
      ──────────────────────────────────────────────────────────── */
      const pages: PagePlan[] = [];
      let curPage: PagePlan = { pageIndex: 0, showHeader: true, sectionKeys: [] };
      let usedH = 0;

      const limit = () => curPage.pageIndex === 0 ? usableP1 : usableRest;

      const pushPage = () => {
        pages.push(curPage);
        curPage = { pageIndex: pages.length, showHeader: false, sectionKeys: [] };
        usedH = 0;
      };

      for (let i = 0; i < tmpl.sections.length; i++) {
        const sec = tmpl.sections[i];
        const h   = sectionHeights.get(sec.key) ?? 0;

        // If this is a heading key, look ahead to see if the first entry fits too.
        // If heading fits but first entry doesn't, break to next page so heading
        // isn't orphaned at the bottom alone.
        const isHeading  = sec.key.endsWith(":heading");
        const nextSec    = tmpl.sections[i + 1];
        const nextH      = nextSec ? (sectionHeights.get(nextSec.key) ?? 0) : 0;
        const orphanRisk = isHeading && nextSec && !nextSec.key.endsWith(":heading");

        if (orphanRisk) {
          // Check if heading + first entry both fit
          const bothFit  = usedH + h + nextH <= limit() + 1;
          const headFits = usedH + h          <= limit() + 1;

          if (bothFit) {
            curPage.sectionKeys.push(sec.key);
            usedH += h;
          } else if (headFits && curPage.sectionKeys.length > 0) {
            // Heading fits but first entry won't  -  break before heading
            pushPage();
            curPage.sectionKeys.push(sec.key);
            usedH += h;
          } else if (!headFits && curPage.sectionKeys.length > 0) {
            pushPage();
            curPage.sectionKeys.push(sec.key);
            usedH += h;
          } else {
            // Page is empty, just add heading regardless
            curPage.sectionKeys.push(sec.key);
            usedH += h;
          }
          continue;
        }

        // Normal section or entry
        const fits = usedH + h <= limit() + 1;
        if (fits) {
          curPage.sectionKeys.push(sec.key);
          usedH += h;
        } else {
          if (curPage.sectionKeys.length > 0) pushPage();
          curPage.sectionKeys.push(sec.key);
          usedH += h;
        }
      }

      if (curPage.sectionKeys.length > 0 || pages.length === 0) {
        pages.push(curPage);
      }

      const prev = planRef.current;
      if (prev.length === pages.length) {
        let same = true;
        for (let i = 0; i < pages.length; i++) {
          if (prev[i].showHeader !== pages[i].showHeader ||
              prev[i].sectionKeys.join(",") !== pages[i].sectionKeys.join(",")) {
            same = false; break;
          }
        }
        if (same) return;
      }
      setPlan(pages);
    };

    runPagination();
    for (let i = 1; i <= 4; i++) {
      rafIds.push(requestAnimationFrame(() => { if (!cancelled) runPagination(); }));
    }

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => { if (!cancelled) runPagination(); });
      if (headerMeasureRef.current) ro.observe(headerMeasureRef.current);
      sectionRefs.current.forEach(el => {
        try { if (el && ro) ro.observe(el); } catch {}
      });
      if (measureRef.current) ro.observe(measureRef.current);
    } catch (e) { console.error("[preview] ResizeObserver:", e); }

    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      (document as any).fonts.ready
        .then(() => { if (!cancelled) runPagination(); })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      rafIds.forEach(cancelAnimationFrame);
      ro?.disconnect();
    };
  }, [
    mounted, tmpl, paper.h,
    styleCtx.pagePad, styleCtx.fs, styleCtx.lh, styleCtx.sg, styleCtx.ff,
    dataSig,
  ]);

  const pageCount      = Math.max(1, plan.length);
  const totalUnscaledH = pageCount * paper.h + (pageCount - 1) * PAGE_GAP;

  const sectionByKey = useMemo(() => {
    const m = new Map<string, React.ReactNode>();
    for (const s of tmpl.sections) m.set(s.key, s.node);
    return m;
  }, [tmpl]);

  const measureClone = mounted && portalHostRef.current
    ? createPortal(
        <div style={{ height: "auto", overflow: "visible" }}>
          {tmpl.pageWrap(
            <div ref={measureRef}>
              <div ref={(el) => { headerMeasureRef.current = el; }}>
                {tmpl.header}
              </div>
              {tmpl.sections.map(s => (
                <div key={s.key} ref={(el) => {
                  if (el) sectionRefs.current.set(s.key, el);
                  else    sectionRefs.current.delete(s.key);
                }}>
                  {s.node}
                </div>
              ))}
            </div>,
            -1, -1
          )}
        </div>,
        portalHostRef.current
      )
    : null;

  return (
    <div ref={wrapperRef} style={{
      flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative",
      background: "#e8e5e0",
      backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
    }}>
      {measureClone}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7, padding: "5px 14px",
          borderRadius: 20, background: T.bgPanel, border: `1.5px solid ${T.border}`,
          fontSize: 11, color: T.textSecondary, fontWeight: 600, boxShadow: T.shadow,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: T.success,
            boxShadow: `0 0 0 3px ${T.successLight}`, animation: "pulse 2s infinite",
          }} />
          Live Preview
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 60 }}>
        <div style={{
          width: paper.w, height: totalUnscaledH,
          transform: `scale(${scale})`, transformOrigin: "top center",
          marginBottom: `${-totalUnscaledH * (1 - scale)}px`,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: PAGE_GAP }}>
            {plan.map(page => (
              <PageWindow key={page.pageIndex} pageWidth={paper.w} pageHeight={paper.h}>
                {tmpl.pageWrap(
                  <>
                    {page.showHeader && (
                      <EditableZone
                        sectionKey="personal"
                        hoveredKey={hoveredKey}
                        setHoveredKey={setHoveredKey}
                        onSectionClick={onSectionClick}
                      >
                        {tmpl.header}
                      </EditableZone>
                    )}
                    {page.sectionKeys.map(key => (
                      <EditableZone
                        key={key}
                        sectionKey={key}
                        hoveredKey={hoveredKey}
                        setHoveredKey={setHoveredKey}
                        onSectionClick={onSectionClick}
                      >
                        {sectionByKey.get(key)}
                      </EditableZone>
                    ))}
                  </>,
                  page.pageIndex,
                  plan.length
                )}
              </PageWindow>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        position: "sticky", bottom: 14, display: "flex", justifyContent: "flex-end",
        paddingRight: 14, zIndex: 20, pointerEvents: "none",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "6px 14px", borderRadius: 20,
          background: T.bgPanel, border: `1.5px solid ${T.border}`,
          fontSize: 10, color: T.textTertiary, fontWeight: 600,
          boxShadow: T.shadowMd, pointerEvents: "all",
        }}>
          <span>{Math.round(scale * 100)}%</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <span>{paperSize.toUpperCase()}</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <span>{pageCount === 1 ? "1 page" : `${pageCount} pages`}</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <span>{TEMPLATE_LIST.find(t => t.id === templateId)?.name}</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <span>{fontObj.label}</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <Tooltip tip="Keyboard shortcuts (⌘/)" side="top">
            <button onClick={onShowShortcuts} style={{
              display: "flex", alignItems: "center", gap: 4,
              border: "none", background: "none", cursor: "pointer",
              color: T.textTertiary, padding: 0, fontSize: 10, fontWeight: 600,
            }}>
              <Keyboard size={11} /> Shortcuts
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/* ── Enterprise editable zone with professional hover overlay ── */
interface EditableZoneProps {
  sectionKey: string;
  hoveredKey: string | null;
  setHoveredKey: (k: string | null) => void;
  onSectionClick?: (key: string) => void;
  children: React.ReactNode;
}
function EditableZone({ sectionKey, hoveredKey, setHoveredKey, onSectionClick, children }: EditableZoneProps) {
  const isHovered = hoveredKey === sectionKey && !!onSectionClick;
  return (
    <div
      onClick={() => onSectionClick?.(sectionKey)}
      onMouseEnter={() => onSectionClick && setHoveredKey(sectionKey)}
      onMouseLeave={() => setHoveredKey(null)}
      style={{
        position: "relative",
        cursor: onSectionClick ? "pointer" : "default",
        borderRadius: 4,
        transition: "box-shadow 0.18s",
        boxShadow: isHovered ? "0 0 0 2px #6366f1, 0 0 0 4px rgba(99,102,241,0.15)" : "none",
      }}
    >
      {children}
      {isHovered && (
        <div style={{
          position: "absolute", top: 4, right: 4, zIndex: 10,
          display: "flex", alignItems: "center", gap: 5,
          background: "#6366f1", color: "#fff",
          borderRadius: 6, padding: "3px 8px 3px 6px",
          fontSize: 9.5, fontWeight: 700, letterSpacing: "0.03em",
          boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          <Pencil size={9} />
          {getSectionLabel(sectionKey)}
        </div>
      )}
    </div>
  );
}

interface PageWindowProps { pageWidth: number; pageHeight: number; children: React.ReactNode; }
function PageWindow({ pageWidth, pageHeight, children }: PageWindowProps) {
  return (
    <div style={{
      width: pageWidth, height: pageHeight, overflow: "hidden",
      position: "relative", flexShrink: 0, background: "#ffffff",
      borderRadius: 2,
      boxShadow: "0 4px 24px rgba(0,0,0,0.13), 0 1.5px 6px rgba(0,0,0,0.07)",
    }}>
      {children}
    </div>
  );
}