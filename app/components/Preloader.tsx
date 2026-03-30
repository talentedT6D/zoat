"use client";

import { useState, useEffect, useCallback } from "react";

const PROFESSIONS = [
  { role: "Journalist", emoji: "📰" },
  { role: "Chef", emoji: "👨‍🍳" },
  { role: "DJ", emoji: "🎧" },
  { role: "Fan", emoji: "📣" },
  { role: "Athlete", emoji: "🏃" },
  { role: "Scientist", emoji: "🔬" },
  { role: "Artist", emoji: "🎨" },
  { role: "Pilot", emoji: "✈️" },
  { role: "Detective", emoji: "🔍" },
  { role: "Musician", emoji: "🎸" },
  { role: "Doctor", emoji: "🩺" },
  { role: "Gamer", emoji: "🎮" },
  { role: "Astronaut", emoji: "🚀" },
  { role: "Teacher", emoji: "📚" },
  { role: "Filmmaker", emoji: "🎬" },
];

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"roles" | "reveal" | "exit">("roles");
  const [textVisible, setTextVisible] = useState(true);

  const INTERVAL = 320;

  const advanceRole = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = prev + 1;
      setProgress(((next + 1) / PROFESSIONS.length) * 100);

      if (next >= PROFESSIONS.length) {
        setTimeout(() => setPhase("reveal"), 200);
        return prev;
      }

      setTextVisible(false);
      setTimeout(() => setTextVisible(true), 80);

      return next;
    });
  }, []);

  useEffect(() => {
    if (phase !== "roles") return;
    const timer = setInterval(advanceRole, INTERVAL);
    return () => clearInterval(timer);
  }, [phase, advanceRole]);

  useEffect(() => {
    if (phase === "reveal") {
      const timer = setTimeout(() => setPhase("exit"), 2200);
      return () => clearTimeout(timer);
    }
    if (phase === "exit") {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  const currentRole =
    PROFESSIONS[Math.min(currentIndex, PROFESSIONS.length - 1)];

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#08060e] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-[#9b51e0]/[0.06] rounded-full blur-[120px] animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-[#0693e3]/[0.04] rounded-full blur-[120px] animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00d084]/[0.03] rounded-full blur-[150px] animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center">
        {phase === "roles" && (
          <>
            {/* Emoji */}
            <div
              className={`text-5xl md:text-6xl mb-6 md:mb-8 transition-all duration-150 ${
                textVisible
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-75"
              }`}
            >
              {currentRole.emoji}
            </div>

            {/* "ZAG is a ___" */}
            <div className="flex flex-col md:flex-row items-center md:items-baseline gap-1 md:gap-3">
              <span className="text-[#f5f0ff]/25 text-base md:text-xl font-[family-name:var(--font-heading)] font-light tracking-wide">
                ZAG is a
              </span>
              <span
                className={`text-3xl md:text-4xl font-[family-name:var(--font-heading)] font-bold tracking-tight transition-all duration-150 ${
                  textVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                }`}
                style={{ minWidth: "180px" }}
              >
                <span className="text-brand-gradient">{currentRole.role}</span>
              </span>
            </div>
          </>
        )}

        {phase === "reveal" && (
          <div className="flex flex-col items-center preloader-reveal">
            {/* Logo mark */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#9b51e0]/20 to-[#0693e3]/10 border border-[#9b51e0]/20 flex items-center justify-center mb-8 glow-brand">
              <span className="text-3xl font-[family-name:var(--font-heading)] font-black text-brand-gradient">
                Z
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-[family-name:var(--font-heading)] font-bold text-[#f5f0ff] tracking-tight mb-3 md:mb-4 text-center px-4">
              Meet{" "}
              <span>Zag</span>
              {" "}of All Trades
            </h1>
            <p className="text-sm md:text-base text-[#f5f0ff]/30 font-[family-name:var(--font-body)] tracking-wide">
              AI Avatar Studio &middot; Must Be Nuts
            </p>
          </div>
        )}
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-[2px] bg-[#9b51e0]/[0.06]">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${phase === "reveal" ? 100 : progress}%`,
              background:
                "linear-gradient(90deg, #9b51e0, #0693e3, #00d084)",
            }}
          />
        </div>

        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2">
            {phase === "roles" && (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-[#9b51e0] animate-pulse" />
                <span className="text-[10px] text-[#f5f0ff]/20 font-[family-name:var(--font-mono)] tracking-[0.2em]">
                  LOADING
                </span>
              </>
            )}
            {phase === "reveal" && (
              <span className="text-[10px] text-[#9b51e0]/60 font-[family-name:var(--font-mono)] tracking-[0.2em]">
                READY
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#f5f0ff]/15 font-[family-name:var(--font-mono)] tabular-nums">
            {phase === "roles"
              ? `${Math.min(currentIndex + 1, PROFESSIONS.length)} / ${PROFESSIONS.length}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
