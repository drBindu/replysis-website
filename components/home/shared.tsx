"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform, useSpring } from "framer-motion";

/* ─────────────────────────────────────────────────────────────
   Scroll-driven 3D motion core.
   As a block travels through the viewport its progress (0→1) drives
   a 3D tilt-up + lift + scale, tied continuously to the scroll wheel.
   ───────────────────────────────────────────────────────────── */
function useScroll3D() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  return { ref, p };
}

export function FadeUp({ children, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, p } = useScroll3D();
  const rotateX = useTransform(p, [0, 1], [18, 0]);
  const y = useTransform(p, [0, 1], [90, 0]);
  const scale = useTransform(p, [0, 1], [0.92, 1]);
  const opacity = useTransform(p, [0, 0.55], [0, 1]);
  return (
    <motion.div ref={ref} style={{ rotateX, y, scale, opacity, transformPerspective: 1000, transformStyle: "preserve-3d" }} className={className}>
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, p } = useScroll3D();
  const opacity = useTransform(p, [0, 0.6], [0, 1]);
  const y = useTransform(p, [0, 1], [40, 0]);
  return (
    <motion.div ref={ref} style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

export function SlideIn({ children, from = "left", className = "" }: { children: React.ReactNode; from?: "left" | "right"; delay?: number; className?: string }) {
  const { ref, p } = useScroll3D();
  const dir = from === "left" ? -1 : 1;
  const x = useTransform(p, [0, 1], [90 * dir, 0]);
  const rotateY = useTransform(p, [0, 1], [12 * dir, 0]);
  const opacity = useTransform(p, [0, 0.55], [0, 1]);
  return (
    <motion.div ref={ref} style={{ x, rotateY, opacity, transformPerspective: 1200, transformStyle: "preserve-3d" }} className={className}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, p } = useScroll3D();
  const scale = useTransform(p, [0, 1], [0.82, 1]);
  const rotateX = useTransform(p, [0, 1], [24, 0]);
  const opacity = useTransform(p, [0, 0.5], [0, 1]);
  return (
    <motion.div ref={ref} style={{ scale, rotateX, opacity, transformPerspective: 900, transformStyle: "preserve-3d" }} className={className}>
      {children}
    </motion.div>
  );
}

export function BlurFade({ children, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, p } = useScroll3D();
  const rotateX = useTransform(p, [0, 1], [14, 0]);
  const y = useTransform(p, [0, 1], [64, 0]);
  const opacity = useTransform(p, [0, 0.55], [0, 1]);
  const blur = useTransform(p, [0, 0.7], ["blur(9px)", "blur(0px)"]);
  return (
    <motion.div ref={ref} style={{ rotateX, y, opacity, filter: blur, transformPerspective: 1000, transformStyle: "preserve-3d" }} className={className}>
      {children}
    </motion.div>
  );
}

export function ParallaxSection({ children, speed = 0.15, className = "" }: { children: React.ReactNode; speed?: number; className?: string }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const raw = useTransform(scrollYProgress, [0, 1], [speed * 120, -speed * 120]);
  const y = useSpring(raw, { stiffness: 80, damping: 30 });
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

export function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let s = 0;
    const dur = 1800;
    const raf = (ts: number) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / dur, 1);
      setN(Math.floor((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(raf);
      else setN(to);
    };
    requestAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>;
}

export const TESTIMONIALS = [
  { name: "Aarav Mehta",  role: "SDE-2 @ Google",         initials: "AM", grad: "from-zinc-800 to-zinc-900", stars: 5, text: "Landed my Google offer after 3 weeks of practice with Replysis. Every answer used my actual resume. No generic filler. Got the offer and a 34% salary bump." },
  { name: "Priya Sharma", role: "PM @ Microsoft",          initials: "PS", grad: "from-zinc-800 to-zinc-800",   stars: 5, text: "Used the stealth overlay in my real Microsoft interview. It gave a perfect STAR answer in under 2 seconds. Got the offer the very next day. I still can't believe it." },
  { name: "Rohan Kapoor", role: "Full-Stack @ Razorpay",   initials: "RK", grad: "from-zinc-800 to-zinc-900",     stars: 5, text: "Mock mode helped me practice 40+ questions. My confidence went from 3/10 to 9/10. Got 3 job offers in 2 weeks. Absolutely worth it." },
  { name: "Sneha Iyer",   role: "Data Scientist @ Amazon", initials: "SI", grad: "from-zinc-800 to-zinc-900",  stars: 5, text: "Every answer references my real projects. Interviewers kept saying great specific example. That was Replysis. Resume-grounded answers are the standout feature." },
  { name: "Arjun Nair",   role: "ML Engineer @ Meta",      initials: "AN", grad: "from-zinc-800 to-red-500",    stars: 5, text: "Built my resume with Replysis then used mock interviews to prep. Went from 0 callbacks to 4 interviews in one week. This product is absurdly good." },
];

export const COMPANIES_ROW1 = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Uber", "LinkedIn", "Salesforce", "Adobe", "Shopify", "Spotify"];
export const COMPANIES_ROW2 = ["Flipkart", "Stripe", "Atlassian", "Razorpay", "Swiggy", "Zepto", "Zomato", "Paytm", "CRED", "Groww", "Meesho", "PhonePe"];
