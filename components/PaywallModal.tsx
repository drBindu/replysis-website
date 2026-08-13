// components/PaywallModal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Zap, Crown, X, Infinity } from "lucide-react";

interface PaywallModalProps {
  onClose: () => void;
  creditsRemaining: number;
  action: string;
  creditsNeeded: number;
}

export default function PaywallModal({ onClose, creditsRemaining, action, creditsNeeded }: PaywallModalProps) {
  const router = useRouter();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative bg-slate-950 border border-slate-800 text-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors">
            <X size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-zinc-800/10 border border-zinc-800/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={32} className="text-zinc-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Out of Credits</h2>
            <p className="text-slate-400 text-sm">
              <span className="text-white font-bold">{action}</span> requires{" "}
              <span className="text-zinc-600 font-bold">{creditsNeeded} credits</span>.
              You have <span className="text-red-400 font-bold">{creditsRemaining}</span> remaining.
            </p>
            <p className="text-slate-500 text-xs mt-2">Your 100 free credits reset at the start of next month.</p>
          </div>

          <div className="space-y-3 mb-6">
            {/* Pro */}
            <div className="bg-zinc-950/30 border border-zinc-800/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Pro <Crown size={13} className="text-zinc-600" />
                  <span className="text-zinc-600 font-black">$29.99/mo</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">5,000 credits/month — ~40 hrs live or 300+ mock sessions.</div>
              </div>
              <button
                onClick={() => router.push("/pricing")}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm font-bold transition-all"
              >
                Upgrade
              </button>
            </div>

            {/* Lifetime */}
            <div className="bg-zinc-950/20 border border-zinc-800/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Lifetime <Infinity size={13} className="text-zinc-600" />
                  <span className="text-zinc-600 font-black">$299 once</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Pay once. All Pro features forever.</div>
              </div>
              <button
                onClick={() => router.push("/pricing")}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm font-bold transition-all"
              >
                Get it
              </button>
            </div>
          </div>

          <button onClick={onClose} className="w-full py-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm text-slate-400 font-medium transition-all border border-slate-800">
            Maybe later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
