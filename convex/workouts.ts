import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";

// Create a new workout record and kick off video processing
export const createWorkout = mutation({
  args: {
    weekOf: v.string(), // ISO date string e.g. "2026-03-24"
    videoUrl: v.string(),
  },
  handler: async (ctx, { weekOf, videoUrl }) => {
    const workoutId = await ctx.db.insert("workouts", {
      weekOf,
      videoUrl,
      status: "processing",
      createdAt: Date.now(),
    });

    // Schedule the background processing action
    await ctx.scheduler.runAfter(0, internal.processVideo.processVideo, {
      workoutId,
      videoUrl,
    });

    return workoutId;
  },
});

// Get a workout by ID with its exercises
export const getWorkout = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, { workoutId }) => {
    const workout = await ctx.db.get(workoutId);
    if (!workout) return null;

    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workoutId))
      .collect();

    return {
      ...workout,
      exercises: exercises.sort((a, b) => a.order - b.order),
    };
  },
});

// List all workouts, most recent first
export const listWorkouts = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("workouts").order("desc").collect();
  },
});

// Get the most recent ready workout (current week's program)
export const getCurrentWorkout = query({
  args: {},
  handler: async (ctx) => {
    const workout = await ctx.db
      .query("workouts")
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "ready"))
      .first();

    if (!workout) return null;

    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workout._id))
      .collect();

    return {
      ...workout,
      exercises: exercises.sort((a, b) => a.order - b.order),
    };
  },
});

// Internal: save extracted transcript + exercises after processing
export const saveProcessedWorkout = internalMutation({
  args: {
    workoutId: v.id("workouts"),
    transcript: v.string(),
    exercises: v.array(
      v.object({
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
        videoUrl: v.string(),
        sourceTimestamp: v.optional(v.number()),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, { workoutId, transcript, exercises }) => {
    // Update workout with transcript and ready status
    await ctx.db.patch(workoutId, {
      transcript,
      status: "ready",
    });

    // Insert all exercises
    for (const exercise of exercises) {
      await ctx.db.insert("exercises", {
        workoutId,
        ...exercise,
      });
    }
  },
});

// Internal: mark a workout as failed with an error message
export const markWorkoutFailed = internalMutation({
  args: {
    workoutId: v.id("workouts"),
    errorMessage: v.string(),
  },
  handler: async (ctx, { workoutId, errorMessage }) => {
    await ctx.db.patch(workoutId, {
      status: "failed",
      errorMessage,
    });
  },
});
