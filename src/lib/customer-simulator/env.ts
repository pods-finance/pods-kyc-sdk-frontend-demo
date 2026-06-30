export type SumsubEnvironment = "production" | "sandbox";

export type CustomerSimulatorEnv = {
  aveniaForClientId: string;
  podsApiBaseUrl: string;
  podsApiKey: string;
  sumsubApiBaseUrl: string;
  sumsubAppToken: string;
  sumsubEnvironment: SumsubEnvironment;
  sumsubLevelName: string;
  sumsubSecretKey: string;
  sumsubWebhookSecrets: string[];
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function requireEnv(name: string, fallbackName?: string): string {
  const value = readEnv(name) ?? (fallbackName ? readEnv(fallbackName) : null);

  if (!value) {
    const suffix = fallbackName ? ` or ${fallbackName}` : "";
    throw new Error(`${name}${suffix} is required`);
  }

  return value;
}

function requireAnyEnv(names: string[]): string {
  for (const name of names) {
    const value = readEnv(name);
    if (value) {
      return value;
    }
  }

  throw new Error(`${names.join(" or ")} is required`);
}

function readEnvList(name: string): string[] {
  const value = readEnv(name);
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readSumsubEnvironment(): SumsubEnvironment {
  const value = readEnv("SUMSUB_ENVIRONMENT")?.toLowerCase();

  if (value === "production" || value === "sandbox") {
    return value;
  }

  const token = readEnv("SUMSUB_APP_TOKEN");
  return token?.startsWith("sbx:") ? "sandbox" : "production";
}

function readSumsubCredentials(environment: SumsubEnvironment): {
  appToken: string;
  secretKey: string;
} {
  if (environment === "sandbox") {
    return {
      appToken: requireAnyEnv(["SUMSUB_SANDBOX_APP_TOKEN", "SUMSUB_APP_TOKEN"]),
      secretKey: requireAnyEnv(["SUMSUB_SANDBOX_SECRET_KEY", "SUMSUB_SECRET_KEY"]),
    };
  }

  return {
    appToken: requireAnyEnv(["SUMSUB_PRODUCTION_APP_TOKEN", "SUMSUB_APP_TOKEN"]),
    secretKey: requireAnyEnv(["SUMSUB_PRODUCTION_SECRET_KEY", "SUMSUB_SECRET_KEY"]),
  };
}

function readSumsubWebhookSecrets(): string[] {
  const secrets = [
    requireEnv("SUMSUB_WEBHOOK_SECRET"),
    ...readEnvList("SUMSUB_WEBHOOK_SECRETS"),
  ];
  const sandboxSecret = readEnv("SUMSUB_SANDBOX_WEBHOOK_SECRET");

  if (sandboxSecret) {
    secrets.push(sandboxSecret);
  }

  return [...new Set(secrets)];
}

export function maskSecretPrefix(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return "***";
  }

  return `${trimmed.slice(0, 8)}...`;
}

export function getCustomerSimulatorEnv(): CustomerSimulatorEnv {
  const sumsubEnvironment = readSumsubEnvironment();
  const sumsubCredentials = readSumsubCredentials(sumsubEnvironment);

  return {
    aveniaForClientId: requireEnv(
      "AVENIA_FOR_CLIENT_ID",
      "AVENIA_SUMSUB_FOR_CLIENT_ID",
    ),
    podsApiBaseUrl: (
      readEnv("PODS_KYC_API_BASE_URL") ??
      readEnv("NEXT_PUBLIC_API_BASE_URL") ??
      "http://localhost:4000"
    ).replace(/\/$/, ""),
    podsApiKey: requireEnv("PODS_KYC_API_KEY", "DEMO_CUSTOMER_API_KEY"),
    sumsubApiBaseUrl: (
      readEnv("SUMSUB_API_BASE_URL") ?? "https://api.sumsub.com"
    ).replace(/\/$/, ""),
    sumsubAppToken: sumsubCredentials.appToken,
    sumsubEnvironment,
    sumsubLevelName: readEnv("SUMSUB_LEVEL_NAME") ?? "pods-kyc-level",
    sumsubSecretKey: sumsubCredentials.secretKey,
    sumsubWebhookSecrets: readSumsubWebhookSecrets(),
  };
}
