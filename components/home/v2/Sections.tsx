import React from "react";
import Link from "next/link";
import AppWindow, { SAY_TWO_SUM } from "./AppWindow";
import EditorScreen from "./EditorScreen";
import { OSDownloadButtons } from "../HeroSection";
import { PUBLIC_PLAN_CAPACITY } from "../../../data/productFacts";

type Nav = (path: string) => void;
type Download = (os: "win" | "win-direct" | "mac") => void;

/** What it does, in four plain statements. Replaces the grids of feature cards. */
export function WhatItDoes() {
  const rows: Array<[string, string]> = [
    ["It hears the question.",
      "Replysis listens to your computer's audio, so it picks up the interviewer and not you. The transcript appears as they speak."],
    ["It knows your background.",
      "Your resume and the role you are applying for shape every answer. You read it, you change what you like, and you say it in your own words."],
    ["It answers in about a second.",
      "On a normal connection the first words usually appear in under a second. On a weak one it sends only what it needs, so it stays quick."],
    ["It reads your screen.",
      "A coding problem or an error message on your screen becomes part of the question, so the answer is about what is actually in front of you."],
  ];
  return (
    <section className="hv2-section">
      <div className="hv2-wrap">
        <h2 className="hv2-serif hv2-h2">What it does, <em>plainly.</em></h2>
        <ul className="hv2-index">
          {rows.map(([head, body]) => (
            <li key={head}>
              <h3 className="hv2-serif">{head}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The screen-reading feature, with the real shape of its answer: what to say first, then the code, then the cost. */
export function ScreenReading() {
  return (
    <section className="hv2-section">
      <div className="hv2-wrap hv2-split">
        <div>
          <h2 className="hv2-serif hv2-h2">Show it the problem. <em>Get a worked answer.</em></h2>
          <p className="hv2-p">
            Ask &quot;can you solve this?&quot; and Replysis reads your screen: the statement, your code, the error. You get two things.
            First, a few sentences you can say out loud. Then the code underneath, with its time and space cost.
          </p>
          <p className="hv2-p">
            If the problem runs past the bottom of the window, it says what it still needs to see instead of guessing.
          </p>
        </div>
        <div className="hv2-stage" aria-label="Replysis answering a coding problem">
          <EditorScreen />
          <div className="hv2-overlay">
            <AppWindow say={SAY_TWO_SUM} showCode question="Can you solve this?" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PracticeWindow() {
  return (
    <div className="hv2-solo" aria-label="Replysis in practice mode">
      <div className="hv2-app">
        <div className="hv2-app-head">
          <span className="hv2-app-logo">
            <img src="/brand/replysis-icon-64.png" alt="" draggable={false} />
            Replysis AI
          </span>
          <span className="hv2-app-chip">Practice</span>
          <span className="hv2-app-chip">Recording 1:32</span>
        </div>
        <div className="hv2-app-body">
          <p className="hv2-app-label">QUESTION</p>
          <p className="hv2-app-say">Tell me about a time you disagreed with a teammate.</p>
          <p className="hv2-app-label" style={{ marginTop: "1em" }}>FEEDBACK</p>
          <p className="hv2-app-say" style={{ minHeight: 0 }}>
            Clear situation and a clear result.<br />
            Say what you did, not what the team did.<br />
            Your opening runs long. Start with the outcome.
          </p>
        </div>
        <div className="hv2-app-foot">
          <p>Next question</p>
        </div>
      </div>
    </div>
  );
}

/** Practice and the resume, side by side with what they produce. No cards. */
export function PracticeAndResume({ onNav }: { onNav: Nav }) {
  return (
    <>
      <section className="hv2-section">
        <div className="hv2-wrap hv2-split flip">
          <div>
            <h2 className="hv2-serif hv2-h2">Practice the hard questions <em>first.</em></h2>
            <p className="hv2-p">
              Generate behavioral, technical and role specific questions, answer them out loud, and get structured feedback on each
              response. Do it until the answers sound like you.
            </p>
            <button className="hv2-link" onClick={() => onNav("mock-interview")}>Open mock interview</button>
          </div>
          <PracticeWindow />
        </div>
      </section>

      <section className="hv2-section">
        <div className="hv2-wrap hv2-split">
          <div>
            <h2 className="hv2-serif hv2-h2">Build the resume <em>it answers from.</em></h2>
            <p className="hv2-p">
              Paste your experience and choose a target role. Replysis restructures your bullets and brings forward the keywords that
              role looks for. You check every line before you download it.
            </p>
            <button className="hv2-link" onClick={() => onNav("resume")}>Build my resume</button>
          </div>
          <div className="hv2-paper">
            <dl className="hv2-before-after">
              <div>
                <dt>Before</dt>
                <dd className="old">Worked on the payments API.</dd>
              </div>
              <div>
                <dt>After, for a backend role</dt>
                <dd>Rebuilt the retry logic in the payments API so failed charges recover without anyone stepping in.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}

/** The facts a careful buyer asks for, as a table of plain rows. Replaces the feature grid and the statistic cards. */
export function PlainFacts({ onNav }: { onNav: Nav }) {
  const plans = PUBLIC_PLAN_CAPACITY;
  return (
    <section className="hv2-section">
      <div className="hv2-wrap">
        <h2 className="hv2-serif hv2-h2">The details, <em>without the spin.</em></h2>
        <dl className="hv2-facts">
          <div>
            <dt>Where it runs</dt>
            <dd>Windows, from the Microsoft Store or as a signed installer, and macOS as a direct download. Updates install themselves.</dd>
          </div>
          <div>
            <dt>Works alongside</dt>
            <dd>Zoom, Google Meet, Microsoft Teams, Webex, HireVue and phone screens. It listens to your computer&apos;s audio, so compatibility depends on your device and permissions.</dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd>The first words of an answer usually appear in under a second. Your connection and the length of the question change that.</dd>
          </div>
          <div>
            <dt>Your data</dt>
            <dd>
              Raw audio is not stored. Transcripts and resume context are used to write answers, and saved sessions stay in your account
              until you delete them. The <Link href="/trust">Trust Center</Link> lists exactly what is kept.
            </dd>
          </div>
          <div>
            <dt>Plans</dt>
            <dd>
              Starter: {plans.free.summary}. Pro: {plans.pro.summary}, $34.99 a month. Max: {plans.max.summary}, $79.99 a month.{" "}
              <a href="/pricing" onClick={(e) => { e.preventDefault(); onNav("pricing"); }}>See pricing</a> for answer packs.
            </dd>
          </div>
          <div>
            <dt>What it will not do</dt>
            <dd>
              It will not invent experience you do not have. Treat every suggestion as a draft: read it, check the facts, and say it in
              your own words. Stealth coverage depends on your computer and meeting tool, so test it before the real thing and follow the
              rules of the interview you are in.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export function ClosingCta({
  mounted, detectedOS, onDownload, onNav,
}: { mounted: boolean; detectedOS: string; onDownload: Download; onNav: Nav }) {
  return (
    <section className="hv2-section hv2-end" id="download-section">
      <div className="hv2-wrap">
        <h2 className="hv2-serif hv2-h2">Try it on a practice <em>question first.</em></h2>
        <p className="hv2-p">Five free answers, no card. If it helps, keep it.</p>
        <div className="hv2-cta">
          <OSDownloadButtons detectedOS={detectedOS as never} mounted={mounted} onDownload={onDownload} size="large" />
        </div>
        <p className="hv2-fine">
          Prefer not to install anything yet? <button onClick={() => onNav("real-interview")}>Try it in your browser</button>
        </p>
      </div>
    </section>
  );
}
