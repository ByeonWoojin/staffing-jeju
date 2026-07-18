import type { CoachmarkRole } from "@/lib/onboarding/coachmark-config";

export type CoachmarkStorageState = {
  completedSteps: string[];
  skipped: boolean;
  updatedAt?: string;
};

const initialState: CoachmarkStorageState = {
  completedSteps: [],
  skipped: false,
};

const storageKeys: Record<CoachmarkRole, string> = {
  owner: "staffing:coachmark:owner:v1",
  staff: "staffing:coachmark:staff:v1",
};

export function getCoachmarkStorageKey(role: CoachmarkRole) {
  return storageKeys[role];
}

function normalizeState(value: unknown): CoachmarkStorageState {
  if (!value || typeof value !== "object") return initialState;

  const candidate = value as Partial<CoachmarkStorageState>;
  return {
    completedSteps: Array.isArray(candidate.completedSteps)
      ? candidate.completedSteps.filter(
          (step): step is string => typeof step === "string",
        )
      : [],
    skipped: candidate.skipped === true,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined,
  };
}

export function readCoachmarkState(role: CoachmarkRole): CoachmarkStorageState {
  try {
    const rawValue = window.localStorage.getItem(getCoachmarkStorageKey(role));
    if (!rawValue) return initialState;

    return normalizeState(JSON.parse(rawValue));
  } catch {
    return initialState;
  }
}

export function writeCoachmarkState(
  role: CoachmarkRole,
  state: CoachmarkStorageState,
) {
  try {
    window.localStorage.setItem(
      getCoachmarkStorageKey(role),
      JSON.stringify({
        completedSteps: Array.from(new Set(state.completedSteps)),
        skipped: state.skipped,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // localStorage failures should never block the service flow.
  }
}
