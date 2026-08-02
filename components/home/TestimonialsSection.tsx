"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { FadeUp, BlurFade, TESTIMONIALS } from "./shared";

export default function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const featured = TESTIMONIALS[active];

  return (
    <section className="py-28 px-6 overflow-hidden bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <BlurFade className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tight">Trusted by thousands of professionals.</h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">Real people. Real prep. Real offer letters.</p>
        </BlurFade>

        {/* Auto-cycling featured */}
        <FadeUp delay={0.1} className="mb-12">
          <div className="relative max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={active}
                initial={{ opacity: 0, y: 28, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl bg-white border border-violet-100 shadow-xl shadow-2xl p-8 md:p-10">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: featured.stars }).map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-8 font-medium">&ldquo;{featured.text}&rdquo;</p>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${featured.grad} flex items-center justify-center text-white font-black text-base shadow-lg`}>{featured.initials}</div>
                  <div>
                    <p className="font-black text-gray-900">{featured.name}</p>
                    <p className="text-sm text-gray-500 font-medium">{featured.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-2 mt-5">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`rounded-full transition-all duration-300 ${i === active ? "w-6 h-2.5 bg-indigo-600" : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"}`} />
              ))}
            </div>
          </div>
        </FadeUp>

        {/* 3-card stagger grid */}
        <div ref={ref} className="grid md:grid-cols-3 gap-5 mt-8">
          {TESTIMONIALS.slice(0, 3).map((t, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, k) => (
                  <svg key={k} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">&ldquo;{t.text.slice(0, 110)}{t.text.length > 110 ? "..." : ""}&rdquo;</p>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.grad} flex items-center justify-center text-white text-xs font-black`}>{t.initials}</div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{t.name}</p>
                  <p className="text-[10px] text-gray-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
