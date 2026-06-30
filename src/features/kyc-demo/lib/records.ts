export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function buildBody(values: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    const trimmed = trimOrNull(value);

    if (trimmed) {
      body[key] = trimmed;
    }
  }

  return body;
}

export function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[segment];
  }

  return current;
}

export function firstStringAtPath(
  value: unknown,
  paths: readonly (readonly string[])[],
): string | null {
  for (const path of paths) {
    const candidate = readPath(value, path);

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

export function firstJsonStringAtPath(
  value: unknown,
  paths: readonly (readonly string[])[],
): string | null {
  for (const path of paths) {
    const candidate = readPath(value, path);

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }

    if (Array.isArray(candidate) || isRecord(candidate)) {
      return JSON.stringify(candidate, null, 2);
    }
  }

  return null;
}

export function firstNumberAtPath(
  value: unknown,
  paths: readonly (readonly string[])[],
): number | null {
  for (const path of paths) {
    const candidate = readPath(value, path);

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }

    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}
