import {
  FREE_LIMITS,
  FreeLimitError,
  isInCurrentCalendarMonth,
  isPaidUser,
  type FreeLimitReason,
} from "@/lib/plan";
import { getAllLocalTests } from "@/lib/localHistory";
import { currentUser, listPlayers, listTeams, listTests } from "@/lib/storage";

function paid(): boolean {
  return isPaidUser(currentUser()?.id);
}

export function countTestsThisMonth(playerId: string): number {
  const local = getAllLocalTests().filter(
    (t) => t.athlete_id === playerId && isInCurrentCalendarMonth(new Date(t.test_date).getTime() || 0)
  ).length;
  const legacy = listTests(playerId).filter((t) => isInCurrentCalendarMonth(t.createdAt)).length;
  return local + legacy;
}

export function canCreateTeam(orgId: string): boolean {
  if (paid()) return true;
  return listTeams(orgId).length < FREE_LIMITS.maxTeams;
}

export function remainingAthleteSlots(teamId: string): number {
  if (paid()) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_LIMITS.maxAthletesPerTeam - listPlayers(teamId).length);
}

export function canCreatePlayer(teamId: string): boolean {
  return remainingAthleteSlots(teamId) > 0;
}

export function canSaveTest(playerId: string, existingId?: string): boolean {
  if (paid()) return true;
  if (existingId && getAllLocalTests().some((t) => t.id === existingId)) return true;
  return countTestsThisMonth(playerId) < FREE_LIMITS.maxTestsPerAthletePerMonth;
}

export function assertCanCreateTeam(orgId: string) {
  if (!canCreateTeam(orgId)) throw new FreeLimitError("team");
}

export function assertCanCreatePlayer(teamId: string) {
  if (!canCreatePlayer(teamId)) throw new FreeLimitError("athlete");
}

export function assertCanSaveTest(playerId: string, existingId?: string) {
  if (!canSaveTest(playerId, existingId)) throw new FreeLimitError("test");
}

export function canExportReport(): boolean {
  if (paid()) return true;
  return FREE_LIMITS.pdfExport && FREE_LIMITS.docxExport;
}

export function assertCanExportReport() {
  if (!canExportReport()) throw new FreeLimitError("export");
}

export function canImportAthletes(): boolean {
  if (paid()) return true;
  return FREE_LIMITS.athleteImport;
}

export function assertCanImportAthletes() {
  if (!canImportAthletes()) throw new FreeLimitError("import");
}

export function freeLimitKey(
  reason: FreeLimitReason
): "freeLimitTeam" | "freeLimitAthletes" | "freeLimitTests" | "freeLimitExport" | "freeLimitImport" {
  if (reason === "team") return "freeLimitTeam";
  if (reason === "athlete") return "freeLimitAthletes";
  if (reason === "export") return "freeLimitExport";
  if (reason === "import") return "freeLimitImport";
  return "freeLimitTests";
}
