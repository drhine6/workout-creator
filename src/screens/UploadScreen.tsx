import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type UploadState =
  | { status: "idle" }
  | { status: "picking" }
  | { status: "uploading"; progress: string }
  | { status: "processing"; workoutId: Id<"workouts"> }
  | { status: "done"; workoutId: Id<"workouts"> }
  | { status: "error"; message: string };

export default function UploadScreen() {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  const getUploadUrl = useAction(api.r2.getUploadUrl);
  const createWorkout = useMutation(api.workouts.createWorkout);

  // Poll workout status when processing
  const workoutId =
    uploadState.status === "processing" || uploadState.status === "done"
      ? uploadState.workoutId
      : null;
  const workout = useQuery(
    api.workouts.getWorkout,
    workoutId ? { workoutId } : "skip"
  );

  // Transition from processing → done when Convex marks it ready
  if (uploadState.status === "processing" && workout?.status === "ready") {
    setUploadState({ status: "done", workoutId: uploadState.workoutId });
  }
  if (uploadState.status === "processing" && workout?.status === "failed") {
    setUploadState({
      status: "error",
      message: workout.errorMessage ?? "Processing failed",
    });
  }

  async function handlePickAndUpload() {
    console.log("[Upload] handlePickAndUpload called");
    try {
      setUploadState({ status: "picking" });

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        setUploadState({ status: "idle" });
        return;
      }

      const asset = result.assets[0];
      const filename = asset.fileName ?? `session-${Date.now()}.mp4`;
      const contentType = asset.mimeType ?? "video/mp4";

      setUploadState({ status: "uploading", progress: "Getting upload URL…" });

      // 1. Get presigned R2 upload URL
      console.log("[Upload] Getting presigned URL...");
      const { uploadUrl, videoUrl } = await getUploadUrl({
        filename,
        contentType,
      });
      console.log("[Upload] Got URL, videoUrl:", videoUrl);

      setUploadState({ status: "uploading", progress: "Uploading video…" });

      // 2. Upload directly to R2
      console.log("[Upload] Fetching local asset blob...");
      const blob = await fetch(asset.uri).then((r) => r.blob());
      console.log("[Upload] Blob size:", blob.size, "type:", blob.type);

      console.log("[Upload] PUTting to R2...");
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": contentType },
      });
      console.log("[Upload] R2 response:", uploadResponse.status, uploadResponse.statusText);

      if (!uploadResponse.ok) {
        const responseText = await uploadResponse.text();
        console.error("[Upload] R2 error body:", responseText);
        throw new Error(`Upload failed (${uploadResponse.status}): ${responseText}`);
      }

      setUploadState({ status: "uploading", progress: "Starting processing…" });

      // 3. Create workout record in Convex — triggers background processing
      console.log("[Upload] Creating workout in Convex...");
      const newWorkoutId = await createWorkout({
        weekOf: new Date().toISOString().split("T")[0],
        videoUrl,
      });
      console.log("[Upload] Workout created:", newWorkoutId);

      setUploadState({ status: "processing", workoutId: newWorkoutId });
    } catch (err) {
      console.error("[Upload] Error:", err);
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setUploadState({ status: "error", message });
      Alert.alert("Upload failed", message);
    }
  }

  function reset() {
    setUploadState({ status: "idle" });
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Upload PT Session</Text>

      {uploadState.status === "idle" && (
        <>
          <Text style={styles.subtitle}>
            Pick a video from your PT session to generate this week's workout.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handlePickAndUpload}>
            <Text style={styles.buttonText}>Pick Video</Text>
          </TouchableOpacity>
        </>
      )}

      {uploadState.status === "picking" && <ActivityIndicator size="large" />}

      {uploadState.status === "uploading" && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>{uploadState.progress}</Text>
        </View>
      )}

      {uploadState.status === "processing" && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusText}>Transcribing and analyzing…</Text>
          <Text style={styles.hint}>This usually takes 30–60 seconds.</Text>
        </View>
      )}

      {uploadState.status === "done" && workout && (
        <View style={styles.statusContainer}>
          <Text style={styles.successText}>✓ Workout ready!</Text>
          <Text style={styles.statusText}>
            {workout.exercises?.length ?? 0} exercises extracted
          </Text>
          {workout.exercises?.map((ex) => (
            <View key={ex._id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <Text style={styles.exerciseMeta}>
                {ex.sets} sets ×{" "}
                {ex.reps ? `${ex.reps} reps` : `${ex.durationSeconds}s`}
              </Text>
            </View>
          ))}
          <TouchableOpacity style={styles.buttonSecondary} onPress={reset}>
            <Text style={styles.buttonSecondaryText}>Upload another</Text>
          </TouchableOpacity>
        </View>
      )}

      {uploadState.status === "error" && (
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>Error</Text>
          <Text style={styles.statusText}>{uploadState.message}</Text>
          <TouchableOpacity style={styles.button} onPress={reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: "#666",
    fontSize: 15,
  },
  statusContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    color: "#444",
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    color: "#999",
  },
  successText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#16a34a",
  },
  errorText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#dc2626",
  },
  exerciseRow: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseMeta: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
});
