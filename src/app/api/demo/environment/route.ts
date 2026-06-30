import {
  getCustomerSimulatorEnv,
  maskSecretPrefix,
} from "@/lib/customer-simulator/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    const env = getCustomerSimulatorEnv();

    return Response.json({
      success: true,
      data: {
        podsApiBaseUrl: env.podsApiBaseUrl,
        sumsubApiBaseUrl: env.sumsubApiBaseUrl,
        sumsubAppTokenPrefix: maskSecretPrefix(env.sumsubAppToken),
        sumsubEnvironment: env.sumsubEnvironment,
        sumsubLevelName: env.sumsubLevelName,
        sumsubWebhookSecretCount: env.sumsubWebhookSecrets.length,
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: {
          code: "customer_simulator_error",
          message:
            error instanceof Error ? error.message : "Unexpected failure",
        },
      },
      { status: 500 },
    );
  }
}
