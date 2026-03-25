# Workout Creator

A PT-directed workout app that turns your weekly training session videos into structured, executable workout plans — combining the simplicity of Stronglifts with the intelligence of AI transcription.

---

## The Problem

After each PT session, your trainer films a few reps of each exercise while explaining the movements. That video lives in your camera roll. When it's time to train solo, you bounce between your photos app (to watch the demo) and whatever notes you've scrawled down. There's no structured plan, no weight progression tracking, and the PT's coaching cues get lost.

## The Solution

Upload your PT session video. The app transcribes and analyzes it, extracts a structured workout plan, and stores the video alongside each exercise. When you train, you see your sets/reps, your PT's coaching cues, and a tap-to-play demo video — all in one place. Each week, your new PT video becomes your new program.

---

## Core Features (V1)

### Video-to-Workout Pipeline
- Upload a video from your PT session directly from your camera roll
- Audio is transcribed via **GPT-4o Transcribe** (server-side, via a swappable provider interface)
- A second LLM pass extracts a structured workout from the transcript
- Raw video is stored in **Cloudflare R2** and linked to each exercise

### Workout Execution
- Each week's PT session video generates that week's workout program
- Exercises displayed in sequence with sets, reps, rest guidance, and PT coaching cues
- Tap any exercise to watch the PT demo video in-app
- Manual set logging — tap to mark each set complete
- Weight pre-populated from your last session; app tracks actuals and suggests progression

### Session History
- Every logged session is saved with date, exercises, sets, reps, and weights used
- Used to determine starting weight for your next session (hybrid PT-defined + auto-progression)

### Workout Streak
- Simple streak counter tracking consecutive weeks of completed workouts

---

## Roadmap (Post-V1)

### Annotated Transcript Learning Tool
PT terminology is often opaque. Future versions will underline key terms in the transcript (e.g. *T-spine rotation*, *hip hinge*) and surface a contextual popup with a plain-language explanation. Initially self-service; later, your PT can author annotations directly.

### Custom Video-Based Progress Goals
Create goals that aren't tied to weight on a bar. Example: "touch my toes." Log a weekly video of yourself attempting the movement. Review your video timeline to see genuine physical progress over weeks and months. This is the differentiator — most apps track numbers; this tracks movement.

### Streak Gamification
Badges, streaks, and milestones to reinforce the training habit loop.

### Progress Charts
Per-exercise weight progression graphs once sufficient session history exists.

### PT Portal
A web interface for your trainer to review your logs, author terminology annotations, and upload session videos directly.

### Multimodal Analysis
Upgrade the transcription pipeline to use vision-capable models (e.g. Gemini) that can analyze video frames alongside audio — detecting exercises visually, not just from what's spoken.

---

## Architecture

### Stack
| Layer | Technology |
|---|---|
| Mobile app | React Native (Expo managed workflow) |
| Backend / database | Convex |
| Auth | Clerk (via Convex integration) |
| Video storage | Cloudflare R2 |
| Transcription | GPT-4o Transcribe (swappable via provider interface) |
| LLM analysis | OpenAI (structured output extraction) |

### Video Processing Pipeline

```
User selects video from camera roll
        ↓
Upload to Cloudflare R2 (via presigned URL)
        ↓
Convex background action triggered
        ↓
TranscriptionProvider.transcribe(videoUrl) → raw transcript
        ↓
LLM pass: extract structured workout from transcript
        ↓
Workout + exercises saved to Convex DB
        ↓
User notified: "Your workout is ready"
```

### Transcription Provider Abstraction

The transcription layer is designed to be model-agnostic. Swapping providers requires changing a single config value:

```typescript
// convex/lib/transcription/index.ts
interface TranscriptionProvider {
  transcribe(audioUrl: string): Promise<TranscriptionResult>
}

// Providers: OpenAITranscriptionProvider, DeepgramProvider, GeminiProvider, ...
```

### Data Model (Core)

```typescript
// A workout generated from a single PT session video
Workout {
  id: string
  createdAt: number
  weekOf: string              // ISO date of the week this program applies to
  videoUrl: string            // Cloudflare R2 URL of the raw PT session video
  transcript: string          // Raw transcript text
  exercises: Exercise[]
}

// A single exercise within a workout
Exercise {
  id: string
  workoutId: string
  name: string
  category: "strength" | "mobility" | "cardio"
  sets: number
  reps: number | null
  durationSeconds: number | null
  restSeconds: number | null
  startingWeight: number | null   // PT-defined starting weight
  cues: string[]                  // PT coaching cues extracted from transcript
  notes: string
  videoUrl: string                // R2 URL of PT demo video
  sourceTimestamp: number         // Timestamp in video where this exercise is explained
}

// A logged training session
Session {
  id: string
  workoutId: string
  completedAt: number
  sets: LoggedSet[]
}

LoggedSet {
  exerciseId: string
  setNumber: number
  repsCompleted: number
  weightUsed: number | null
  completed: boolean
}
```

---

## User Flow

```
1. Meet with PT → PT films exercises with explanation
2. Open app → "Upload this week's session" → select video from camera roll
3. App processes video (background) → structured workout created
4. Workout appears in app for the week
5. Training day:
   - Open today's workout
   - Tap exercise → see sets/reps/cues + watch PT demo video
   - Log each set (weight auto-filled from last session)
   - Complete workout → session saved → streak updated
6. Next PT session → repeat
```

---

## Development Phases

### Phase 1 — Pipeline
- Convex project setup + Clerk auth
- Cloudflare R2 integration
- Video upload from Expo image picker
- Transcription provider interface + GPT-4o Transcribe implementation
- LLM structured extraction → Exercise schema

### Phase 2 — Workout Execution
- Workout display screen (exercise list)
- In-app video player per exercise
- Set logging UI
- Weight progression logic (last session → suggested weight)

### Phase 3 — History & Continuity
- Session history screen
- Streak counter
- Week-over-week weight tracking

### Phase 4 — Learning Tool
- Annotated transcript view
- Term extraction + contextual popup UI

### Phase 5 — Video Goal Tracking
- Goal creation (name + description)
- Weekly video log per goal
- Timeline playback view

---

## Key Design Decisions

**Why Convex?** Real-time reactivity, background actions for video processing, and file metadata storage — all in one. No separate API layer needed.

**Why Cloudflare R2?** Videos are large. R2 is S3-compatible, egress-free, and cheap. Convex stores the metadata and R2 URL; R2 serves the video bytes directly to the client.

**Why swappable transcription?** Transcription models are improving rapidly. GPT-4o Transcribe is the starting point, but the provider interface means upgrading is a one-line config change — not a refactor.

**Why no rest timer in V1?** Your PT-directed program is about movement quality and progression, not interval timing. Keeps the execution UI simple and focused.

**Why video-based goal tracking (not just metrics)?** Flexibility, posture, and movement quality can't be captured in a number. A video timeline of you attempting to touch your toes over 12 weeks is more meaningful — and more motivating — than any metric.
