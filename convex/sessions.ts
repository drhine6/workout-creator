import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Start a new training session for a workout
export const createSession = mutation({
  args: {
    workoutId: v.id("workouts"),
  },
  handler: async (ctx, { workoutId }) => {
    return ctx.db.insert("sessions", {
      workoutId,
      completedAt: 0, // 0 = in progress
    });
  },
});

// Log a completed set
export const logSet = mutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
    setNumber: v.number(),
    repsCompleted: v.optional(v.number()),
    weightUsed: v.optional(v.number()),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Upsert: check if this set was already logged
    const existing = await ctx.db
      .query("loggedSets")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) =>
        q.and(
          q.eq(q.field("exerciseId"), args.exerciseId),
          q.eq(q.field("setNumber"), args.setNumber)
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        repsCompleted: args.repsCompleted,
        weightUsed: args.weightUsed,
        completed: args.completed,
      });
      return existing._id;
    }

    return ctx.db.insert("loggedSets", args);
  },
});

// Mark session as complete
export const completeSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, { completedAt: Date.now() });
  },
});

// Get session history for a workout
export const getSessionsForWorkout = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, { workoutId }) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_workoutId", (q) => q.eq("workoutId", workoutId))
      .order("desc")
      .collect();
  },
});

// Get all completed sessions (for history screen)
export const listCompletedSessions = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("sessions")
      .order("desc")
      .filter((q) => q.gt(q.field("completedAt"), 0))
      .collect();
  },
});

// Get the last logged weight for an exercise (for auto-fill progression)
export const getLastWeightForExercise = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, { exerciseId }) => {
    const lastSet = await ctx.db
      .query("loggedSets")
      .withIndex("by_exerciseId", (q) => q.eq("exerciseId", exerciseId))
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.neq(q.field("weightUsed"), undefined)
        )
      )
      .first();

    return lastSet?.weightUsed ?? null;
  },
});

// Get all logged sets for a session
export const getSetsForSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return ctx.db
      .query("loggedSets")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});
