"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Preloader from "./components/Preloader";
import PromptForm from "./components/PromptForm";
import VideoPreview from "./components/VideoPreview";
import type {
  GenerateRequest,
  GestureMode,
  CostumeVariant,
  VoicePreset,
  JobStatus,
} from "@/types";
import { compilePrompt } from "@/lib/promptCompiler";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | JobStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mobileTab, setMobileTab] = useState<"controls" | "preview">("controls");

  // Live preview state
  const [liveScript, setLiveScript] = useState("");
  const [liveGesture, setLiveGesture] = useState<GestureMode>("A");
  const [liveCostume, setLiveCostume] = useState<CostumeVariant>("default");
  const [liveVoice, setLiveVoice] = useState<VoicePreset>("sarcastic");
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [baseImagePreview, setBaseImagePreview] = useState("");

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const jobIdRef = useRef<string>("");

  const pollJob = useCallback((jobId: string) => {
    jobIdRef.current = jobId;
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${encodeURIComponent(jobIdRef.current)}`);

        if (!res.ok) {
          const text = await res.text();
          console.error("Status API error:", res.status, text);
          // Don't stop polling on transient errors
          return;
        }

        const data = await res.json();

        // Phase transition: TTS done → avatar submitted
        if (data.nextJobId) {
          jobIdRef.current = data.nextJobId;
          return; // Continue polling with new jobId
        }

        if (data.status === "done") {
          setStatus("done");
          setVideoUrl(data.videoUrl);
          setIsGenerating(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Generation failed");
          setIsGenerating(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        // Continue polling on network errors
      }
    }, 2500);
  }, []);

  const handleGenerate = useCallback(
    async (request: GenerateRequest) => {
      setIsGenerating(true);
      setStatus("processing");
      setVideoUrl(null);
      setError(null);
      setMobileTab("preview");

      setLiveScript(request.script);
      setLiveGesture(request.gestureMode);
      setLiveCostume(request.costume);
      setLiveVoice(request.voicePreset);

      const prompt = compilePrompt({
        script: request.script,
        gestureMode: request.gestureMode,
        costume: request.costume,
        mouth: request.mouth,
        voicePreset: request.voicePreset,
        voiceTuning: request.voiceTuning,
        customPrompts: request.customPrompts,
      });
      setCompiledPrompt(prompt);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (!res.ok) {
          const text = await res.text();
          setStatus("failed");
          setError(`Server error (${res.status}): ${text.slice(0, 100)}`);
          setIsGenerating(false);
          return;
        }

        const data = await res.json();

        if (!data.success) {
          setStatus("failed");
          setError(data.error || "Failed to start generation");
          setIsGenerating(false);
          return;
        }

        pollJob(data.jobId);
      } catch (err) {
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Network error");
        setIsGenerating(false);
      }
    },
    [pollJob]
  );

  return (
    <>
      {!loaded && <Preloader onComplete={() => setLoaded(true)} />}
    <div className={`flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-[#08060e] transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-[#9b51e0]/[0.08] bg-[#0a0814] shrink-0">
        <button
          onClick={() => setMobileTab("controls")}
          className={`flex-1 py-3 text-xs font-[family-name:var(--font-heading)] font-medium tracking-wide transition-colors cursor-pointer ${
            mobileTab === "controls"
              ? "text-[#b87df5] border-b-2 border-[#9b51e0]"
              : "text-[#f5f0ff]/30"
          }`}
        >
          Controls
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-3 text-xs font-[family-name:var(--font-heading)] font-medium tracking-wide transition-colors cursor-pointer relative ${
            mobileTab === "preview"
              ? "text-[#b87df5] border-b-2 border-[#9b51e0]"
              : "text-[#f5f0ff]/30"
          }`}
        >
          Preview
          {isGenerating && (
            <span className="absolute top-2.5 ml-1.5 w-1.5 h-1.5 rounded-full bg-[#ff6900] animate-pulse" />
          )}
        </button>
      </div>

      {/* Form - hidden on mobile when preview tab active */}
      <div className={`${mobileTab === "controls" ? "flex" : "hidden"} md:flex flex-col min-h-0 flex-1 md:flex-none`}>
        <PromptForm
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          onBaseImageChange={setBaseImagePreview}
        />
      </div>

      {/* Preview - hidden on mobile when controls tab active */}
      <div className={`${mobileTab === "preview" ? "flex" : "hidden"} md:flex flex-col min-h-0 flex-1`}>
        <VideoPreview
          status={status}
          videoUrl={videoUrl}
          script={liveScript}
          gestureMode={liveGesture}
          costume={liveCostume}
          voicePreset={liveVoice}
          compiledPrompt={compiledPrompt}
          baseImagePreview={baseImagePreview}
        />
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md glass border-[#ff6900]/15 px-5 py-4 rounded-xl text-sm shadow-2xl animate-fade-in z-40">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#ff6900]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-[#ff6900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-[family-name:var(--font-heading)] font-medium text-[#ff6900]/80">Error</p>
              <p className="text-[11px] font-[family-name:var(--font-body)] text-[#f5f0ff]/40 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-[#f5f0ff]/15 hover:text-[#f5f0ff]/40 cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
