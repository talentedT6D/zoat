"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import type {
  GestureMode,
  CostumeVariant,
  VoicePreset,
  VoiceMode,
  MouthMechanics,
  BodyMovement,
  VoiceTuning,
  GenerateRequest,
  CustomPrompts,
  AvatarModel,
} from "@/types";
import { stripAllAnnotations, estimateDuration } from "@/lib/scriptAnnotations";
import { REGISTRY_BY_CATEGORY, REGISTRY_BY_TAG, TOOLBAR_CATEGORIES } from "@/lib/annotationRegistry";

const MODEL_OPTIONS: { id: AvatarModel; name: string; features: string; desc: string; maxSec: number }[] = [
  { id: "ai-avatar",  name: "AI Avatar",  features: "480p, high acceleration",  desc: "~30s render", maxSec: 6 },
  { id: "aurora",     name: "Aurora",     features: "Lip-sync, long audio",     desc: "~60s render", maxSec: 120 },
];

type RenderMode = "speed" | "balanced" | "quality";
const RENDER_MODES: { id: RenderMode; label: string; desc: string }[] = [
  { id: "speed",    label: "Speed",    desc: "Fastest render" },
  { id: "balanced", label: "Balanced", desc: "Good balance" },
  { id: "quality",  label: "Quality",  desc: "Best quality" },
];

const COSTUMES: { id: CostumeVariant; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "chef", label: "Chef" },
  { id: "suit", label: "Suit" },
  { id: "gym", label: "Gym" },
  { id: "streetwear", label: "Street" },
  { id: "festival", label: "Festival" },
];

const VOICE_PRESETS: { id: VoicePreset; label: string }[] = [
  { id: "sarcastic", label: "Sarcastic" },
  { id: "deadpan", label: "Deadpan" },
  { id: "hype", label: "Hype" },
  { id: "whisper", label: "Whisper" },
  { id: "aggressive", label: "Aggressive" },
];

interface PromptFormProps {
  onGenerate: (request: GenerateRequest) => void;
  isGenerating: boolean;
  onBaseImageChange?: (previewUrl: string) => void;
}

export default function PromptForm({
  onGenerate,
  isGenerating,
  onBaseImageChange,
}: PromptFormProps) {
  const [script, setScript] = useState("");
  const [gestureMode, setGestureMode] = useState<GestureMode>("A");
  const [costume, setCostume] = useState<CostumeVariant>("default");
  const [voicePreset, setVoicePreset] = useState<VoicePreset>("sarcastic");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("tts");
  const [mouth, setMouth] = useState<MouthMechanics>({ openWidth: 8, speed: 6, jawClose: 9 });
  const [voiceTuning, setVoiceTuning] = useState<VoiceTuning>({
    stability: 7, similarity: 6, speed: 1.0, pitch: 0, exaggeration: 0.3, cfg: 0.5,
  });
  const [avatarModel, setAvatarModel] = useState<AvatarModel>("aurora");
  const [renderMode, setRenderMode] = useState<RenderMode>("balanced");
  const [videoPrompt, setVideoPrompt] = useState("Black crocodile mascot character speaking directly to camera with natural hand gestures, expressive body movement, energetic delivery");
  const [negativePrompt, setNegativePrompt] = useState("blurry, deformed face, static, no movement, bad quality, distortion, low resolution, text, watermark");
  const [bodyMovement, setBodyMovement] = useState<BodyMovement>({
    neck: 3, hands: 3, body: 2,
  });

  const DEFAULT_IMAGE_URL = "https://v3b.fal.media/files/b/0a943e13/PBo3G2TETzi7_b2BUfuqS_1774873793470.png";
  const DEFAULT_IMAGE_PREVIEW = "/assets/zag_base.png";

  const [baseImageUrl, setBaseImageUrl] = useState(DEFAULT_IMAGE_URL);
  const [baseImagePreview, setBaseImagePreview] = useState(DEFAULT_IMAGE_PREVIEW);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState("");
  const [audioFileName, setAudioFileName] = useState("");
  const [uploading, setUploading] = useState<"image" | "audio" | null>(null);



  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAnnotation = useCallback((tag: string, isWrapper: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = script.slice(start, end);

    // Build tag string with default value (seconds for self-closing, dB for wrappers)
    const def = REGISTRY_BY_TAG.get(tag.toLowerCase());
    let durSuffix = "";
    if (def?.durationAllowed && def.defaultDuration != null) {
      if (isWrapper) {
        const val = def.defaultDuration;
        durSuffix = `:${val > 0 ? "+" : ""}${val}dB`;
      } else {
        durSuffix = `:${def.defaultDuration}s`;
      }
    }
    const openTag = `[${tag}${durSuffix}]`;
    const closeTag = `[/${tag}]`;

    let newText: string;
    let cursorPos: number;
    if (isWrapper && selected) {
      newText = script.slice(0, start) + openTag + selected + closeTag + script.slice(end);
      cursorPos = start + openTag.length + selected.length + closeTag.length;
    } else if (isWrapper) {
      newText = script.slice(0, start) + openTag + closeTag + script.slice(end);
      cursorPos = start + openTag.length;
    } else {
      newText = script.slice(0, start) + openTag + script.slice(end);
      cursorPos = start + openTag.length;
    }
    setScript(newText.slice(0, 5000));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(cursorPos, cursorPos); }, 0);
  }, [script]);

  const cleanLength = stripAllAnnotations(script).length;
  const hasAnnotations = cleanLength !== script.length;
  const estDuration = script.trim() ? estimateDuration(script) : 0;
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { onBaseImageChange?.(DEFAULT_IMAGE_PREVIEW); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear generated audio when voice-affecting settings change
  useEffect(() => {
    setGeneratedAudioUrl(null);
    setAudioDuration(null);
    setAudioError(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setAudioPlaying(false);
  }, [script, voicePreset, voiceTuning]);

  const uploadFile = useCallback(async (file: File, type: "image" | "audio") => {
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (type === "image") {
        setBaseImageUrl(data.url);
        const preview = URL.createObjectURL(file);
        setBaseImagePreview(preview);
        onBaseImageChange?.(preview);
      } else {
        setUploadedAudioUrl(data.url);
        setAudioFileName(file.name);
      }
    } catch (err) { console.error("Upload failed:", err); }
    finally { setUploading(null); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) uploadFile(file, "image");
  }, [uploadFile]);

  const handleSubmit = useCallback(() => {
    if (isGenerating || !baseImageUrl) return;
    if (voiceMode === "tts" && cleanLength === 0) return;
    if (voiceMode === "upload" && !uploadedAudioUrl) return;

    onGenerate({
      script: script.trim(), gestureMode, costume, mouth, bodyMovement, voicePreset, voiceTuning,
      voiceMode, baseImageUrl, avatarModel, renderMode,
      uploadedAudioUrl: voiceMode === "upload" ? uploadedAudioUrl : undefined,
      audioUrl: voiceMode === "tts" && generatedAudioUrl ? generatedAudioUrl : undefined,
      videoPrompt: videoPrompt.trim() || undefined,
      negativePrompt: negativePrompt.trim() || undefined,
    });
  }, [isGenerating, baseImageUrl, voiceMode, uploadedAudioUrl, onGenerate, script, gestureMode, costume, mouth, bodyMovement, voicePreset, voiceTuning, avatarModel, generatedAudioUrl, videoPrompt, negativePrompt]);

  const canGenerate = baseImageUrl && !isGenerating &&
    (voiceMode === "upload" ? !!uploadedAudioUrl : !!generatedAudioUrl);

  // Audio preview
  // Step 1: Generate audio
  const handleGenerateAudio = useCallback(async () => {
    if (generatingAudio || cleanLength === 0) return;
    setGeneratingAudio(true);
    setGeneratedAudioUrl(null);
    setAudioDuration(null);
    setAudioError(null);
    setAudioPlaying(false);
    try {
      const res = await fetch("/api/preview-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: script.trim(), voicePreset, voiceTuning }),
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        setGeneratedAudioUrl(data.audioUrl);
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = data.audioUrl;
        audio.addEventListener("loadedmetadata", () => {
          setAudioDuration(Math.round(audio.duration * 10) / 10);
        });
        audio.addEventListener("ended", () => setAudioPlaying(false));
        audioRef.current = audio;
        audio.play().then(() => setAudioPlaying(true)).catch(() => {});
      } else {
        setAudioError(data.error || "Audio generation failed");
      }
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Network error");
    }
    setGeneratingAudio(false);
  }, [script, voicePreset, voiceTuning, generatingAudio, cleanLength]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {});
    }
  }, [audioPlaying]);

  // Ctrl+Enter to generate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canGenerate) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canGenerate, handleSubmit]);

  return (
    <div className="w-[420px] min-w-[420px] h-full overflow-y-auto bg-[#0a0814] border-r border-[#9b51e0]/[0.06] flex flex-col">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9b51e0]/20 to-[#0693e3]/10 border border-[#9b51e0]/15 flex items-center justify-center">
            <span className="text-sm font-[family-name:var(--font-heading)] font-black text-brand-gradient">Z</span>
          </div>
          <div>
            <h1 className="text-[15px] font-[family-name:var(--font-heading)] font-bold text-[#f5f0ff] tracking-tight">
              Zag of All Trades
            </h1>
            <p className="text-[10px] text-[#f5f0ff]/25 font-[family-name:var(--font-body)] tracking-wide">
              AI Avatar Studio &middot; Must Be Nuts
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col gap-5 overflow-y-auto">
        {/* ── Base Image Upload ── */}
        <Section label="Character Image">
          <div
            className={`upload-zone rounded-xl overflow-hidden cursor-pointer transition-all ${baseImagePreview ? "border-[#9b51e0]/15" : ""} ${uploading === "image" ? "active" : ""}`}
            onClick={() => imageInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleImageDrop}
          >
            {baseImagePreview ? (
              <div className="relative group">
                <Image src={baseImagePreview} alt="Base character" width={388} height={218} className="w-full h-[180px] object-cover" />
                <div className="absolute inset-0 bg-[#08060e]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-[#f5f0ff]/60 font-[family-name:var(--font-body)]">Click to replace</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                {uploading === "image" ? <Spinner /> : (
                  <>
                    <div className="w-12 h-12 rounded-xl border border-[#9b51e0]/10 bg-[#9b51e0]/[0.03] flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#9b51e0]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#f5f0ff]/35 font-[family-name:var(--font-body)]">Drop image or click to upload</p>
                      <p className="text-[10px] text-[#f5f0ff]/15 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file, "image"); }} />
        </Section>

        {/* ── Voice Mode Toggle ── */}
        <Section label="Voice">
          <div className="glass rounded-xl p-1 flex gap-1">
            {(["tts", "upload"] as VoiceMode[]).map((mode) => (
              <button key={mode} onClick={() => setVoiceMode(mode)}
                className={`flex-1 py-2 rounded-lg text-xs font-[family-name:var(--font-body)] font-medium transition-all cursor-pointer ${
                  voiceMode === mode ? "bg-[#9b51e0]/15 text-[#b87df5] glow-brand-sm" : "text-[#f5f0ff]/30 hover:text-[#f5f0ff]/50"
                }`}>
                {mode === "tts" ? "Text to Speech" : "Upload Audio"}
              </button>
            ))}
          </div>

          {voiceMode === "tts" && (
            <div className="mt-3 animate-fade-in">
              {/* Annotation toolbar — data-driven from registry */}
              <div className="mb-2">
                <button type="button" onClick={() => setToolbarOpen((p) => !p)}
                  className="flex items-center gap-1.5 text-[10px] text-[#f5f0ff]/25 hover:text-[#b87df5] transition-colors cursor-pointer mb-1.5">
                  <svg className={`w-3 h-3 transition-transform ${toolbarOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                  <span>Annotations</span>
                  <span className="text-[#f5f0ff]/10">({TOOLBAR_CATEGORIES.length} categories)</span>
                </button>
                {toolbarOpen && (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                    {TOOLBAR_CATEGORIES.map(({ category, label }) => {
                      const defs = REGISTRY_BY_CATEGORY.get(category) ?? [];
                      if (defs.length === 0) return null;
                      return (
                        <div key={category} className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] text-[#f5f0ff]/15 uppercase tracking-wider w-14 shrink-0">{label}</span>
                          {defs.map((def) => (
                            <AnnotationBtn key={def.tag} label={def.label} tier={def.tier}
                              onClick={() => insertAnnotation(def.tag, def.type === "wrapper")} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <textarea ref={textareaRef} value={script} onChange={(e) => setScript(e.target.value.slice(0, 5000))}
                placeholder="Type your script... Use toolbar to add pauses, gestures, and voice cues"
                className="w-full h-32 bg-[#9b51e0]/[0.03] border border-[#9b51e0]/[0.08] rounded-xl p-3.5 text-[13px] font-[family-name:var(--font-body)] text-[#f5f0ff]/85 placeholder-[#f5f0ff]/15 resize-none focus:outline-none focus:border-[#9b51e0]/25 transition-colors leading-relaxed" />
              <div className="flex justify-between mt-1.5 px-1">
                <span className="text-[10px] text-[#f5f0ff]/15">
                  {estDuration > 0
                    ? `~${estDuration >= 60 ? `${Math.floor(estDuration / 60)}m ${Math.round(estDuration % 60)}s` : `${estDuration}s`} video`
                    : hasAnnotations
                      ? `${cleanLength} chars + annotations`
                      : "Annotations supported"}
                </span>
                <span className={`text-[10px] font-[family-name:var(--font-mono)] ${cleanLength > 4500 ? "text-[#ff6900]/60" : "text-[#f5f0ff]/15"}`}>
                  {cleanLength}/5000
                </span>
              </div>
            </div>
          )}

          {voiceMode === "upload" && (
            <div className="mt-3 animate-fade-in">
              <div className={`upload-zone rounded-xl cursor-pointer ${audioFileName ? "border-[#9b51e0]/15" : ""} ${uploading === "audio" ? "active" : ""}`}
                onClick={() => audioInputRef.current?.click()}>
                {audioFileName ? (
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="w-9 h-9 rounded-lg bg-[#9b51e0]/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#b87df5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#f5f0ff]/65 truncate">{audioFileName}</p>
                      <p className="text-[10px] text-[#f5f0ff]/25 mt-0.5">Lip-sync mode</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setUploadedAudioUrl(""); setAudioFileName(""); }}
                      className="text-[#f5f0ff]/15 hover:text-[#f5f0ff]/40 cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 gap-2">
                    {uploading === "audio" ? <Spinner /> : (
                      <>
                        <svg className="w-5 h-5 text-[#9b51e0]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <p className="text-xs text-[#f5f0ff]/25">Upload audio for lip-sync</p>
                        <p className="text-[10px] text-[#f5f0ff]/12">MP3, WAV, M4A</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file, "audio"); }} />
            </div>
          )}
          {/* Voice style presets inside the Voice section */}
        </Section>
      </div>

      {/* ═══ Two-Step Workflow ═══ */}
      <div className="px-6 py-4 border-t border-[#9b51e0]/[0.06] space-y-3">

        {/* ── STEP 1: AUDIO ── */}
        {voiceMode === "tts" && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
                generatedAudioUrl ? "bg-[#4ade80]/15 text-[#4ade80]" : "bg-[#9b51e0]/10 text-[#b87df5]"
              }`}>1</span>
              <span className="text-[10px] text-[#f5f0ff]/25 uppercase tracking-wider font-[family-name:var(--font-heading)]">Audio</span>
              {generatedAudioUrl && audioDuration && (
                <span className="text-[9px] text-[#4ade80]/40 ml-auto">{audioDuration}s ready</span>
              )}
            </div>

            {!generatedAudioUrl && !generatingAudio && (
              <button onClick={handleGenerateAudio} disabled={cleanLength === 0}
                className={`w-full py-3 rounded-xl text-[12px] font-[family-name:var(--font-heading)] font-bold tracking-wide transition-all cursor-pointer ${
                  cleanLength > 0 ? "bg-[#9b51e0]/10 text-[#b87df5] border border-[#9b51e0]/15 hover:bg-[#9b51e0]/20" : "bg-[#f5f0ff]/[0.02] text-[#f5f0ff]/10 cursor-not-allowed"
                }`}>
                Generate Audio
              </button>
            )}

            {generatingAudio && (
              <div className="w-full py-3 rounded-xl bg-[#9b51e0]/5 border border-[#9b51e0]/10 flex items-center justify-center gap-2 text-[12px] text-[#b87df5]/50">
                <Spinner size="sm" /> Generating audio...
              </div>
            )}

            {generatedAudioUrl && (
              <div className="rounded-xl bg-[#9b51e0]/[0.04] border border-[#9b51e0]/10 p-3 flex items-center gap-3">
                {/* Waveform bars */}
                <div className="flex items-end gap-0.5 h-6">
                  {[0.6, 1, 0.7, 0.9, 0.5].map((h, i) => (
                    <div key={i} className={`waveform-bar ${audioPlaying ? "waveform-playing" : ""}`}
                      style={{ height: `${h * 24}px`, animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
                {/* Duration */}
                <span className="text-[12px] font-[family-name:var(--font-mono)] text-[#f5f0ff]/30 min-w-[40px]">
                  {audioDuration ? `${audioDuration}s` : "..."}
                </span>
                {/* Play/Pause */}
                <button onClick={handlePlayPause}
                  className="w-8 h-8 rounded-lg bg-[#9b51e0]/10 flex items-center justify-center text-[#b87df5] hover:bg-[#9b51e0]/20 transition-colors cursor-pointer">
                  {audioPlaying ? (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                {/* Regenerate */}
                <button onClick={handleGenerateAudio}
                  className="ml-auto text-[9px] text-[#f5f0ff]/15 hover:text-[#b87df5] transition-colors cursor-pointer uppercase tracking-wider">
                  Regenerate
                </button>
              </div>
            )}

            {audioError && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[9px] text-[#ff6900]/50">{audioError}</span>
                <button onClick={handleGenerateAudio} className="text-[9px] text-[#b87df5]/40 hover:text-[#b87df5] cursor-pointer">Retry</button>
              </div>
            )}
          </div>
        )}

        {/* Connector */}
        {voiceMode === "tts" && (
          <div className="flex justify-center">
            <div className={`w-px h-4 ${generatedAudioUrl ? "bg-[#9b51e0]/20" : "bg-[#f5f0ff]/5"}`} />
          </div>
        )}

        {/* ── STEP 2: VIDEO ── */}
        <div className={`transition-opacity ${voiceMode === "tts" && !generatedAudioUrl ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${
              voiceMode === "upload" || generatedAudioUrl ? "bg-[#9b51e0]/10 text-[#b87df5]" : "bg-[#f5f0ff]/5 text-[#f5f0ff]/10"
            }`}>{voiceMode === "upload" ? "1" : "2"}</span>
            <span className="text-[10px] text-[#f5f0ff]/25 uppercase tracking-wider font-[family-name:var(--font-heading)]">Video</span>
          </div>

          {/* Video prompt */}
          <div className="mb-2.5">
            <textarea value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value.slice(0, 500))}
              placeholder="Describe the video style... e.g. 'Energetic talking with hand gestures, expressive body movement, looking at camera'"
              className="w-full h-16 bg-[#9b51e0]/[0.03] border border-[#9b51e0]/[0.08] rounded-xl p-3 text-[11px] font-[family-name:var(--font-body)] text-[#f5f0ff]/70 placeholder-[#f5f0ff]/12 resize-none focus:outline-none focus:border-[#9b51e0]/25 transition-colors leading-relaxed" />
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[9px] text-[#f5f0ff]/12">Describes how the character moves and acts</span>
              <span className="text-[9px] text-[#f5f0ff]/10 font-[family-name:var(--font-mono)]">{videoPrompt.length}/500</span>
            </div>
          </div>

          {/* Negative prompt (collapsible) */}
          <details className="mb-2.5">
            <summary className="text-[9px] text-[#f5f0ff]/15 uppercase tracking-wider cursor-pointer hover:text-[#f5f0ff]/25 transition-colors list-none flex items-center gap-1.5 mb-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Negative Prompt
            </summary>
            <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value.slice(0, 300))}
              placeholder="What to avoid... e.g. 'blurry, deformed face, static, no movement, bad quality'"
              className="w-full h-14 bg-[#ff6900]/[0.02] border border-[#ff6900]/[0.08] rounded-xl p-3 text-[11px] font-[family-name:var(--font-body)] text-[#f5f0ff]/70 placeholder-[#f5f0ff]/12 resize-none focus:outline-none focus:border-[#ff6900]/15 transition-colors leading-relaxed" />
          </details>

          {/* Model selector */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {MODEL_OPTIONS.map(({ id, name, features, desc, maxSec }) => {
              const tooLong = audioDuration != null && audioDuration > maxSec;
              return (
                <button key={id} onClick={() => setAvatarModel(id)}
                  title={features}
                  className={`py-2.5 px-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    avatarModel === id
                      ? "bg-[#9b51e0]/15 text-[#b87df5] border border-[#9b51e0]/25"
                      : tooLong
                        ? "bg-[#f5f0ff]/[0.01] text-[#f5f0ff]/10 border border-transparent opacity-50"
                        : "bg-[#f5f0ff]/[0.02] text-[#f5f0ff]/20 border border-transparent hover:border-[#9b51e0]/10"
                  }`}>
                  <div className={`text-[9px] font-[family-name:var(--font-body)] font-medium leading-tight ${
                    tooLong ? "text-[#ff6900]/40" : avatarModel === id ? "text-[#b87df5]" : "text-[#f5f0ff]/25"
                  }`}>
                    {tooLong ? `Audio too long` : features}
                  </div>
                  <div className={`text-[7px] mt-0.5 ${
                    tooLong ? "text-[#ff6900]/30" : avatarModel === id ? "text-[#b87df5]/25" : "text-[#f5f0ff]/8"
                  }`}>
                    {desc}
                  </div>
                </button>
              );
            })}
          </div>
          {(() => {
            const sel = MODEL_OPTIONS.find(m => m.id === avatarModel);
            if (sel && audioDuration != null && audioDuration > sel.maxSec) {
              return (
                <div className="text-[9px] text-[#ff6900]/50 mb-2">
                  Audio is {audioDuration}s but {sel.name} supports max ~{sel.maxSec}s. Use a shorter script or pick Aurora/OmniHuman.
                </div>
              );
            }
            return null;
          })()}

          {/* Speed / Quality toggle */}
          <div className="flex gap-1 mb-2.5">
            {RENDER_MODES.map(({ id, label, desc }) => (
              <button key={id} onClick={() => setRenderMode(id)}
                className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                  renderMode === id
                    ? "bg-[#9b51e0]/15 text-[#b87df5] border border-[#9b51e0]/25"
                    : "bg-[#f5f0ff]/[0.02] text-[#f5f0ff]/20 border border-transparent hover:border-[#9b51e0]/10"
                }`}>
                <div className={`text-[10px] font-[family-name:var(--font-body)] font-medium`}>{label}</div>
                <div className={`text-[7px] mt-0.5 ${renderMode === id ? "text-[#b87df5]/30" : "text-[#f5f0ff]/8"}`}>{desc}</div>
              </button>
            ))}
          </div>

          {/* Generate Video button */}
          <button onClick={handleSubmit} disabled={!canGenerate}
            className={`w-full py-3.5 rounded-xl text-sm font-[family-name:var(--font-heading)] font-bold tracking-wide transition-all cursor-pointer ${
              canGenerate ? "btn-brand text-white glow-brand animate-pulse-glow" : "bg-[#f5f0ff]/[0.03] text-[#f5f0ff]/15 cursor-not-allowed"
            }`}>
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2.5"><Spinner size="sm" />Generating video...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Generate Video
                <kbd className="text-[9px] opacity-40 font-[family-name:var(--font-mono)] bg-white/5 px-1.5 py-0.5 rounded">Ctrl+Enter</kbd>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable components ──

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-[family-name:var(--font-heading)] font-medium text-[#f5f0ff]/22 uppercase tracking-[0.18em] mb-2.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step, formatValue, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  formatValue?: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] font-[family-name:var(--font-body)] text-[#f5f0ff]/28">{label}</span>
        <span className="text-[11px] text-[#b87df5]/60 font-[family-name:var(--font-mono)] tabular-nums">
          {formatValue ? formatValue(value) : `${value}`}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
  );
}



function AnnotationBtn({ label, tier, onClick }: { label: string; tier?: "audio" | "strong" | "hint"; onClick: () => void }) {
  const tierColor = tier === "audio"
    ? "border-[#4ade80]/15 hover:border-[#4ade80]/30 hover:text-[#4ade80]"
    : tier === "strong"
      ? "border-[#b87df5]/15 hover:border-[#b87df5]/30 hover:text-[#b87df5]"
      : "border-[#f5f0ff]/5 hover:border-[#f5f0ff]/15 hover:text-[#f5f0ff]/50";
  return (
    <button type="button" onClick={onClick}
      className={`px-2 py-1 rounded-md text-[10px] font-[family-name:var(--font-body)] font-medium border bg-transparent text-[#f5f0ff]/25 transition-all cursor-pointer ${tierColor}`}
      title={tier === "audio" ? "Directly affects audio" : tier === "strong" ? "Influences video" : "Prompt hint"}>
      {label}
    </button>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <svg className={`animate-spin ${size === "sm" ? "h-4 w-4" : "h-6 w-6"} text-[#9b51e0]`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
