"use client";

import { useState } from "react";
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
  history: HistoryEntry[];
  onHistorySelect: (entry: HistoryEntry) => void;
}

const COSTUME_LABELS: Record<CostumeVariant, string> = {
  default: "Default", chef: "Chef", suit: "Suit", gym: "Gym", streetwear: "Street", festival: "Festival",
};

const STATUS_CONFIG = {
  idle: { label: "Ready", dot: "bg-[#f5f0ff]/15", badge: "bg-[#f5f0ff]/[0.03] text-[#f5f0ff]/25" },
  processing: { label: "Processing", dot: "bg-[#ff6900] animate-pulse", badge: "bg-[#ff6900]/10 text-[#ff6900]/70" },
  done: { label: "Complete", dot: "bg-[#00d084]", badge: "bg-[#00d084]/10 text-[#00d084]/70" },
  failed: { label: "Failed", dot: "bg-red-400", badge: "bg-red-500/10 text-red-400/70" },
};

export default function VideoPreview({
  status, videoUrl, script, gestureMode, costume, voicePreset, compiledPrompt, baseImagePreview,
  history, onHistorySelect,
}: VideoPreviewProps) {
  const cfg = STATUS_CONFIG[status];
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col bg-[#08060e] relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[60%] w-[500px] h-[400px] bg-[#9b51e0]/[0.03] rounded-full blur-[130px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[400px] h-[350px] bg-[#0693e3]/[0.025] rounded-full blur-[120px]" />
        <div className="absolute top-[50%] right-[10%] w-[300px] h-[300px] bg-[#00d084]/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* ── Top bar ── */}
      <div className="relative flex items-center justify-between px-8 py-5 border-b border-[#9b51e0]/[0.05]">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-[family-name:var(--font-heading)] font-medium text-[#f5f0ff]/18 uppercase tracking-[0.18em]">
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
                  ? "bg-[#9b51e0]/15 text-[#b87df5]"
                  : "bg-[#f5f0ff]/[0.03] text-[#f5f0ff]/25 hover:text-[#f5f0ff]/40"
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History ({history.length})
            </button>
          )}
          <div className="text-[10px] text-[#f5f0ff]/10 tracking-[0.2em] font-[family-name:var(--font-heading)]">
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
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#08060e]/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#9b51e0]/30 cursor-pointer"
              title="Download MP4">
              <svg className="w-4 h-4 text-[#f5f0ff]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>
          </div>
        ) : (
          <div className="relative w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden glass">
            {baseImagePreview ? (
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${baseImagePreview})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-[#08060e]/85 via-[#08060e]/20 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-2xl border border-dashed border-[#9b51e0]/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[#9b51e0]/12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <p className="text-xs text-[#f5f0ff]/12 font-[family-name:var(--font-body)]">
                  Upload a character image to start
                </p>
              </div>
            )}

            {script && (
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="glass rounded-xl p-3.5">
                  <p className="text-[12px] font-[family-name:var(--font-body)] text-[#f5f0ff]/55 leading-relaxed line-clamp-3">
                    &ldquo;{script}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {status === "processing" && (
              <div className="absolute inset-0 bg-[#08060e]/75 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[#9b51e0]/20 flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-[#9b51e0]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 rounded-full animate-pulse-glow" />
                </div>
                <p className="text-sm font-[family-name:var(--font-heading)] text-[#f5f0ff]/55 mt-5 font-medium">
                  Generating video
                </p>
                <p className="text-[10px] text-[#f5f0ff]/20 mt-1.5 tracking-wide font-[family-name:var(--font-body)]">
                  This may take 30 - 120 seconds
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom info bar ── */}
      <div className="relative px-8 py-4 border-t border-[#9b51e0]/[0.05] flex items-center gap-5">
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
              className="text-[10px] text-[#b87df5]/30 hover:text-[#b87df5]/60 font-[family-name:var(--font-body)] transition-colors cursor-pointer">
              Download MP4
            </a>
          </>
        )}
      </div>

      {compiledPrompt && (
        <div className="relative px-8 py-2.5 border-t border-[#9b51e0]/[0.03] bg-[#9b51e0]/[0.015]">
          <p className="text-[9px] text-[#f5f0ff]/12 font-[family-name:var(--font-mono)] truncate">
            prompt: {compiledPrompt.slice(0, 140)}...
          </p>
        </div>
      )}

      {/* ── History Panel ── */}
      {historyOpen && history.length > 0 && (
        <div className="absolute inset-0 z-20 bg-[#08060e]/95 backdrop-blur-sm flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-8 py-5 border-b border-[#9b51e0]/[0.08]">
            <span className="text-[11px] font-[family-name:var(--font-heading)] font-medium text-[#f5f0ff]/40 uppercase tracking-[0.18em]">
              Generation History
            </span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-[#f5f0ff]/20 hover:text-[#f5f0ff]/50 transition-colors cursor-pointer"
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
                  className="group glass rounded-xl overflow-hidden text-left transition-all hover:border-[#9b51e0]/20 cursor-pointer"
                >
                  <div className="aspect-video bg-[#0a0814] relative">
                    <video
                      src={entry.videoUrl}
                      muted
                      className="w-full h-full object-cover"
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08060e]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-[#9b51e0]/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#b87df5]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] font-[family-name:var(--font-body)] text-[#f5f0ff]/50 line-clamp-2 leading-relaxed">
                      &ldquo;{entry.script}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] text-[#9b51e0]/50 font-[family-name:var(--font-body)] capitalize">{entry.voicePreset}</span>
                      <span className="w-px h-2.5 bg-[#9b51e0]/10" />
                      <span className="text-[9px] text-[#f5f0ff]/20 font-[family-name:var(--font-body)]">Type {entry.gestureMode}</span>
                      <span className="w-px h-2.5 bg-[#9b51e0]/10" />
                      <span className="text-[9px] text-[#f5f0ff]/20 font-[family-name:var(--font-body)]">
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
      <span className="text-[10px] text-[#f5f0ff]/12 uppercase tracking-[0.15em] font-[family-name:var(--font-heading)]">{label}</span>
      <span className={`text-[11px] text-[#f5f0ff]/35 font-[family-name:var(--font-body)] font-medium ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-3 bg-[#9b51e0]/[0.08]" />;
}
