"use client";

import { useState, useCallback, useEffect } from "react";
import Preloader from "./components/Preloader";
import PromptForm from "./components/PromptForm";
import VideoPreview from "./components/VideoPreview";
import type {
  GenerateRequest,
  GestureMode,
  CostumeVariant,
  VoicePreset,
  JobStatus,
  HistoryEntry,
} from "@/types";
import { compilePrompt } from "@/lib/promptCompiler";
import { stripAllAnnotations } from "@/lib/scriptAnnotations";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | JobStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live preview state
  const [liveScript, setLiveScript] = useState("");
  const [liveGesture, setLiveGesture] = useState<GestureMode>("A");
  const [liveCostume, setLiveCostume] = useState<CostumeVariant>("default");
  const [liveVoice, setLiveVoice] = useState<VoicePreset>("sarcastic");
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [baseImagePreview, setBaseImagePreview] = useState("");
  const [baseImageUrl, setBaseImageUrl] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("zag-history");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("zag-history", JSON.stringify(history));
    } catch {
      // Storage full or unavailable
    }
  }, [history]);

  const handleGenerate = useCallback(
    async (request: GenerateRequest) => {
      setIsGenerating(true);
      setStatus("processing");
      setVideoUrl(null);
      setError(null);

      setLiveScript(stripAllAnnotations(request.script));
      setLiveGesture(request.gestureMode);
      setLiveCostume(request.costume);
      setLiveVoice(request.voicePreset);

      const prompt = compilePrompt({
        script: request.script,
        gestureMode: request.gestureMode,
        costume: request.costume,
        mouth: request.mouth,
        bodyMovement: request.bodyMovement,
        voicePreset: request.voicePreset,
        voiceTuning: request.voiceTuning,
        customPrompts: request.customPrompts,
      });
      setCompiledPrompt(prompt);

      try {
        // Step 1: Generate audio if needed (uses pre-baked audioUrl if available)
        let audioUrl = request.audioUrl || request.uploadedAudioUrl;
        if (!audioUrl) {
          const audioRes = await fetch("/api/preview-audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ script: request.script, voicePreset: request.voicePreset, voiceTuning: request.voiceTuning }),
          });
          const audioData = await audioRes.json();
          if (!audioData.success) throw new Error(audioData.error || "Audio generation failed");
          audioUrl = audioData.audioUrl;
        }

        // Step 2: Submit video job (returns immediately)
        const submitRes = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: request.baseImageUrl,
            audioUrl,
            videoPrompt: request.videoPrompt,
            model: request.avatarModel,
            renderMode: request.renderMode,
          }),
        });
        const submitData = await submitRes.json();
        if (!submitData.success) throw new Error(submitData.error || "Failed to submit video job");

        // Step 3: Poll for completion from the browser (no server timeout)
        const { requestId, endpoint } = submitData;
        const maxPollTime = 10 * 60 * 1000; // 10 minutes
        const pollInterval = 3000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxPollTime) {
          await new Promise(r => setTimeout(r, pollInterval));

          const statusRes = await fetch("/api/video-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId, endpoint }),
          });
          const statusData = await statusRes.json();

          if (statusData.status === "done" && statusData.videoUrl) {
            const videoUrl = statusData.videoUrl;
            setStatus("done");
            setVideoUrl(videoUrl);
            setIsGenerating(false);

            setHistory((prev) => [
              {
                id: `${Date.now()}`,
                timestamp: Date.now(),
                videoUrl,
                script: request.script,
                voicePreset: request.voicePreset,
                gestureMode: request.gestureMode,
                costume: request.costume,
              },
              ...prev,
            ]);
            return;
          }

          if (statusData.status === "failed") {
            throw new Error(statusData.error || "Video generation failed");
          }
        }

        throw new Error("Video generation timed out after 10 minutes");
      } catch (err) {
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Network error");
        setIsGenerating(false);
      }
    },
    []
  );

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setStatus("done");
    setVideoUrl(entry.videoUrl);
    setLiveScript(entry.script);
    setLiveGesture(entry.gestureMode);
    setLiveCostume(entry.costume);
    setLiveVoice(entry.voicePreset);
  }, []);

  const handleImageEdited = useCallback((falUrl: string, previewUrl: string) => {
    setBaseImageUrl(falUrl);
    setBaseImagePreview(previewUrl);
  }, []);

  return (
    <>
      {!loaded && <Preloader onComplete={() => setLoaded(true)} />}
    <div className={`flex h-screen overflow-hidden bg-[var(--bg-base)] transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}>
      <PromptForm
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        onBaseImageChange={(preview) => setBaseImagePreview(preview)}
        onBaseImageUrlChange={(url) => setBaseImageUrl(url)}
        externalBaseImageUrl={baseImageUrl}
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
        baseImageUrl={baseImageUrl}
        history={history}
        onHistorySelect={handleHistorySelect}
        onImageEdited={handleImageEdited}
      />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 right-6 glass border-[var(--warning)]/15 px-5 py-4 rounded-xl text-sm shadow-2xl max-w-md animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[var(--warning)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-[family-name:var(--font-heading)] font-medium text-[var(--warning)]/80">Error</p>
              <p className="text-[11px] font-[family-name:var(--font-body)] text-[var(--text-1)]/40 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-[var(--text-1)]/15 hover:text-[var(--text-1)]/40 cursor-pointer">
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
