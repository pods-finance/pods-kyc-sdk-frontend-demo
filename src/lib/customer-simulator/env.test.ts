import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getCustomerSimulatorEnv } from "./env";

const originalEnv = process.env;

function setBaseEnv() {
  process.env = {
    AVENIA_FOR_CLIENT_ID: "avenia-client-id",
    NODE_ENV: "test",
    PODS_KYC_API_KEY: "pods-key",
    SUMSUB_WEBHOOK_SECRET: "webhook-secret",
  };
}

describe("getCustomerSimulatorEnv", () => {
  beforeEach(() => {
    setBaseEnv();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses sandbox credentials when Sumsub sandbox mode is selected", () => {
    process.env.SUMSUB_ENVIRONMENT = "sandbox";
    process.env.SUMSUB_SANDBOX_APP_TOKEN = "sbx:sandbox-token";
    process.env.SUMSUB_SANDBOX_SECRET_KEY = "sandbox-secret";
    process.env.SUMSUB_APP_TOKEN = "prd:production-token";
    process.env.SUMSUB_SECRET_KEY = "production-secret";

    const env = getCustomerSimulatorEnv();

    expect(env.sumsubEnvironment).toBe("sandbox");
    expect(env.sumsubAppToken).toBe("sbx:sandbox-token");
    expect(env.sumsubSecretKey).toBe("sandbox-secret");
  });

  it("uses production credentials when Sumsub production mode is selected", () => {
    process.env.SUMSUB_ENVIRONMENT = "production";
    process.env.SUMSUB_PRODUCTION_APP_TOKEN = "prd:production-token";
    process.env.SUMSUB_PRODUCTION_SECRET_KEY = "production-secret";
    process.env.SUMSUB_SANDBOX_APP_TOKEN = "sbx:sandbox-token";
    process.env.SUMSUB_SANDBOX_SECRET_KEY = "sandbox-secret";

    const env = getCustomerSimulatorEnv();

    expect(env.sumsubEnvironment).toBe("production");
    expect(env.sumsubAppToken).toBe("prd:production-token");
    expect(env.sumsubSecretKey).toBe("production-secret");
  });
});
