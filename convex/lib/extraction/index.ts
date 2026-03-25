import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const ExerciseSchema = z.object({
  name: z.string().describe("Full name of the exercise"),
  category: z
    .enum(["strength", "mobility", "cardio"])
    .describe("Primary category of the exercise"),
  sets: z.number().int().positive().describe("Number of sets"),
  reps: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe("Reps per set, null if time-based"),
  durationSeconds: z
    .number()
    .positive()
    .nullable()
    .describe("Duration per set in seconds, null if rep-based"),
  restSeconds: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Rest between sets in seconds"),
  startingWeight: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Starting weight in kg, null if bodyweight"),
  cues: z
    .array(z.string())
    .describe(
      "Key coaching cues and technique notes from the trainer, verbatim where possible"
    ),
  notes: z
    .string()
    .describe("Any additional instructions or context from the trainer"),
  sourceTimestamp: z
    .number()
    .nonnegative()
    .nullable()
    .describe(
      "Approximate timestamp in seconds in the video where this exercise is explained"
    ),
});

const WorkoutExtractionSchema = z.object({
  exercises: z
    .array(ExerciseSchema)
    .describe("All exercises described in the session, in order"),
});

export type ExtractedExercise = z.infer<typeof ExerciseSchema>;
export type WorkoutExtraction = z.infer<typeof WorkoutExtractionSchema>;

const SYSTEM_PROMPT = `You are an expert fitness coach assistant that extracts structured workout data from personal trainer session transcripts.

Given a transcript of a PT session where the trainer explains exercises, extract every exercise mentioned and structure them into a clean workout plan.

Guidelines:
- Extract exercises in the order they are mentioned
- Capture coaching cues verbatim where possible — these are valuable for the client
- If sets/reps are not explicitly stated, make a reasonable inference based on context (e.g. "a few reps" → 3 reps, "a couple sets" → 2 sets)
- Identify the approximate timestamp based on the segment data if available
- Use "mobility" for stretches, flexibility work, and movement prep; "strength" for resistance exercises; "cardio" for conditioning work
- Leave startingWeight null for bodyweight exercises unless a specific weight is mentioned`;

export async function extractWorkout(
  transcript: string,
  apiKey: string
): Promise<WorkoutExtraction> {
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.parse({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract the workout from this PT session transcript:\n\n${transcript}`,
      },
    ],
    response_format: zodResponseFormat(WorkoutExtractionSchema, "workout"),
  });

  const result = completion.choices[0].message.parsed;
  if (!result) {
    throw new Error("Failed to extract workout structure from transcript");
  }

  return result;
}
