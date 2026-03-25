import OpenAI from "openai";
import type { TranscriptionProvider, TranscriptionResult } from "./index";

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioUrl: string): Promise<TranscriptionResult> {
    // Fetch the audio file from the URL (e.g. Cloudflare R2)
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], "audio.mp4", { type: "video/mp4" });

    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: "gpt-4o-transcribe",
      response_format: "json",
      // Hint the model toward fitness/PT terminology
      prompt:
        "This is a personal trainer explaining exercises to a client. " +
        "The trainer may use anatomical terms, exercise names, and movement cues.",
    });

    return {
      text: transcription.text,
    };
  }
}
