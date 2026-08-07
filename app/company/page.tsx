"use client";

import { useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { MotionValue } from "framer-motion";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import styles from "./page.module.css";
import Scene3D from "./Scene3D";
import StoryScene3D from "./StoryScene3D";
import ProductScene3D from "./ProductScene3D";
import ClosingScene3D from "./ClosingScene3D";
import { scrollState } from "./scrollState";

const principles = [
  {
    icon: ShieldCheck,
    title: "Clear by default",
    description:
      "We make important functions and choices easy to find, easy to understand, and easy to change.",
  },
  {
    icon: Layers3,
    title: "Built for the job",
    description:
      "We focus on the work people need to complete instead of adding features for their own sake.",
  },
  {
    icon: Sparkles,
    title: "Care in the details",
    description:
      "We improve performance, reliability, and the everyday experience with every release.",
  },
];

const introText =
  "Replysis is a software company. We build focused products for people who need to make good decisions and move important work forward.";
const introWords = introText.split(" ");

function IntroWord({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = Math.min(1, start + 1.6 / total);
  const opacity = useTransform(progress, [start, end], [0.28, 1]);
  return (
    <motion.span className={styles.introWord} style={{ opacity }}>
      {word}{" "}
    </motion.span>
  );
}

function MagneticButton({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 210, damping: 18, mass: 0.4 });
  const y = useSpring(0, { stiffness: 210, damping: 18, mass: 0.4 });

  const handleMouseMove = (event: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * 0.35);
    y.set((event.clientY - (rect.top + rect.height / 2)) * 0.45);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      className={className}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.a>
  );
}

export default function CompanyPage() {
  const currentYear = new Date().getFullYear();
  const heroRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLElement>(null);
  const productRef = useRef<HTMLElement>(null);
  const principlesRef = useRef<HTMLElement>(null);
  const closingRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const { scrollYProgress: introScrollProgress } = useScroll({
    target: introRef,
    offset: ["start 0.9", "end 0.45"],
  });
  const introProgress = useSpring(introScrollProgress, { stiffness: 110, damping: 30, mass: 0.3 });
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ["start start", "end end"],
  });
  const { scrollYProgress: productScrollProgress } = useScroll({
    target: productRef,
    offset: ["start end", "end start"],
  });
  const { scrollYProgress: principlesScrollProgress } = useScroll({
    target: principlesRef,
    offset: ["start end", "end start"],
  });
  const { scrollYProgress: closingScrollProgress } = useScroll({
    target: closingRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });
  const productProgress = useSpring(productScrollProgress, { stiffness: 90, damping: 28, mass: 0.45 });
  const principlesProgress = useSpring(principlesScrollProgress, { stiffness: 90, damping: 28, mass: 0.45 });
  const closingProgress = useSpring(closingScrollProgress, { stiffness: 90, damping: 28, mass: 0.45 });
  const firstCopy = useTransform(progress, [0, 0.13, 0.24, 0.32], [1, 1, 0, 0]);
  const secondCopy = useTransform(progress, [0.34, 0.42, 0.56, 0.64], [0, 1, 1, 0]);
  const thirdCopy = useTransform(progress, [0.66, 0.74, 1], [0, 1, 1]);
  const copyY = useTransform(progress, [0, 1], [26, -26]);
  const productCardY = useTransform(productProgress, [0, 0.5, 1], [110, 0, -72]);
  const productCopyY = useTransform(productProgress, [0, 0.5, 1], [42, 0, -22]);
  const productVisualY = useTransform(productProgress, [0, 0.5, 1], [130, 0, -88]);
  const productVisualRotateX = useTransform(productProgress, [0, 0.5, 1], [16, 3, -8]);
  const productVisualRotateY = useTransform(productProgress, [0, 0.5, 1], [-20, -4, 18]);
  const productVisualScale = useTransform(productProgress, [0, 0.5, 1], [0.78, 1, 1.1]);
  const productGlowScale = useTransform(productProgress, [0, 0.5, 1], [0.7, 1.15, 1.35]);
  const productBackdropY = useTransform(productProgress, [0, 0.5, 1], [160, 0, -110]);
  const productBackdropRotate = useTransform(productProgress, [0, 1], [-10, 12]);
  const productBackdropScale = useTransform(productProgress, [0, 0.5, 1], [0.76, 1.02, 1.18]);
  const productBackdropOrbit = useTransform(productProgress, [0, 1], [-42, 254]);
  const productBackdropTrace = useTransform(productProgress, [0, 1], [-18, 112]);
  const principleOneY = useTransform(principlesProgress, [0, 0.52, 1], [122, 0, -26]);
  const principleTwoY = useTransform(principlesProgress, [0, 0.52, 1], [168, 8, -16]);
  const principleThreeY = useTransform(principlesProgress, [0, 0.52, 1], [214, 16, -6]);
  const principleOneRotate = useTransform(principlesProgress, [0, 0.52, 1], [-10, -1, 4]);
  const principleTwoRotate = useTransform(principlesProgress, [0, 0.52, 1], [8, 0, -4]);
  const principleThreeRotate = useTransform(principlesProgress, [0, 0.52, 1], [-6, 1, 5]);
  const principleOneScale = useTransform(principlesProgress, [0, 0.52, 1], [0.9, 1, 1.02]);
  const principleTwoScale = useTransform(principlesProgress, [0, 0.52, 1], [0.86, 1, 1.02]);
  const principleThreeScale = useTransform(principlesProgress, [0, 0.52, 1], [0.82, 1, 1.02]);
  const principlesBackdropY = useTransform(principlesProgress, [0, 0.5, 1], [150, 0, -90]);
  const principlesBackdropRotate = useTransform(principlesProgress, [0, 1], [10, -14]);
  const principlesBackdropScale = useTransform(principlesProgress, [0, 0.5, 1], [0.78, 1.02, 1.15]);
  const principlesBackdropOrbit = useTransform(principlesProgress, [0, 1], [35, -240]);
  const closingHaloY = useTransform(closingProgress, [0, 0.5, 1], [140, 0, -100]);
  const closingHaloScale = useTransform(closingProgress, [0, 0.5, 1], [0.72, 1, 1.24]);
  const closingHaloRotate = useTransform(closingProgress, [0, 1], [-14, 18]);
  const principleMotion = [
    { y: principleOneY, rotateY: principleOneRotate, scale: principleOneScale },
    { y: principleTwoY, rotateY: principleTwoRotate, scale: principleTwoScale },
    { y: principleThreeY, rotateY: principleThreeRotate, scale: principleThreeScale },
  ];

  // Feed scroll progress into the shared store so the WebGL scenes (rendered
  // outside Framer Motion's render tree) can react every frame without
  // triggering React re-renders.
  useMotionValueEvent(heroScrollProgress, "change", (v) => {
    scrollState.hero = v;
  });
  useMotionValueEvent(progress, "change", (v) => {
    scrollState.story = v;
  });
  useMotionValueEvent(productProgress, "change", (v) => {
    scrollState.product = v;
  });
  useMotionValueEvent(closingProgress, "change", (v) => {
    scrollState.closing = v;
  });

  return (
    <main className={styles.siteShell}>
      <div className={styles.noise} aria-hidden="true" />
      <div className={`${styles.ambient} ${styles.ambientOne}`} aria-hidden="true" />
      <div className={`${styles.ambient} ${styles.ambientTwo}`} aria-hidden="true" />

      <header className={styles.navbar}>
        <a className={styles.brand} href="/company" aria-label="Replysis home">
          VAROXEL
        </a>

        <nav className={styles.navLinks} aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#principles">Principles</a>
          <a href="/company/privacy">Privacy</a>
          <a href="/company/terms">Terms</a>
        </nav>

        <a className={styles.productLink} href="/">
          Explore Replysis <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </header>

      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroCopy}>
          <motion.div
            className={styles.eyebrow}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <span className={styles.statusDot} aria-hidden="true" />
            Replysis
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            Software built for work that <span>matters.</span>
          </motion.h1>

          <motion.p
            className={styles.heroDescription}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18, ease: "easeOut" }}
          >
            Replysis helps people prepare for interviews with focus and confidence. We build practical, privacy-first software for professionals.
          </motion.p>

          <motion.div
            className={styles.heroActions}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: "easeOut" }}
          >
            <MagneticButton href="#product" className={styles.primaryButton}>
              Meet our first product <ArrowRight size={17} aria-hidden="true" />
            </MagneticButton>
            <a className={styles.secondaryButton} href="#principles">
              How we build
            </a>
          </motion.div>

          <motion.div
            className={styles.heroNotes}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >
            <span><Check size={14} aria-hidden="true" /> Clear product choices</span>
            <span><Check size={14} aria-hidden="true" /> Careful product development</span>
          </motion.div>
        </div>

        <motion.div
          className={styles.visualColumn}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        >
          <Scene3D />
        </motion.div>
        <div className={styles.heroScrim} aria-hidden="true" />
        <div className={styles.sceneLabel}>V / 01</div>
      </section>

      <section className={styles.scrollStory} ref={storyRef}>
        <div className={styles.scrollSticky}>
          <div className={styles.storyVisual} aria-hidden="true">
            <StoryScene3D />
          </div>
          <div className={styles.storyGrid} aria-hidden="true" />
          <div className={styles.storyScrim} aria-hidden="true" />

          <div className={styles.storyTopline}>
            <span>VAROXEL / PRODUCT PRACTICE</span>
            <span>SCROLL TO CONTINUE</span>
          </div>

          <div className={styles.storyLayout}>
            <div className={styles.storyCopy}>
              <motion.div className={styles.storyCopyItem} style={{ opacity: firstCopy, y: copyY }}>
                <span>01 / Start Here</span>
                <h2>Start with the<br /><em>real work.</em></h2>
                <p>We look closely at the situation, what matters in that moment, and what would make the work easier.</p>
              </motion.div>
              <motion.div className={styles.storyCopyItem} style={{ opacity: secondCopy, y: copyY }}>
                <span>02 / Control</span>
                <h2>Give people clear<br /><em>control.</em></h2>
                <p>Settings, consent, and feedback should be straightforward, visible, and useful.</p>
              </motion.div>
              <motion.div className={styles.storyCopyItem} style={{ opacity: thirdCopy, y: copyY }}>
                <span>03 / Craft</span>
                <h2>Earn confidence<br />over <em>time.</em></h2>
                <p>A dependable product is built through steady engineering, careful releases, and attention to the details.</p>
              </motion.div>
            </div>
          </div>

          <motion.div className={styles.storyProgress} style={{ scaleX: progress }} />
        </div>
      </section>

      <section className={styles.introduction} ref={introRef}>
        <p>
          {introWords.map((word, index) => (
            <IntroWord
              key={`${word}-${index}`}
              word={word}
              index={index}
              total={introWords.length}
              progress={introProgress}
            />
          ))}
        </p>
      </section>

      <section className={styles.productSection} id="product" ref={productRef}>
        <motion.div
          className={styles.productBackdrop}
          style={{ y: productBackdropY, rotate: productBackdropRotate, scale: productBackdropScale }}
          aria-hidden="true"
        >
          <div className={styles.productBackdropGrid} />
          <motion.div className={styles.productBackdropOrbit} style={{ rotateZ: productBackdropOrbit }} />
          <motion.div className={styles.productBackdropTrace} style={{ x: productBackdropTrace }} />
          <span className={styles.productBackdropNode} />
        </motion.div>
        <motion.div
          className={styles.sectionIntro}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className={styles.sectionLabel}>Our first product</p>
          <h2>A product for a<br />specific moment.</h2>
        </motion.div>

        <motion.article
          className={styles.productCard}
          style={{ y: productCardY }}
        >
          <motion.div className={styles.productGlow} style={{ scale: productGlowScale }} aria-hidden="true" />
          <motion.div className={styles.productCopy} style={{ y: productCopyY }}>
            <div className={styles.productBadge}>Replysis</div>
            <h3>Interview preparation and support in one focused workspace.</h3>
            <p>
              Replysis brings preparation, relevant context, and real time interview tools together with straightforward settings.
            </p>
            <a className={styles.productCta} href="/">
              Explore Replysis <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </motion.div>
          <motion.div
            className={styles.productVisual}
            style={{ y: productVisualY, rotateX: productVisualRotateX, rotateY: productVisualRotateY, scale: productVisualScale }}
            aria-hidden="true"
          >
            <video
              className={styles.productVideo}
              src="/company/videos/voice-waveform.mp4"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className={styles.productGrid} />
            <div className={styles.productScene}>
              <ProductScene3D />
            </div>
            <div className={styles.productPanel}>
              <span className={styles.panelEyebrow}>COOPILOTX</span>
              <strong>Ready when<br />you are.</strong>
              <div className={styles.panelBars}>
                <i /><i /><i /><i /><i /><i />
              </div>
            </div>
          </motion.div>
        </motion.article>
      </section>

      <section className={styles.principlesSection} id="principles" ref={principlesRef}>
        <motion.div
          className={styles.principlesBackdrop}
          style={{ y: principlesBackdropY, rotate: principlesBackdropRotate, scale: principlesBackdropScale }}
          aria-hidden="true"
        >
          <div className={styles.principlesBackdropGrid} />
          <motion.div className={styles.principlesBackdropOrbit} style={{ rotateZ: principlesBackdropOrbit }} />
          <span className={`${styles.principlesBackdropNode} ${styles.principlesBackdropNodeOne}`} />
          <span className={`${styles.principlesBackdropNode} ${styles.principlesBackdropNodeTwo}`} />
        </motion.div>
        <motion.div
          className={styles.sectionIntro}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className={styles.sectionLabel}>How we build</p>
          <h2>A practical standard<br />for the work.</h2>
        </motion.div>

        <div className={styles.principlesGrid}>
          {principles.map(({ icon: Icon, title, description }, index) => (
            <motion.article
              className={styles.principleCard}
              key={title}
              style={principleMotion[index]}
            >
              <span className={styles.principleDepth} aria-hidden="true" />
              <div className={styles.principleIcon}><Icon size={22} aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p>{description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className={styles.closingSection} ref={closingRef}>
        <motion.div
          className={styles.closingBackdrop}
          style={{ y: closingHaloY, rotate: closingHaloRotate, scale: closingHaloScale }}
          aria-hidden="true"
        >
          <ClosingScene3D />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <p className={styles.sectionLabel}>Replysis</p>
          <h2>Built with care.<br />Improved with intent.</h2>
          <MagneticButton href="/" className={styles.primaryButton}>
            Explore Replysis <ArrowRight size={17} aria-hidden="true" />
          </MagneticButton>
        </motion.div>
      </section>

      <footer className={styles.footer}>
        <a className={styles.brand} href="/company" aria-label="Replysis home">
          VAROXEL
        </a>
        <p>(c) {currentYear} Replysis. All rights reserved.</p>
        <div className={styles.footerLinks}>
          <a href="/company/privacy">Privacy</a>
          <a href="/company/terms">Terms</a>
          <a href="/">Replysis product</a>
        </div>
      </footer>
    </main>
  );
}
