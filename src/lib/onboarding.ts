const KEY = "slfv:onboarding:done";

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
  } catch {}
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
