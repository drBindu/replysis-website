"use client";

import React from "react";
import { OSDownloadButtons } from "../HeroSection";
import StealthScene from "./StealthScene";

export default function HeroV2({
  mounted, detectedOS, onDownload, onNav, onSignup,
}: {
  mounted: boolean;
  detectedOS: string;
  onDownload: (os: "win" | "win-direct" | "mac") => void;
  onNav: (path: string) => void;
  onSignup: () => void;
}) {
  return (
    <section className="hv2-hero">
      <div className="hv2-wrap">
        <h1 className="hv2-serif hv2-h1">
          Your interview answers.<br />
          <em>Clearly expressed.</em>
        </h1>
        <p className="hv2-lead">
          Replysis listens to the interview, reads the question, and puts an answer on your screen in about a second, built from your
          own resume. The window stays out of screen sharing on supported setups, so the call only sees you.
        </p>

        {/* Phones: Replysis runs on a laptop, so the first step here is the account, not a download. */}
        <div className="hv2-phone-cta">
          <button type="button" className="hv2-btn hv2-btn-full" onClick={onSignup}>Sign up free</button>
          <p className="hv2-fine">Use it on your laptop in your interview. 1 day free trial, 50 answers, no card.</p>
        </div>

        <div className="hv2-desktop-cta">
          <div className="hv2-cta">
            <OSDownloadButtons detectedOS={detectedOS as never} mounted={mounted} onDownload={onDownload} size="large" />
          </div>
          <p className="hv2-fine">
            1 day free trial, 50 answers, no card. <button onClick={() => onNav("real-interview")}>Or try it in your browser</button>
          </p>
        </div>
      </div>
      <div className="hv2-wide">
        <StealthScene />
      </div>
    </section>
  );
}
