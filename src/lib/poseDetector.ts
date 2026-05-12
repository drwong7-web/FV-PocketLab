import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_HEAVY = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task";
const MODEL_LITE = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let landmarker: PoseLandmarker | null = null;
let loading: Promise<PoseLandmarker> | null = null;

export async function getPoseLandmarker(model: "heavy" | "lite" = "heavy"): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;
  if (loading) return loading;
  loading = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const lm = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: model === "heavy" ? MODEL_HEAVY : MODEL_LITE,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });
    landmarker = lm;
    loading = null;
    return lm;
  })();
  return loading;
}

export function disposePoseLandmarker() {
  landmarker?.close();
  landmarker = null;
}

// MediaPipe pose landmark indices (lower body of interest)
export const PL = {
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
} as const;

export const LOWER_BODY_CONNECTIONS: [number, number][] = [
  [PL.LEFT_HIP, PL.RIGHT_HIP],
  [PL.LEFT_HIP, PL.LEFT_KNEE], [PL.LEFT_KNEE, PL.LEFT_ANKLE],
  [PL.LEFT_ANKLE, PL.LEFT_HEEL], [PL.LEFT_HEEL, PL.LEFT_FOOT_INDEX], [PL.LEFT_ANKLE, PL.LEFT_FOOT_INDEX],
  [PL.RIGHT_HIP, PL.RIGHT_KNEE], [PL.RIGHT_KNEE, PL.RIGHT_ANKLE],
  [PL.RIGHT_ANKLE, PL.RIGHT_HEEL], [PL.RIGHT_HEEL, PL.RIGHT_FOOT_INDEX], [PL.RIGHT_ANKLE, PL.RIGHT_FOOT_INDEX],
];

export type FrameSample = {
  t: number;             // seconds since first frame
  footY: number;         // average normalized Y of ankles+heels+toes (0..1, 1 = bottom)
  ankleY: number;        // ankle-only mean
  visibility: number;    // mean visibility of foot landmarks
  landmarks: NormalizedLandmark[] | null;
};
