"use client";

import { useState, useCallback } from "react";
import type { GestureMode, CostumeVariant, VoicePreset, JobStatus, HistoryEntry } from "@/types";

interface VideoPreviewProps {
  status: "idle" | JobStatus;
  videoUrl: string | null;
  script: string;
  gestureMode: GestureMode;
  costume: CostumeVariant;
  voicePreset: VoicePreset;
  compiledPrompt: string;
  baseImagePreview: string;
  baseImageUrl: string;
  history: HistoryEntry[];
  onHistorySelect: (entry: HistoryEntry) => void;
  onImageEdited: (falUrl: string, previewUrl: string) => void;
}

const COSTUME_LABELS: Record<CostumeVariant, string> = {
  default: "Default", chef: "Chef", suit: "Suit", gym: "Gym", streetwear: "Street", festival: "Festival",
};

const STATUS_CONFIG = {
  idle: { label: "Ready", dot: "bg-[var(--text-5)]", badge: "bg-[var(--bg-2)] text-[var(--text-3)]" },
  processing: { label: "Processing", dot: "bg-[var(--warning)] animate-pulse", badge: "bg-orange-50 text-[var(--warning)]" },
  done: { label: "Complete", dot: "bg-[var(--success)]", badge: "bg-green-50 text-[var(--success)]" },
  failed: { label: "Failed", dot: "bg-[var(--error)]", badge: "bg-red-50 text-[var(--error)]" },
};

export default function VideoPreview({
  status, videoUrl, script, gestureMode, costume, voicePreset, compiledPrompt, baseImagePreview,
  baseImageUrl, history, onHistorySelect, onImageEdited,
}: VideoPreviewProps) {
  const cfg = STATUS_CONFIG[status];
  const [historyOpen, setHistoryOpen] = useState(false);
  const [customizePrompt, setCustomizePrompt] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [customizeError, setCustomizeError] = useState<string | null>(null);

  const handleCustomize = useCallback(async () => {
    if (customizing || !customizePrompt.trim() || !baseImageUrl) return;
    setCustomizing(true);
    setCustomizeError(null);
    try {
      const res = await fetch("/api/customize-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: customizePrompt.trim(), imageUrl: baseImageUrl }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        onImageEdited(data.imageUrl, data.imageUrl);
        setCustomizePrompt("");
      } else {
        setCustomizeError(data.error || "Failed to customize");
      }
    } catch (err) {
      setCustomizeError(err instanceof Error ? err.message : "Network error");
    }
    setCustomizing(false);
  }, [customizing, customizePrompt, baseImageUrl, onImageEdited]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-base)] relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--accent)]/[0.03] rounded-full blur-[150px]" />
      </div>

      {/* ── Top bar ── */}
      <div className="relative flex items-center justify-between px-8 py-4 border-b border-[var(--border-1)]">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-[family-name:var(--font-heading)] font-medium text-[var(--text-1)]/18 uppercase tracking-[0.18em]">
            Preview
          </span>
          <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-[family-name:var(--font-body)] font-medium ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {history.length > 0 && (
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-[family-name:var(--font-body)] font-medium transition-all cursor-pointer ${
                historyOpen
                  ? "bg-[var(--accent)]/15 text-[var(--accent-light)]"
                  : "bg-[var(--bg-2)] text-[var(--text-3)] hover:text-[var(--text-2)]"
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History ({history.length})
            </button>
          )}
          <div className="text-[10px] text-[var(--text-1)]/10 tracking-[0.2em] font-[family-name:var(--font-heading)]">
            ZAG OF ALL TRADES
          </div>
        </div>
      </div>

      {/* ── Main preview area ── */}
      <div className="relative flex-1 flex items-center justify-center p-10">
        {status === "done" && videoUrl ? (
          <div className="relative w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden glow-brand animate-fade-in group">
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
            {/* Download button */}
            <a href={videoUrl} download={`zag-${Date.now()}.mp4`} target="_blank" rel="noopener noreferrer"
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--accent)]/30 cursor-pointer"
              title="Download MP4">
              <svg className="w-4 h-4 text-[var(--text-1)]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>
          </div>
        ) : (
          <div className="relative w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden glass">
            {baseImagePreview ? (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${baseImagePreview})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-white/20 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-2xl border border-dashed border-[var(--accent)]/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[var(--accent)]/12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <p className="text-xs text-[var(--text-1)]/12 font-[family-name:var(--font-body)]">
                  Upload a character image to start
                </p>
              </div>
            )}

            {/* Customize Zag panel */}
            {baseImagePreview && (
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="bg-white/90 backdrop-blur-md rounded-xl p-3 shadow-lg border border-[var(--border-1)]">
                  <p className="text-[10px] font-[family-name:var(--font-heading)] font-semibold text-[var(--text-2)] uppercase tracking-wider mb-2">
                    Customize Zag
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customizePrompt}
                      onChange={(e) => setCustomizePrompt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCustomize(); }}
                      placeholder="e.g. wearing a santa hat..."
                      className="flex-1 px-3 py-2 rounded-lg text-xs bg-white border border-[var(--border-1)] text-[var(--text-1)] placeholder-[var(--text-4)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                      disabled={customizing}
                    />
                    <button
                      onClick={handleCustomize}
                      disabled={customizing || !customizePrompt.trim()}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                        customizing ? "bg-[var(--bg-2)] text-[var(--text-4)]"
                          : "bg-[var(--accent)] text-white hover:bg-[var(--accent-light)] shadow-sm"
                      }`}>
                      {customizing ? "..." : "Apply"}
                    </button>
                  </div>
                  {customizeError && (
                    <p className="text-[10px] text-[var(--error)] mt-1.5">{customizeError}</p>
                  )}
                </div>
              </div>
            )}

            {status === "processing" && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)]/20 flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 rounded-full animate-pulse-glow" />
                </div>
                <p className="text-sm font-[family-name:var(--font-heading)] text-[var(--text-1)]/55 mt-5 font-medium">
                  Generating video
                </p>
                <p className="text-[10px] text-[var(--text-1)]/20 mt-1.5 tracking-wide font-[family-name:var(--font-body)]">
                  This may take 30 - 120 seconds
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom info bar ── */}
      <div className="relative px-8 py-4 border-t border-[var(--accent)]/[0.05] flex items-center gap-5">
        <InfoChip label="Gesture" value={`Type ${gestureMode}`} />
        <Divider />
        <InfoChip label="Outfit" value={COSTUME_LABELS[costume]} />
        <Divider />
        <InfoChip label="Voice" value={voicePreset} capitalize />
        <Divider />
        <InfoChip label="Format" value="9:16" />
        {videoUrl && status === "done" && (
          <>
            <Divider />
            <a href={videoUrl} download target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-[var(--accent-light)]/30 hover:text-[var(--accent-light)]/60 font-[family-name:var(--font-body)] transition-colors cursor-pointer">
              Download MP4
            </a>
          </>
        )}
      </div>

      {compiledPrompt && (
        <div className="relative px-8 py-2.5 border-t border-[var(--accent)]/[0.03] bg-[var(--accent)]/[0.015]">
          <p className="text-[9px] text-[var(--text-1)]/12 font-[family-name:var(--font-mono)] truncate">
            prompt: {compiledPrompt.slice(0, 140)}...
          </p>
        </div>
      )}

      {/* ── History Panel ── */}
      {historyOpen && history.length > 0 && (
        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--accent)]/[0.08]">
            <span className="text-[11px] font-[family-name:var(--font-heading)] font-medium text-[var(--text-1)]/40 uppercase tracking-[0.18em]">
              Generation History
            </span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-[var(--text-1)]/20 hover:text-[var(--text-1)]/50 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-5">
            <div className="grid grid-cols-2 gap-4">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => { onHistorySelect(entry); setHistoryOpen(false); }}
                  className="group glass rounded-xl overflow-hidden text-left transition-all hover:border-[var(--accent)]/20 cursor-pointer"
                >
                  <div className="aspect-video bg-[var(--bg-1)] relative">
                    <video
                      src={entry.videoUrl}
                      muted
                      className="w-full h-full object-cover"
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[var(--accent-light)]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-[family-name:var(--font-body)] text-[var(--text-1)]/50 line-clamp-2 leading-relaxed">
                      &ldquo;{entry.script}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] text-[var(--accent)]/50 font-[family-name:var(--font-body)] capitalize">{entry.voicePreset}</span>
                      <span className="w-px h-2.5 bg-[var(--accent)]/10" />
                      <span className="text-[9px] text-[var(--text-1)]/20 font-[family-name:var(--font-body)]">Type {entry.gestureMode}</span>
                      <span className="w-px h-2.5 bg-[var(--accent)]/10" />
                      <span className="text-[9px] text-[var(--text-1)]/20 font-[family-name:var(--font-body)]">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoChip({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--text-1)]/12 uppercase tracking-[0.15em] font-[family-name:var(--font-heading)]">{label}</span>
      <span className={`text-[11px] text-[var(--text-1)]/35 font-[family-name:var(--font-body)] font-medium ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-3 bg-[var(--accent)]/[0.08]" />;
}
