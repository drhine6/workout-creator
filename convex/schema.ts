import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workouts: defineTable({
    weekOf: v.string(), // ISO date string for the week (e.g. "2026-03-24")
    videoUrl: v.string(), // Cloudflare R2 URL
    transcript: v.optional(v.string()), // raw transcript text
    status: v.union(
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_weekOf", ["weekOf"]),

  exercises: defineTable({
    workoutId: v.id("workouts"),
    name: v.string(),
    category: v.union(
      v.literal("strength"),
      v.literal("mobility"),
      v.literal("cardio")
    ),
    sets: v.number(),
    reps: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    restSeconds: v.optional(v.number()),
    startingWeight: v.optional(v.number()),
    cues: v.array(v.string()),
    notes: v.string(),
    videoUrl: v.string(), // same R2 URL as parent workout (clips in future)
    sourceTimestamp: v.optional(v.number()), // seconds into video
    order: v.number(), // display order within workout
  }).index("by_workoutId", ["workoutId"]),

  sessions: defineTable({
    workoutId: v.id("workouts"),
    completedAt: v.number(),
  }).index("by_workoutId", ["workoutId"]),

  loggedSets: defineTable({
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
    setNumber: v.number(),
    repsCompleted: v.optional(v.number()),
    weightUsed: v.optional(v.number()),
    completed: v.boolean(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_exerciseId", ["exerciseId"]),
});
