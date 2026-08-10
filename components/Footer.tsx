"use client";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  FaAt, FaEnvelope, FaFacebook, FaGithub, FaInstagram, FaLightbulb,
  FaBuilding, FaLinkedin, FaPaperPlane, FaRegCopyright, FaStar, FaTag, FaTwitter, FaYoutube,
} from "react-icons/fa";
import BrandIcon from "./BrandIcon";

export default function Footer({ isDark = true }) {
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!document.querySelector('link[href*="Sora"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const socialLinks = [
    { name: "Twitter",   Icon: FaTwitter,   url: "https://twitter.com" },
    { name: "Instagram", Icon: FaInstagram, url: "https://instagram.com" },
    { name: "Facebook",  Icon: FaFacebook,  url: "https://facebook.com" },
    { name: "LinkedIn",  Icon: FaLinkedin,  url: "https://linkedin.com" },
    { name: "GitHub",    Icon: FaGithub,    url: "https://github.com" },
    { name: "YouTube",   Icon: FaYoutube,   url: "https://youtube.com" },
  ];

  const footerLinks = [
    { name: "Features",     href: "/#features",     Icon: FaStar },
    { name: "How it Works", href: "/#how-it-works",  Icon: FaLightbulb },
    { name: "Pricing",      href: "/pricing",       Icon: FaTag },
    { name: "Resume Builder", href: "/resume",      Icon: FaBuilding },
    { name: "Contact",      href: "mailto:support@replysis.com", Icon: FaEnvelope },
  ];

  return (
    <footer
      className="relative bg-[#06060f] text-white py-16 border-t border-white/[0.04] overflow-hidden"
      style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
    >
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] bg-zinc-900/[0.07] rounded-full blur-[150px]" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-zinc-900/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-zinc-800/[0.03] rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(31,138,62,0.8) 1px, transparent 0)",
          backgroundSize: "40px 40px"
        }} />
      </div>

      {/* Floating orbs */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{
            opacity: 0.07,
            background: i === 0
              ? "radial-gradient(circle, rgba(31,138,62,0.4) 0%, transparent 70%)"
              : i === 1
              ? "radial-gradient(circle, rgba(33,146,74,0.4) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(46,139,69,0.3) 0%, transparent 70%)",
            left: `${i * 30}%`,
            top: "50%",
          }}
          animate={{ y: [0, -30, 0], x: [0, i % 2 === 0 ? 20 : -20, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i }}
        />
      ))}

      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="grid md:grid-cols-3 gap-12 mb-12">

          {/* Left: Logo + Brand */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col space-y-4"
          >
            <div className="flex items-center space-x-3">
              <BrandIcon size={36} className="drop-shadow-[0_6px_16px_rgba(52,224,138,0.22)]" />
              <span className="text-[15px] font-bold tracking-tight">
                Replysis <span className="text-zinc-600">AI</span>
              </span>
            </div>
            <p className="text-sm text-white/30 leading-relaxed max-w-xs">
              Empowering professionals with AI-driven interview assistance. Master every interview with confidence.
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-xs text-white/20"
            >
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-zinc-800 rounded-full" />
              <span>AI Systems Operational</span>
            </motion.div>
          </motion.div>

          {/* Center: Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col space-y-4"
          >
            <h3 className="text-sm font-semibold text-white/50 mb-2">Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              {footerLinks.map(({ name, href, Icon }, index) => (
                <motion.a
                  key={name}
                  href={href}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 5 }}
                  className="text-white/30 hover:text-zinc-600 transition-all duration-300 text-sm flex items-center gap-2 group relative"
                >
                  <motion.span whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                    <Icon className="text-xs text-zinc-800/40 group-hover:text-zinc-600 transition-colors" />
                  </motion.span>
                  <span>{name}</span>
                  <motion.div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-zinc-800 rounded-full group-hover:h-4 transition-all duration-300" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Right: Social + Newsletter */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col space-y-4"
          >
            <h3 className="text-sm font-semibold text-white/50 mb-2">Connect With Us</h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map(({ name, url, Icon }, index) => (
                <motion.a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.2, rotate: 5, y: -8 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative group"
                  title={name}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center text-white/25 hover:text-zinc-600 hover:border-zinc-800/30 hover:bg-zinc-800/[0.07] transition-all duration-300 overflow-hidden">
                    <motion.div className="absolute inset-0 bg-gradient-to-br from-zinc-900/20 to-zinc-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Icon className="text-xl relative z-10" />
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-zinc-800/15 opacity-0 group-hover:opacity-100 blur-lg -z-10 transition-opacity duration-300" />
                  <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} whileHover={{ opacity: 1 }}>
                    {[...Array(3)].map((_, i) => (
                      <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-zinc-600"
                        style={{ left: "50%", top: "50%" }}
                        animate={{ x: [0, (i - 1) * 20], y: [0, -30], opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </motion.div>
                </motion.a>
              ))}
            </div>

            {/* Newsletter */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 }} className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <motion.span className="text-zinc-600/50 text-xs" animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}><FaEnvelope /></motion.span>
                <p className="text-xs text-white/20">Stay updated with latest features</p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FaAt className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/15" />
                  <input type="email" placeholder="Enter your email"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-sm text-white/50 placeholder:text-white/15 focus:outline-none focus:border-zinc-800/40 focus:ring-1 focus:ring-zinc-800/20 transition-all" />
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold shadow-lg shadow-zinc-900/20 transition-all flex items-center gap-2">
                  <span>Subscribe</span>
                  <motion.span whileHover={{ x: 3, y: -3 }}><FaPaperPlane /></motion.span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8"
        />

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/15"
        >
          <div className="flex items-center gap-2">
            <FaRegCopyright />
            <span>{currentYear}</span>
            <motion.span whileHover={{ scale: 1.05 }} className="text-zinc-600/50 font-semibold">Replysis</motion.span>
            <span>. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Cookie Policy", href: "/cookies" },
            ].map((l, i) => (
              <motion.a key={i} href={l.href} whileHover={{ color: "#3FC97E", y: -2 }} className="transition-all">
                {l.label}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent" />

    </footer>
  );
}
