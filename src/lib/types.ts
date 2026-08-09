import type { SprintAnalysis, Split } from "./sprintEngine";

/**
 * Local mirror of the signed-in Supabase user. `id` is the Supabase auth user
 * id, which is what ties on-device teams/athletes/tests to an account.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  organizationId: string;
  sport?: string;
  createdAt: number;
}

export interface Player {
  id: string;
  teamId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  mass: number; // kg
  height?: number; // cm
  position?: string;
  createdAt: number;
}

export type TestInputMode = "splits" | "position_time";

export interface TestSession {
  id: string;
  playerId: string;
  organizationId: string;
  createdAt: number;
  notes?: string;
  conditions?: string;
  mass: number;
  inputMode: TestInputMode;
  splits?: Split[];
  positionTime?: { times: number[]; positions: number[] };
  analysis: SprintAnalysis;
}
