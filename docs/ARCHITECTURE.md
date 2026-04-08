# Zag of All Trades — Technical Architecture Document

## 1. Overview

**Zag of All Trades** is an AI avatar video generation studio. Users write a script, generate voice audio with effects (pauses, loud, whisper), then generate a talking avatar video using AI models.

### Tech Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (light theme)
- **Fonts**: Space Grotesk (headings), Outfit (body), JetBrains Mono (code)
- **Voice AI**: ElevenLabs TTS API
- **Video AI**: fal.ai (multiple avatar models)
- **Image AI**: fal.ai nano-banana-pro (image editing)
- **Storage**: fal.ai CDN storage
- **Deployment**: Vercel (maxDuration: 600s)

---

## 2. Architecture

### Layout
```
┌──────────────────┬──────────────────────────────────┐
│   PromptForm     │   VideoPreview                    │
│   (440px sidebar)│   (flex-1, remaining width)       │
│                  │                                    │
│  - Image thumb   │  - 9:16 preview card              │
│  - TTS/Upload    │  - Customize Zag (AI image edit)  │
│  - Script area   │  - Video player (when done)       │
│  - Annotations   │  - Download button                │
│  - Audio gen     │  - History panel                   │
│  - Video gen     │  - Status badges                   │
│  - Model picker  │                                    │
└──────────────────┴──────────────────────────────────┘
```

### Two-Step Workflow
```
STEP 1: AUDIO                    STEP 2: VIDEO
Script + Voice Effects    →    Audio + Image + Prompt    →    Video
[ElevenLabs TTS]              [fal.ai Avatar Model]         [MP4]
```

---

## 3. External APIs

### 3.1 ElevenLabs Text-to-Speech
- **API URL**: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Voice ID**: `NGd6cAY3u3AiZhUL0IyV` (Knightly)
- **Model**: `eleven_multilingual_v2`
- **Output Formats**: MP3 (default, no pauses) or PCM 22050Hz (when pauses/voice effects present)
- **Parameters**: `text`, `model_id`, `voice_settings` (stability, similarity_boost, style, use_speaker_boost)
- **PCM endpoint**: Same URL with `?output_format=pcm_22050`

### 3.2 fal.ai — Video Generation Models

| Model | Endpoint | Key Parameters |
|-------|----------|---------------|
| **AI Avatar** | `fal-ai/ai-avatar` | `image_url`, `audio_url`, `prompt`, `num_frames` (81/113/145), `resolution` (480p/720p), `acceleration` (none/regular/high) |
| **Aurora** | `fal-ai/creatify/aurora` | `image_url`, `audio_url`, `prompt`, `guidance_scale`, `audio_guidance_scale`, `resolution` |

### 3.3 fal.ai — Image Editing
| Model | Endpoint | Key Parameters |
|-------|----------|---------------|
| **Nano Banana Pro Edit** | `fal-ai/nano-banana-pro/edit` | `prompt`, `image_urls[]`, `resolution` (1K/2K/4K), `aspect_ratio`, `num_images` |

### 3.4 fal.ai — File Storage
- **Upload**: `fal.storage.upload(file)` → returns CDN URL (`https://v3b.fal.media/files/...`)
- Used for: uploading TTS audio, user images

---

## 4. API Routes

### `POST /api/upload`
**Purpose**: Upload image/audio files to fal.ai storage
- **Input**: `FormData` with `file` field
- **Output**: `{ url: string }` (fal CDN URL)
- **Max Duration**: 60s

### `POST /api/preview-audio`
**Purpose**: Generate TTS audio for preview (Step 1)
- **Input**: `{ script, voicePreset, voiceTuning }`
- **Process**: Parse annotations → split into segments → generate PCM/MP3 → upload to fal
- **Output**: `{ success, audioUrl }`
- **Max Duration**: 120s

### `POST /api/generate-video`
**Purpose**: Submit video generation job (non-blocking)
- **Input**: `{ imageUrl, audioUrl, videoPrompt, model, renderMode }`
- **Process**: Submits to fal.ai queue, returns immediately
- **Output**: `{ success, requestId, endpoint }`
- **Max Duration**: 30s

### `POST /api/video-status`
**Purpose**: Poll video generation status
- **Input**: `{ requestId, endpoint }`
- **Process**: Checks fal.ai queue status
- **Output**: `{ success, status: "processing"|"done"|"failed", videoUrl? }`
- **Max Duration**: 10s

### `POST /api/customize-image`
**Purpose**: AI-edit the base character image
- **Input**: `{ prompt, imageUrl }`
- **Process**: Calls `fal-ai/nano-banana-pro/edit`
- **Output**: `{ success, imageUrl }` (edited image URL)
- **Max Duration**: 60s

### `POST /api/generate` (legacy, fallback)
**Purpose**: Full pipeline in one call (audio + video)
- **Input**: Full `GenerateRequest` object
- **Process**: Parse → TTS → Avatar generation
- **Output**: `{ success, videoUrl }`
- **Max Duration**: 600s

---

## 5. Audio Pipeline

### Flow
```
Raw Script
    ↓
parseAnnotations()        — lib/scriptAnnotations.ts
    ↓
Segments: [speech, silence, speech, ...]
    ↓
generateVoice()           — lib/eleven.ts
    ↓
For each segment:
  - speech → ElevenLabs API (PCM or MP3)
  - silence → zero-filled Int16Array
  - speech with voiceOverride → ElevenLabs with modified settings + volume scaling
    ↓
Concatenate PCM → WAV container
    ↓
Upload to fal.storage
    ↓
Audio URL (fal CDN)
```

### Voice Effects (Per-Segment Processing)
When a script contains `[loud]`, `[whisper]`, etc., each wrapped segment gets:
1. **Different ElevenLabs voice_settings** (stability, similarity_boost, style)
2. **PCM volume multiplication** using dB-to-linear conversion: `multiplier = 10^(dB/20)`

| Effect | ElevenLabs Settings | Volume Change |
|--------|-------------------|---------------|
| `[loud:+10dB]` | Low stability, high style | ×3.16 amplification |
| `[loud:+20dB]` | Very low stability | ×10.0 amplification (clamped to Int16) |
| `[whisper:-10dB]` | High stability, low style | ×0.24 reduction |
| `[whisper:-20dB]` | Very high stability | ×0.06 reduction |
| `[mumble:-8dB]` | Low stability/similarity | ×0.63 reduction |

### Silence Generation
Exact silence via zero-filled PCM samples:
- Sample rate: 22050 Hz
- `[pause:5s]` = 110,250 zero samples = exactly 5 seconds
- Maximum: 30s per pause segment
- Output: Int16Array of zeros → inserted between speech segments

---

## 6. Video Pipeline

### Flow
```
Audio URL + Image URL + Video Prompt
    ↓
/api/generate-video (submit)
    ↓
fal.queue.submit(endpoint, input)
    ↓
Returns requestId immediately
    ↓
Browser polls /api/video-status every 3s
    ↓
fal.queue.status(endpoint, requestId)
    ↓
When COMPLETED: fal.queue.result() → video URL
    ↓
Video displayed in preview panel
```

### Render Modes
| Mode | AI Avatar | Aurora |
|------|-----------|--------|
| Speed | 81 frames, 480p, high accel | 480p, guidance 1.0 |
| Balanced | 113 frames, 480p, regular | 720p, guidance 1.5 |
| Quality | 145 frames, 720p, no accel | 720p, guidance 2.5 |

---

## 7. Annotation System

### Registry: `lib/annotationRegistry.ts`
Single source of truth for all inline script annotations. 13 annotations across 3 categories.

### Pause Annotations (create real silence)
| Tag | Default | Effect |
|-----|---------|--------|
| `[pause:Ns]` | 1s | Exact N seconds of silence |
| `[long pause:Ns]` | 3s | Extended silence |
| `[silence:Ns]` | 2s | Silent gap |

### Timing Annotations (short pauses)
| Tag | Default | Effect |
|-----|---------|--------|
| `[beat:Ns]` | 0.5s | Dramatic beat pause |
| `[breath:Ns]` | 1s | Breath-length pause |
| `[hesitate:Ns]` | 1s | Hesitation pause |

### Voice Wrapper Annotations (change audio delivery)
| Tag | Default dB | Effect |
|-----|-----------|--------|
| `[loud:+NdB]text[/loud]` | +10dB | Louder + emphatic (uppercase text + volume boost) |
| `[whisper:-NdB]text[/whisper]` | -10dB | Softer + quiet (lowercase text + volume reduction) |
| `[slow:NdB]text[/slow]` | +10dB | Slower delivery (higher stability) |
| `[fast]text[/fast]` | — | Faster (strip punctuation) |
| `[dramatic:+NdB]text[/dramatic]` | +15dB | Theatrical (uppercase + volume boost) |
| `[mumble:-NdB]text[/mumble]` | -8dB | Muffled (low stability + volume reduction) |
| `[spell:NdB]text[/spell]` | +10dB | Spell out each word (slow delivery) |

### dB Scale
- Range: -20dB to +20dB
- Conversion: `intensity = |dB| / 2` (maps to 1-10 internal scale)
- Voice settings scaled by intensity via `scaleVoiceOverride(type, intensity)`
- Volume change applied as PCM sample multiplication: `sample × 10^(dB/20)`

### Duration Pattern
Regex: `(?::([+-]?\d+(?:\.\d+)?)(s|dB)?)?`
- `:3s` = 3 seconds (for pauses)
- `:+10dB` = +10 decibels (for voice wrappers)
- `:5` = 5 (unit inferred from tag type)

---

## 8. Customize Zag (AI Image Editing)

### Flow
```
Current Base Image + User Prompt
    ↓
POST /api/customize-image
    ↓
fal-ai/nano-banana-pro/edit
  input: { prompt, image_urls: [currentUrl], resolution: "1K", aspect_ratio: "auto" }
    ↓
Edited Image URL
    ↓
Updates baseImagePreview + baseImageUrl in app state
    ↓
New image used for video generation
```

### UI Location
Bottom of the preview card in VideoPreview component. Always visible when idle. Text input + Apply button.

---

## 9. Key Library Modules

### `lib/eleven.ts` — ElevenLabs TTS
- `generateVoice(segments, voicePreset, voiceTuning)` → fal CDN audio URL
- Handles both MP3 (no pauses) and PCM (with pauses) paths
- Per-segment voice_settings overrides for [loud], [whisper], etc.
- PCM volume multiplication for real dB changes
- WAV container creation for concatenated PCM

### `lib/klingAvatar.ts` — Video Generation
- `generateAvatar(params)` → fal CDN video URL
- Supports 2 models: AI Avatar, Aurora
- Render modes: speed, balanced, quality
- Uses `fal.subscribe()` with 2s poll interval, 600s timeout

### `lib/scriptAnnotations.ts` — Annotation Parser
- `parseAnnotations(script)` → `ParsedScript` with segments, cues, clean text
- `splitIntoSegments(ttsText)` → `AudioSegment[]` (speech + silence + voice overrides)
- `buildAllDirections(cuesByCategory)` → prompt text for video model
- `stripAllAnnotations(script)` → clean text for display/counting
- `estimateDuration(script)` → estimated video duration in seconds

### `lib/annotationRegistry.ts` — Annotation Definitions
- `REGISTRY` — array of all `AnnotationDef` objects
- `REGISTRY_BY_TAG` — Map for fast lookup
- `REGISTRY_BY_CATEGORY` — Map grouped by category
- `TOOLBAR_CATEGORIES` — display order for UI
- `DURATION_PATTERN` — regex for `:Ns` and `:NdB` suffix

### `lib/promptCompiler.ts` — Prompt Builder (legacy, partially used)
- `compilePrompt(params)` → full structured prompt string
- `getAnimationConfig(gestureMode, bodyMovement)` → AnimationConfig
- Contains costume rules, voice tone mappings, mouth mechanics

---

## 10. TypeScript Types (`types.ts`)

```typescript
type VoicePreset = "sarcastic" | "deadpan" | "hype" | "whisper" | "aggressive"
type VoiceMode = "tts" | "upload"
type GestureMode = "A" | "B"
type CostumeVariant = "default" | "chef" | "suit" | "gym" | "streetwear" | "festival"
type AvatarModel = "aurora" | "ai-avatar"
type JobStatus = "processing" | "done" | "failed"

interface VoiceTuning {
  stability: number; similarity: number; speed: number;
  pitch: number; exaggeration: number; cfg: number;
}

interface GenerateRequest {
  script: string;
  gestureMode: GestureMode;
  costume: CostumeVariant;
  mouth: MouthMechanics;
  bodyMovement: BodyMovement;
  voicePreset: VoicePreset;
  voiceTuning: VoiceTuning;
  voiceMode: VoiceMode;
  baseImageUrl: string;
  uploadedAudioUrl?: string;
  audioUrl?: string;          // pre-baked from Step 1
  videoPrompt?: string;
  negativePrompt?: string;
  avatarModel?: AvatarModel;
  renderMode?: "speed" | "balanced" | "quality";
  customPrompts?: CustomPrompts;
}

interface HistoryEntry {
  id: string; timestamp: number; videoUrl: string;
  script: string; voicePreset: VoicePreset;
  gestureMode: GestureMode; costume: CostumeVariant;
}
```

---

## 11. UI Components

### `PromptForm` (sidebar, 440px)
- Character image thumbnail (64px, click to upload)
- TTS / Upload Audio toggle
- Script textarea (5000 char limit, always visible)
- Voice Effects (collapsible annotation toolbar)
- Step 1: Audio — Generate Audio button, full-width waveform player
- Step 2: Video — Video prompt, negative prompt, model selector, render mode, Generate Video button

### `VideoPreview` (main panel)
- Status badges (Ready / Processing / Complete / Failed)
- 9:16 preview card with base image
- Customize Zag panel (AI image editing)
- Video player with download button (hover)
- Download MP4 link in info bar
- History panel (overlay, grid of past videos with hover-to-play)

### `Preloader`
- Animated intro screen with role cycling
- Brand gradient text reveal
- Progress bar

---

## 12. Data Flow Summary

```
USER INPUT                    PROCESSING                      OUTPUT
─────────                    ──────────                      ──────
Script text         →   parseAnnotations()          →   Audio segments
Voice effects       →   generateVoice() [ElevenLabs] →   WAV audio file
                                                         (fal CDN URL)
                                                              ↓
Base image          →   /api/generate-video          →   fal.queue.submit()
Audio URL           →   (submit to fal.ai)                    ↓
Video prompt        →                                    Browser polls
Model + Render mode →                                    /api/video-status
                                                              ↓
                                                         MP4 video
                                                         (fal CDN URL)
                                                              ↓
                                                         Video player
                                                         + Download
                                                         + History
```

---

## 13. File Structure

```
zoat/
├── app/
│   ├── api/
│   │   ├── customize-image/route.ts    — AI image editing
│   │   ├── generate/route.ts           — Legacy full pipeline
│   │   ├── generate-video/route.ts     — Submit video job
│   │   ├── preview-audio/route.ts      — Generate TTS audio
│   │   ├── status/[jobId]/route.ts     — Job status (legacy)
│   │   ├── upload/route.ts             — File upload to fal
│   │   └── video-status/route.ts       — Poll video status
│   ├── components/
│   │   ├── Preloader.tsx               — Animated intro
│   │   ├── PromptForm.tsx              — Sidebar form
│   │   └── VideoPreview.tsx            — Preview panel
│   ├── globals.css                     — Design tokens + styles
│   ├── layout.tsx                      — Root layout + fonts
│   └── page.tsx                        — Main page + state
├── lib/
│   ├── annotationRegistry.ts           — Annotation definitions
│   ├── eleven.ts                       — ElevenLabs TTS
│   ├── klingAvatar.ts                  — Video generation
│   ├── klingVideo.ts                   — B-roll generation (unused)
│   ├── promptCompiler.ts               — Prompt builder (legacy)
│   └── scriptAnnotations.ts            — Annotation parser
├── public/
│   └── assets/zag_base.png             — Default ZAG image
├── types.ts                            — TypeScript types
└── docs/
    └── ARCHITECTURE.md                 — This document
```

---

*Generated for Zag of All Trades — AI Avatar Studio by Must Be Nuts*
