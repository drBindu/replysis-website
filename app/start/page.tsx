"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Download, Globe, Laptop, Loader2, LogIn, Mail, Mic2, Smartphone } from "lucide-react";
import { useAuth } from "../../components/AuthProvider";
import { PageFooter, PageHeader } from "../../components/PageShell";
import { MAC_DOWNLOAD, WINDOWS_DIRECT_DOWNLOAD, WINDOWS_DOWNLOAD } from "../lib/downloads";
import { TRIAL_ANSWERS, TRIAL_DAYS } from "../../data/productFacts";
import "../home-v2.css";

type Device = "win" | "mac" | "phone";
type MailState = { state: "idle" | "sending" | "sent" | "error"; text?: string };

// The first stop after signing up (2026-10-22): 13 of 17 new accounts in a week never opened the app, so
// this page does one thing, getting the app onto the laptop, and then says exactly what to do first.
function detectDevice(): Device {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPod|Mobile/i.test(ua)) return "phone";
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "phone";
  if (/Mac/i.test(ua)) return "mac";
  return "win";
}

const GREEN = { background: "linear-gradient(135deg,#1C7A3E,#21924A)", boxShadow: "0 10px 28px rgba(26,102,48,0.28)" };

export default function StartPage() {
  const { user } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [started, setStarted] = useState(false);
  const [mail, setMail] = useState<MailState>({ state: "idle" });
  const [copied, setCopied] = useState(false);

  useEffect(() => { setDevice(detectDevice()); }, []);

  const download = async (os: "win" | "win-direct" | "mac") => {
    // The Store listing is a page and opens in a tab; the other two are files.
    if (os === "win") {
      window.open(WINDOWS_DOWNLOAD, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = os === "mac" ? MAC_DOWNLOAD : WINDOWS_DIRECT_DOWNLOAD;
      a.download = os === "mac" ? "InterviewCopilot-mac.dmg" : "Replysis-win-Setup.exe";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setStarted(true);
    try {
      const token = (await user?.getIdToken()) ?? "";
      await fetch("/api/telemetry/download", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ os: os === "mac" ? "mac" : "win" }),
        keepalive: true,
      });
    } catch { /* Counting a download must never affect the download itself. */ }
  };

  const emailLink = async () => {
    if (!user) return;
    setMail({ state: "sending" });
    try {
      const res = await fetch("/api/start-link", { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setMail({ state: "sent", text: `Sent to ${body.to}. Open it on your laptop.` });
      else setMail({ state: "error", text: body.error || "The email could not be sent. Please try again." });
    } catch {
      setMail({ state: "error", text: "The email could not be sent. Please try again." });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText("https://replysis.com/start");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* Clipboard blocked: the address is printed under the button. */ }
  };

  const browserHref = user ? "/real-interview" : "/?auth=signup&next=%2Freal-interview";
  const name = user?.displayName?.split(" ")[0];
  const osName = device === "mac" ? "Mac" : "Windows";

  return (
    <main className="marketing min-h-screen bg-[#f6f8f5] text-slate-900" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageHeader />

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <p className="text-sm font-bold text-[#1C7A3E]">{name ? `Welcome, ${name}` : "Welcome to Replysis"}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl" style={{ textWrap: "balance" }}>
          Your first answer in about a minute
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600">
          Replysis listens to the interview on your laptop and shows you what to say. Three steps and you are ready.
        </p>

        {device === null ? (
          <div className="mt-8 h-72 animate-pulse rounded-3xl bg-white/70" />
        ) : device === "phone" ? (
          <PhoneCard signedIn={!!user} mail={mail} onEmail={emailLink} copied={copied} onCopy={copyLink} />
        ) : (
          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#1C7A3E]">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-black">Replysis for {osName}</p>
                  <p className="text-xs text-slate-500">{device === "mac" ? "macOS 12 and above, Apple Silicon" : "Windows 10 and 11, signed by Varoxel LLC"}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => download(device === "mac" ? "mac" : "win-direct")}
                className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-black text-white transition hover:brightness-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 active:scale-[0.99]"
                style={GREEN}
              >
                <Download className="h-5 w-5" />
                {started ? "Download again" : `Download for ${osName}`}
              </button>
              {device === "win" && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Prefer the store?{" "}
                  <button type="button" onClick={() => download("win")} className="font-bold text-[#1C7A3E] underline-offset-2 hover:underline">
                    Get it from Microsoft Store
                  </button>
                </p>
              )}
              {started && (
                <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Your download has started. When it finishes, open the file from your Downloads folder to install.
                </p>
              )}
            </div>

            <ol className="grid border-t border-slate-100 bg-slate-50/60 sm:grid-cols-3">
              <Step n={1} icon={Download} title="Install"
                body={device === "mac" ? "Open the file and drag Replysis to Applications." : "Open the file. It installs and opens by itself."} />
              <Step n={2} icon={LogIn} title="Sign in"
                body={user?.email ? `Use this same account: ${user.email}` : "Use the account you just made."} />
              <Step n={3} icon={Mic2} title="Press Start"
                body={"Say “Tell me about yourself” out loud. Your answer appears in about a second."} />
            </ol>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <OptionLink href={browserHref} icon={Globe} title="Try it in your browser first"
            body="No install. Good for a quick look; the app is best for real interviews." />
          <OptionLink href="/mock-interview" icon={Mic2} title="Practice a mock interview"
            body="A spoken practice round with feedback, right here on the site." />
        </div>

        <div className="mt-8 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Your {TRIAL_DAYS} day free trial includes {TRIAL_ANSWERS} answers. No card needed.</p>
          {device !== null && device !== "phone" && (
            <p>
              On a {device === "mac" ? "Windows PC" : "Mac"}?{" "}
              <button type="button" onClick={() => download(device === "mac" ? "win-direct" : "mac")} className="font-bold text-[#1C7A3E] underline-offset-2 hover:underline">
                Download for {device === "mac" ? "Windows" : "Mac"}
              </button>
            </p>
          )}
        </div>
      </section>

      <PageFooter />
    </main>
  );
}

function Step({ n, icon: Icon, title, body }: { n: number; icon: typeof Download; title: string; body: string }) {
  return (
    <li className="flex gap-3 border-t border-slate-100 p-5 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white text-xs font-black text-[#1C7A3E] ring-1 ring-emerald-200">{n}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-black"><Icon className="h-4 w-4 text-slate-400" />{title}</span>
        <span className="mt-1 block break-words text-xs leading-5 text-slate-600">{body}</span>
      </span>
    </li>
  );
}

function OptionLink({ href, icon: Icon, title, body }: { href: string; icon: typeof Download; title: string; body: string }) {
  return (
    <Link href={href} className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm">
      <Icon className="mt-0.5 h-5 w-5 flex-none text-[#1C7A3E]" />
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{body}</span>
      </span>
      <ArrowRight className="ml-auto mt-0.5 h-4 w-4 flex-none text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#1C7A3E]" />
    </Link>
  );
}

function PhoneCard({ signedIn, mail, onEmail, copied, onCopy }: {
  signedIn: boolean; mail: MailState; onEmail: () => void; copied: boolean; onCopy: () => void;
}) {
  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#1C7A3E]">
        <Smartphone className="h-5 w-5" />
      </div>
      <p className="mt-4 text-lg font-black">Replysis runs on your laptop</p>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">
        Your interview happens on your laptop, so the app goes there. Send yourself the link and open it on your Windows PC or Mac.
      </p>

      {signedIn && (
        <button
          type="button"
          onClick={onEmail}
          disabled={mail.state === "sending" || mail.state === "sent"}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-base font-black text-white transition disabled:opacity-80 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          style={GREEN}
        >
          {mail.state === "sending" ? <Loader2 className="h-5 w-5 animate-spin" /> : mail.state === "sent" ? <Check className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
          {mail.state === "sent" ? "Link sent" : "Email me the link"}
        </button>
      )}
      <button
        type="button"
        onClick={onCopy}
        className={`${signedIn ? "mt-3 border border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "mt-6 text-white"} flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black transition`}
        style={signedIn ? undefined : GREEN}
      >
        {copied && <Check className="h-4 w-4" />}
        {copied ? "Link copied" : "Copy the link"}
      </button>
      {mail.text && (
        <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${mail.state === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"}`}>{mail.text}</p>
      )}
      <p className="mt-5 text-center text-xs text-slate-500">replysis.com/start</p>
    </div>
  );
}
