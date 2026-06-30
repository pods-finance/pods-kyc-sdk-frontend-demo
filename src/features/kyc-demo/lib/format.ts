import type { RequestPhase } from "../types";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected request failure.";
}

export function makeEventId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatTimestamp(value: Date): string {
  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getPhaseLabel(phase: RequestPhase): string {
  switch (phase) {
    case "loading":
      return "Loading";
    case "success":
      return "Ready";
    case "error":
      return "Error";
    case "idle":
      return "Idle";
  }
}
