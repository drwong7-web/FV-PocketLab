const KEY = "slfv:onboarding:done";
const RESUME_KEY = "slfv:onboarding:resume";

export type OnboardingResume = "teams-create" | "team-import" | "team-add" | null;

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(KEY, "1");
    localStorage.removeItem(RESUME_KEY);
  } catch {}
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(RESUME_KEY);
  } catch {}
}

export function setOnboardingResume(step: Exclude<OnboardingResume, null>) {
  try {
    localStorage.setItem(RESUME_KEY, step);
  } catch {}
}

export function getOnboardingResume(): OnboardingResume {
  try {
    const v = localStorage.getItem(RESUME_KEY);
    if (v === "teams-create" || v === "team-import" || v === "team-add") return v;
    return null;
  } catch {
    return null;
  }
}

export function clearOnboardingResume() {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {}
}
