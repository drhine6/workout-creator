"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { OpenAITranscriptionProvider } from "./lib/transcription/openai";
import { extractWorkout } from "./lib/extraction";

export const processVideo = internalAction({
  args: {
    workoutId: v.id("workouts"),
    videoUrl: v.string(),
  },
  handler: async (ctx, { workoutId, videoUrl }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    try {
      // Step 1: Transcribe the video audio
      const provider = new OpenAITranscriptionProvider(apiKey);
      const transcriptionResult = await provider.transcribe(videoUrl);

      // Step 2: Extract structured workout from transcript
      const extraction = await extractWorkout(transcriptionResult.text, apiKey);

      // Step 3: Persist transcript + exercises to DB
      await ctx.runMutation(internal.workouts.saveProcessedWorkout, {
        workoutId,
        transcript: transcriptionResult.text,
        exercises: extraction.exercises.map((ex, index) => ({
          ...ex,
          reps: ex.reps ?? undefined,
          durationSeconds: ex.durationSeconds ?? undefined,
          restSeconds: ex.restSeconds ?? undefined,
          startingWeight: ex.startingWeight ?? undefined,
          sourceTimestamp: ex.sourceTimestamp ?? undefined,
          videoUrl,
          order: index,
        })),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      await ctx.runMutation(internal.workouts.markWorkoutFailed, {
        workoutId,
        errorMessage: message,
      });
      throw error;
    }
  },
});
