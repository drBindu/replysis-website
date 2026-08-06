"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Hero() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/interview");
  };

  return (
    <section className="relative flex flex-col items-center justify-center text-center min-h-screen text-white overflow-hidden bg-gradient-to-b from-[#0b1120] via-[#0e1625] to-[#0b0f1a]">
      {/* 🌌 Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(33,146,74,0.25)_0%,rgba(10,15,25,1)_90%)] pointer-events-none" />

      {/* ✨ Top and bottom gradient lines */}
      <div className="absolute top-0 w-full h-[2px] bg-gradient-to-r from-zinc-600 via-zinc-800 to-zinc-600 shadow-[0_0_25px_#06b6d4]" />
      <div className="absolute bottom-0 w-full h-[2px] bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600 shadow-[0_0_25px_#06b6d4]" />

      {/* 🌟 Title */}
      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-6xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-[0_0_25px_rgba(33,146,74,0.8)]"
      >
        <span className="bg-gradient-to-r from-zinc-400 via-zinc-600 to-zinc-600 bg-clip-text text-transparent">
          Welcome to CopilotX AI
        </span>
      </motion.h1>

      {/* 💬 Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="text-lg md:text-xl text-gray-200 max-w-2xl leading-relaxed mb-12"
      >
        Your all-in-one AI-powered <strong>Interview Assistant</strong> and{" "}
        <strong>Resume Builder</strong>. Practice real-time mock interviews, get instant feedback, 
        and craft professional resumes effortlessly.
      </motion.p>

      {/* 🚀 Modern Glow Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        onClick={handleClick}
        className="relative inline-flex items-center justify-center px-10 py-4 text-lg font-semibold rounded-xl
                   text-white bg-gradient-to-r from-zinc-600 via-zinc-800 to-zinc-800
                   hover:from-zinc-800 hover:to-zinc-600
                   transition-all duration-300 ease-in-out
                   shadow-[0_0_20px_rgba(33,146,74,0.8)]
                   hover:shadow-[0_0_40px_rgba(33,146,74,1)]
                   overflow-hidden group"
      >
        {/* Animated border */}
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-zinc-600 via-zinc-800 to-zinc-800 opacity-70 blur-[15px] group-hover:opacity-100 transition duration-500"></span>

        {/* Inner content */}
        <span className="relative z-10 flex items-center gap-2">
          <span className="font-bold tracking-wide">Start for Free</span>
          <motion.span
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            🚀
          </motion.span>
        </span>
      </motion.button>
    </section>
  );
}