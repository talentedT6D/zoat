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

const MODEL_OPTIONS: { id: AvatarModel; name: string; desc: string }[] = [
  // Best for gestures/body movement
  { id: "omnihuman",  name: "OmniHuman",  desc: "Best gestures + body" },
  { id: "wan-speech",  name: "Wan 2.2",    desc: "Full body, 14B model" },
  { id: "echomimic", name: "EchoMimic",  desc: "Upper body + hands" },
  // General purpose
  { id: "aurora",    name: "Aurora",     desc: "Reliable lip-sync" },
  { id: "kling",     name: "Kling Pro",  desc: "High quality" },
  { id: "hedra",     name: "Hedra",      desc: "Character style" },
  // More options
  { id: "ai-avatar", name: "AI Avatar",  desc: "145 frames, 720p" },
  { id: "hunyuan",   name: "Hunyuan",    desc: "Tencent animation" },
  { id: "infinitalk", name: "InfiniTalk", desc: "Long-form avatar" },
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
  const [voiceExpanded, setVoiceExpanded] = useState(false);

  const [customPrompts, setCustomPrompts] = useState<CustomPrompts>({});
  const [openCustom, setOpenCustom] = useState<Record<string, boolean>>({});

  const toggleCustom = (key: string) => setOpenCustom((p) => ({ ...p, [key]: !p[key] }));
  const setCustom = (key: keyof CustomPrompts, value: string) =>
    setCustomPrompts((p) => ({ ...p, [key]: value || undefined }));

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAnnotation = useCallback((tag: string, isWrapper: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = script.slice(start, end);

    // Build tag string with optional default duration
    const def = REGISTRY_BY_TAG.get(tag.toLowerCase());
    const durSuffix = def?.durationAllowed && def.defaultDuration ? `:${def.defaultDuration}s` : "";
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
  const [previewingAudio, setPreviewingAudio] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { onBaseImageChange?.(DEFAULT_IMAGE_PREVIEW); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const activeCustom: CustomPrompts = {};
    if (customPrompts.gesture?.trim()) activeCustom.gesture = customPrompts.gesture.trim();
    if (customPrompts.costume?.trim()) activeCustom.costume = customPrompts.costume.trim();
    if (customPrompts.voice?.trim()) activeCustom.voice = customPrompts.voice.trim();
    if (customPrompts.mouth?.trim()) activeCustom.mouth = customPrompts.mouth.trim();

    onGenerate({
      script: script.trim(), gestureMode, costume, mouth, bodyMovement, voicePreset, voiceTuning,
      voiceMode, baseImageUrl, avatarModel,
      uploadedAudioUrl: voiceMode === "upload" ? uploadedAudioUrl : undefined,
      customPrompts: Object.keys(activeCustom).length > 0 ? activeCustom : undefined,
    });
  }, [isGenerating, baseImageUrl, voiceMode, cleanLength, uploadedAudioUrl, customPrompts, onGenerate, script, gestureMode, costume, mouth, bodyMovement, voicePreset, voiceTuning, avatarModel]);

  const canGenerate = baseImageUrl && !isGenerating &&
    (voiceMode === "tts" ? cleanLength > 0 : !!uploadedAudioUrl);

  // Audio preview
  const handlePreviewAudio = useCallback(async () => {
    if (previewingAudio || cleanLength === 0) return;
    setPreviewingAudio(true);
    setPreviewAudioUrl(null);
    setAudioError(null);
    try {
      const res = await fetch("/api/preview-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: script.trim(), voicePreset, voiceTuning }),
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        setPreviewAudioUrl(data.audioUrl);
        // Use ref-based audio element for reliable playback
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = data.audioUrl;
        audioRef.current = audio;
        try {
          await audio.play();
        } catch (playErr) {
          console.warn("Audio play failed:", playErr);
          // Fallback: user can click replay
        }
      } else {
        setAudioError(data.error || "Audio generation failed");
      }
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Network error");
    }
    setPreviewingAudio(false);
  }, [script, voicePreset, voiceTuning, previewingAudio, cleanLength]);

  const replayAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } else if (previewAudioUrl) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = previewAudioUrl;
      audioRef.current = audio;
      audio.play().catch(() => {});
    }
  }, [previewAudioUrl]);

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
                    <div className="flex items-center gap-3 mb-1 text-[8px] tracking-wide uppercase">
                      <span className="text-[#4ade80]/40">Changes Audio</span>
                      <span className="text-[#b87df5]/40">Video Hint</span>
                    </div>
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
        </Section>

        {/* ── Voice Preset ── */}
        {voiceMode === "tts" && (
          <Section label="Voice Style">
            <div className="grid grid-cols-5 gap-1.5">
              {VOICE_PRESETS.map((vp) => (
                <button key={vp.id} onClick={() => setVoicePreset(vp.id)}
                  className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                    voicePreset === vp.id
                      ? "bg-[#9b51e0]/15 text-[#b87df5] border border-[#9b51e0]/20 glow-brand-sm"
                      : "glass glass-hover text-[#f5f0ff]/35 hover:text-[#f5f0ff]/55"
                  }`}>
                  <span className="text-[11px] font-[family-name:var(--font-body)] font-medium block">{vp.label}</span>
                </button>
              ))}
            </div>
            <CustomPromptInput sectionKey="voice" value={customPrompts.voice || ""} isOpen={!!openCustom.voice}
              onToggle={() => toggleCustom("voice")} onChange={(v) => setCustom("voice", v)}
              placeholder="e.g. Calm narrator, BBC documentary style..." />
          </Section>
        )}

        {/* ── Voice Tuning ── */}
        {voiceMode === "tts" && (
          <Section label="Voice Tuning">
            <div className="space-y-3">
              <Slider label="Stability" value={voiceTuning.stability} min={0} max={10} step={1}
                onChange={(v) => setVoiceTuning((p) => ({ ...p, stability: v }))} />
              <Slider label="Similarity" value={voiceTuning.similarity} min={0} max={10} step={1}
                onChange={(v) => setVoiceTuning((p) => ({ ...p, similarity: v }))} />
              <button onClick={() => setVoiceExpanded(!voiceExpanded)}
                className="flex items-center gap-1.5 text-[10px] text-[#f5f0ff]/20 hover:text-[#9b51e0]/60 transition-colors cursor-pointer pt-1">
                <svg className={`w-3 h-3 transition-transform ${voiceExpanded ? "rotate-90" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                Advanced Controls
              </button>
              {voiceExpanded && (
                <div className="space-y-3 animate-fade-in pl-2 border-l border-[#9b51e0]/[0.06] ml-1">
                  <Slider label="Speed" value={voiceTuning.speed} min={0.5} max={2} step={0.1}
                    formatValue={(v) => `${v.toFixed(1)}x`} onChange={(v) => setVoiceTuning((p) => ({ ...p, speed: v }))} />
                  <Slider label="Pitch" value={voiceTuning.pitch} min={-10} max={10} step={1}
                    formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)} onChange={(v) => setVoiceTuning((p) => ({ ...p, pitch: v }))} />
                  <Slider label="Exaggeration" value={voiceTuning.exaggeration} min={0} max={1} step={0.05}
                    formatValue={(v) => `${(v * 100).toFixed(0)}%`} onChange={(v) => setVoiceTuning((p) => ({ ...p, exaggeration: v }))} />
                  <Slider label="CFG Strength" value={voiceTuning.cfg} min={0} max={1} step={0.05}
                    formatValue={(v) => `${(v * 100).toFixed(0)}%`} onChange={(v) => setVoiceTuning((p) => ({ ...p, cfg: v }))} />
                </div>
              )}
            </div>
          </Section>
        )}

        <div className="section-divider" />

        {/* ── Gesture Mode ── */}
        <Section label="Gesture">
          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as GestureMode[]).map((mode) => (
              <button key={mode} onClick={() => setGestureMode(mode)}
                className={`py-3 px-4 rounded-xl text-left transition-all cursor-pointer ${
                  gestureMode === mode ? "bg-[#9b51e0]/10 border border-[#9b51e0]/18 glow-brand-sm" : "glass glass-hover"
                }`}>
                <span className={`text-xs font-[family-name:var(--font-heading)] font-semibold block ${gestureMode === mode ? "text-[#b87df5]" : "text-[#f5f0ff]/45"}`}>
                  Type {mode}
                </span>
                <span className={`text-[10px] mt-0.5 block ${gestureMode === mode ? "text-[#9b51e0]/50" : "text-[#f5f0ff]/18"}`}>
                  {mode === "A" ? "Static · head pat end" : "Subtle motion"}
                </span>
              </button>
            ))}
          </div>
          <CustomPromptInput sectionKey="gesture" value={customPrompts.gesture || ""} isOpen={!!openCustom.gesture}
            onToggle={() => toggleCustom("gesture")} onChange={(v) => setCustom("gesture", v)}
            placeholder="e.g. Hands waving energetically, pointing at camera..." />
        </Section>

        {/* ── Costume ── */}
        <Section label="Costume">
          <div className="grid grid-cols-3 gap-1.5">
            {COSTUMES.map((c) => (
              <button key={c.id} onClick={() => setCostume(c.id)}
                className={`py-2.5 rounded-lg text-xs font-[family-name:var(--font-body)] font-medium transition-all cursor-pointer ${
                  costume === c.id ? "bg-[#9b51e0]/15 text-[#b87df5] border border-[#9b51e0]/18" : "glass glass-hover text-[#f5f0ff]/35"
                }`}>
                {c.label}
              </button>
            ))}
          </div>
          <CustomPromptInput sectionKey="costume" value={customPrompts.costume || ""} isOpen={!!openCustom.costume}
            onToggle={() => toggleCustom("costume")} onChange={(v) => setCustom("costume", v)}
            placeholder="e.g. Wearing a red Santa hat, gold chain necklace..." />
        </Section>

        {/* ── Mouth Articulation ── */}
        <Section label="Mouth Articulation">
          <div className="space-y-3">
            <Slider label="Open Width" value={mouth.openWidth} min={1} max={10} step={1}
              onChange={(v) => setMouth((p) => ({ ...p, openWidth: v }))} />
            <Slider label="Speed" value={mouth.speed} min={1} max={10} step={1}
              onChange={(v) => setMouth((p) => ({ ...p, speed: v }))} />
            <Slider label="Jaw Close" value={mouth.jawClose} min={1} max={10} step={1}
              onChange={(v) => setMouth((p) => ({ ...p, jawClose: v }))} />
          </div>
          <CustomPromptInput sectionKey="mouth" value={customPrompts.mouth || ""} isOpen={!!openCustom.mouth}
            onToggle={() => toggleCustom("mouth")} onChange={(v) => setCustom("mouth", v)}
            placeholder="e.g. Exaggerated cartoon lip-sync, snappy jaw on consonants..." />
        </Section>

        {/* ── Body Movement ── */}
        <Section label="Body Movement">
          <div className="space-y-3">
            <Slider label="Neck" value={bodyMovement.neck} min={0} max={10} step={1}
              formatValue={(v) => v <= 2 ? "Locked" : v <= 5 ? "Slight" : v <= 8 ? "Moderate" : "Full"}
              onChange={(v) => setBodyMovement((p) => ({ ...p, neck: v }))} />
            <Slider label="Hands" value={bodyMovement.hands} min={0} max={10} step={1}
              formatValue={(v) => v <= 2 ? "None" : v <= 5 ? "Subtle" : v <= 8 ? "Moderate" : "Expressive"}
              onChange={(v) => setBodyMovement((p) => ({ ...p, hands: v }))} />
            <Slider label="Body" value={bodyMovement.body} min={0} max={10} step={1}
              formatValue={(v) => v <= 2 ? "Statue" : v <= 5 ? "Minimal" : v <= 8 ? "Moderate" : "Dynamic"}
              onChange={(v) => setBodyMovement((p) => ({ ...p, body: v }))} />
          </div>
        </Section>
      </div>

      {/* ── Model Selector + Generate Button ── */}
      <div className="px-6 py-5 border-t border-[#9b51e0]/[0.06] space-y-2.5">
        {/* Avatar model selector */}
        <div>
          <span className="text-[9px] text-[#f5f0ff]/15 uppercase tracking-wider mb-1.5 block">Avatar Model</span>
          <div className="grid grid-cols-3 gap-1.5">
            {MODEL_OPTIONS.map(({ id, name, desc }) => (
              <button key={id} onClick={() => setAvatarModel(id)}
                className={`py-2 px-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  avatarModel === id
                    ? "bg-[#9b51e0]/15 text-[#b87df5] border border-[#9b51e0]/25"
                    : "bg-[#f5f0ff]/[0.02] text-[#f5f0ff]/20 border border-transparent hover:border-[#9b51e0]/10"
                }`}>
                <div className="text-[10px] font-[family-name:var(--font-body)] font-medium">{name}</div>
                <div className={`text-[7px] mt-0.5 leading-tight ${avatarModel === id ? "text-[#b87df5]/50" : "text-[#f5f0ff]/10"}`}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
        {/* Audio preview row */}
        {voiceMode === "tts" && cleanLength > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={handlePreviewAudio} disabled={previewingAudio}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-[family-name:var(--font-body)] font-medium border border-[#9b51e0]/10 text-[#f5f0ff]/30 hover:text-[#b87df5] hover:border-[#9b51e0]/20 transition-all cursor-pointer disabled:opacity-30">
              {previewingAudio ? (
                <><Spinner size="sm" /> Generating audio...</>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                  Preview Audio
                </>
              )}
            </button>
            {audioError && (
              <span className="text-[9px] text-[#ff6900]/50">{audioError}</span>
            )}
            {previewAudioUrl && (
              <button onClick={replayAudio}
                className="w-8 h-8 rounded-lg border border-[#9b51e0]/10 flex items-center justify-center text-[#b87df5]/50 hover:text-[#b87df5] transition-colors cursor-pointer"
                title="Replay audio">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </button>
            )}
          </div>
        )}
        <button onClick={handleSubmit} disabled={!canGenerate}
          className={`w-full py-3.5 rounded-xl text-sm font-[family-name:var(--font-heading)] font-bold tracking-wide transition-all cursor-pointer ${
            canGenerate ? "btn-brand text-white glow-brand animate-pulse-glow" : "bg-[#f5f0ff]/[0.03] text-[#f5f0ff]/15 cursor-not-allowed"
          }`}>
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2.5"><Spinner size="sm" />Generating...</span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Generate Video
              <kbd className="text-[9px] opacity-40 font-[family-name:var(--font-mono)] bg-white/5 px-1.5 py-0.5 rounded">Ctrl+Enter</kbd>
            </span>
          )}
        </button>
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

function CustomPromptInput({ sectionKey, value, isOpen, onToggle, onChange, placeholder }: {
  sectionKey: string; value: string; isOpen: boolean; onToggle: () => void;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="mt-2">
      <button onClick={onToggle}
        className="flex items-center gap-1.5 text-[10px] text-[#f5f0ff]/18 hover:text-[#9b51e0]/60 transition-colors cursor-pointer group">
        <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-45" : ""} ${value ? "text-[#9b51e0]/50" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span className={value ? "text-[#9b51e0]/50" : ""}>{value ? "Custom prompt active" : "Custom prompt"}</span>
      </button>
      {isOpen && (
        <div className="mt-2 animate-fade-in">
          <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className="w-full h-16 bg-[#9b51e0]/[0.03] border border-[#9b51e0]/[0.08] rounded-lg p-2.5 text-[11px] font-[family-name:var(--font-mono)] text-[#f5f0ff]/60 placeholder-[#f5f0ff]/12 resize-none focus:outline-none focus:border-[#9b51e0]/20 transition-colors leading-relaxed" />
          {value && <p className="text-[9px] text-[#9b51e0]/40 mt-1 px-0.5">Overrides preset — your prompt will be used instead</p>}
        </div>
      )}
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
