import { getCustomerSimulatorEnv } from "@/lib/customer-simulator/env";
import { storeDemoKycSessionMetadata } from "@/lib/customer-simulator/session-store";
import { SumsubClient } from "@/lib/customer-simulator/sumsub";

export const runtime = "nodejs";

type KycSessionBody = {
  email?: unknown;
  externalUserId?: unknown;
  phone?: unknown;
  ttlInSecs?: unknown;
  walletAddress?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const walletAddressPattern = /^0x[a-fA-F0-9]{40}$/;

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function readExternalUserId(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return `demo-user-${Date.now()}`;
}

function readTtlInSecs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return 600;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRequiredEmail(value: unknown): string {
  const email = readOptionalString(value);

  if (!email) {
    throw new ValidationError("email is required to generate the Sumsub SDK link");
  }

  if (!emailPattern.test(email)) {
    throw new ValidationError("email must be a valid email address");
  }

  return email;
}

function readRequiredWalletAddress(value: unknown): string {
  const walletAddress = readOptionalString(value);

  if (!walletAddress) {
    throw new ValidationError(
      "walletAddress is required to generate the Sumsub SDK link",
    );
  }

  if (!walletAddressPattern.test(walletAddress)) {
    throw new ValidationError("walletAddress must be a valid EVM address");
  }

  return walletAddress;
}

export async function POST(request: Request) {
  try {
    const env = getCustomerSimulatorEnv();
    const body = (await request.json()) as KycSessionBody;
    const externalUserId = readExternalUserId(body.externalUserId);
    const email = readRequiredEmail(body.email);
    const phone = readOptionalString(body.phone);
    const ttlInSecs = readTtlInSecs(body.ttlInSecs);
    const walletAddress = readRequiredWalletAddress(body.walletAddress);
    const sumsub = new SumsubClient({
      appToken: env.sumsubAppToken,
      baseUrl: env.sumsubApiBaseUrl,
      secretKey: env.sumsubSecretKey,
    });
    const token = await sumsub.generateSdkAccessToken({
      externalUserId,
      levelName: env.sumsubLevelName,
      ttlInSecs,
    });
    const resolvedExternalUserId = token.userId || externalUserId;
    storeDemoKycSessionMetadata({
      email,
      externalUserId,
      phone,
      walletAddress,
    });
    if (resolvedExternalUserId !== externalUserId) {
      storeDemoKycSessionMetadata({
        email,
        externalUserId: resolvedExternalUserId,
        phone,
        walletAddress,
      });
    }

    return Response.json({
      success: true,
      data: {
        accessToken: token.token,
        environment: env.sumsubEnvironment,
        externalUserId: resolvedExternalUserId,
        levelName: env.sumsubLevelName,
        status: "sdk_token_issued",
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json(
        {
          success: false,
          error: {
            code: "validation_error",
            message: error.message,
          },
        },
        { status: 422 },
      );
    }

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
