export interface TranscriptionResult {
  text: string;
  // Segments allow future use (e.g. linking exercise cues to timestamps)
  segments?: Array<{
    start: number; // seconds
    end: number;
    text: string;
  }>;
}

export interface TranscriptionProvider {
  transcribe(audioUrl: string): Promise<TranscriptionResult>;
}
