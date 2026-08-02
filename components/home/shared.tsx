"use client";
import { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform, useSpring } from "framer-motion";

export function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 52, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay }} className={className}>
      {children}
    </motion.div>
  );
}

export function SlideIn({ children, from = "left", delay = 0, className = "" }: { children: React.ReactNode; from?: "left" | "right"; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const x = from === "left" ? -60 : 60;
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.34, 1.56, 0.64, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

export function BlurFade({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}>
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
  { name: "Aarav Mehta",  role: "SDE-2 @ Google",         initials: "AM", grad: "from-indigo-500 to-violet-600", stars: 5, text: "Landed my Google offer after 3 weeks of practice with Verchor. Every answer used my actual resume. No generic filler. Got the offer and a 34% salary bump." },
  { name: "Priya Sharma", role: "PM @ Microsoft",          initials: "PS", grad: "from-violet-500 to-pink-500",   stars: 5, text: "Used the stealth overlay in my real Microsoft interview. It gave a perfect STAR answer in under 2 seconds. Got the offer the very next day. I still can't believe it." },
  { name: "Rohan Kapoor", role: "Full-Stack @ Razorpay",   initials: "RK", grad: "from-cyan-500 to-blue-600",     stars: 5, text: "Mock mode helped me practice 40+ questions. My confidence went from 3/10 to 9/10. Got 3 job offers in 2 weeks. Absolutely worth it." },
  { name: "Sneha Iyer",   role: "Data Scientist @ Amazon", initials: "SI", grad: "from-emerald-500 to-teal-600",  stars: 5, text: "Every answer references my real projects. Interviewers kept saying great specific example. That was Verchor. Resume-grounded answers are the standout feature." },
  { name: "Arjun Nair",   role: "ML Engineer @ Meta",      initials: "AN", grad: "from-orange-500 to-red-500",    stars: 5, text: "Built my resume with Verchor then used mock interviews to prep. Went from 0 callbacks to 4 interviews in one week. This product is absurdly good." },
];

export const COMPANIES_ROW1 = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Uber", "LinkedIn", "Salesforce", "Adobe", "Shopify", "Spotify"];
export const COMPANIES_ROW2 = ["Flipkart", "Stripe", "Atlassian", "Razorpay", "Swiggy", "Zepto", "Zomato", "Paytm", "CRED", "Groww", "Meesho", "PhonePe"];
