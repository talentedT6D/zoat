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

  const pollJob = useCallback((jobId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const data = await res.json();

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
    }, 2000);
  }, []);

  const handleGenerate = useCallback(
    async (request: GenerateRequest) => {
      setIsGenerating(true);
      setStatus("processing");
      setVideoUrl(null);
      setError(null);

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
    <div className={`flex h-screen overflow-hidden bg-[#08060e] transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}>
      <PromptForm
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        onBaseImageChange={setBaseImagePreview}
      />
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

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 right-6 glass border-[#ff6900]/15 px-5 py-4 rounded-xl text-sm shadow-2xl max-w-md animate-fade-in">
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
