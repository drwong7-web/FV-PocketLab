const KEY = "slfv:onboarding:tour";

export type TourStep = "team-create" | "player-add" | null;

export function getTourStep(): TourStep {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "team-create" || v === "player-add") return v;
    return null;
  } catch {
    return null;
  }
}

export function setTourStep(step: Exclude<TourStep, null>) {
  try {
    localStorage.setItem(KEY, step);
  } catch {}
}

export function clearTour() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
