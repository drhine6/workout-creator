/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib_extraction_index from "../lib/extraction/index.js";
import type * as lib_transcription_index from "../lib/transcription/index.js";
import type * as lib_transcription_openai from "../lib/transcription/openai.js";
import type * as processVideo from "../processVideo.js";
import type * as r2 from "../r2.js";
import type * as sessions from "../sessions.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "lib/extraction/index": typeof lib_extraction_index;
  "lib/transcription/index": typeof lib_transcription_index;
  "lib/transcription/openai": typeof lib_transcription_openai;
  processVideo: typeof processVideo;
  r2: typeof r2;
  sessions: typeof sessions;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
