import type { SprintAnalysis, Split } from "./sprintEngine";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // simple hash, prototype only
  organizationId: string;
  /** Base64url WebAuthn platform credential id for device-unlock password reset. */
  webauthnCredentialId?: string;
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
