"use client";

// A tab that was opened before a website update still points at file names the
// server no longer has, so parts of the page stay blank until the visitor
// refreshes by hand. When that happens, reload once and carry on.
//
// One reload per 30 seconds at most, so a real outage can never turn into a
// reload loop.

import { useEffect } from "react";

const KEY = "replysis-stale-build-reload";
const STALE = /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module/i;

export function isStaleBuildError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null | undefined;
  return STALE.test(`${e?.name ?? ""} ${e?.message ?? ""}`);
}

export function reloadOnceForStaleBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

export default function StaleBuildReload() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isStaleBuildError(event.reason)) reloadOnceForStaleBuild();
    };
    // A <script> or <link> that fails to load does not bubble; it has to be caught while it travels down.
    const onResourceError = (event: Event) => {
      const el = event.target as (HTMLElement & { src?: string; href?: string }) | null;
      if (!el || (el.tagName !== "SCRIPT" && el.tagName !== "LINK")) return;
      if ((el.src || el.href || "").includes("/_next/static/")) reloadOnceForStaleBuild();
    };
    const onError = (event: ErrorEvent) => {
      if (isStaleBuildError(event.error ?? { message: event.message })) reloadOnceForStaleBuild();
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onResourceError, true);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onResourceError, true);
      window.removeEventListener("error", onError);
    };
  }, []);
  return null;
}
