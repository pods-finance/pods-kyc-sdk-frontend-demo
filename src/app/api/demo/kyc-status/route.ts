import { getCustomerSimulatorEnv } from "@/lib/customer-simulator/env";
import { PodsApiError, PodsKycClient } from "@/lib/customer-simulator/pods";
import { getDemoKycSessionMetadata } from "@/lib/customer-simulator/session-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const externalUserId = params.get("externalUserId")?.trim();
  const kycUserId = params.get("kycUserId")?.trim();
  const email = params.get("email")?.trim();
  const walletAddress = params.get("walletAddress")?.trim();
  const isIdentityLookup = Boolean(email && walletAddress && !kycUserId && !externalUserId);

  try {
    if (!kycUserId && !externalUserId && !isIdentityLookup) {
      return Response.json(
        {
          success: false,
          error: {
            code: "invalid_request",
            message: "kycUserId, externalUserId, or email and walletAddress are required",
          },
        },
        { status: 400 },
      );
    }

    const metadata = externalUserId ? getDemoKycSessionMetadata(externalUserId) : null;
    const resolvedKycUserId = kycUserId ?? metadata?.kycUserId;

    if (!resolvedKycUserId && !isIdentityLookup) {
      return Response.json({
        success: true,
        data: {
          clientComment: metadata?.clientComment,
          externalUserId,
          moderationComment: metadata?.moderationComment,
          rejectLabels: metadata?.rejectLabels,
          reviewRejectType: metadata?.reviewRejectType,
          status: metadata?.status ?? "pending",
        },
      });
    }

    const env = getCustomerSimulatorEnv();
    const pods = new PodsKycClient({
      apiKey: env.podsApiKey,
      baseUrl: env.podsApiBaseUrl,
    });
    const status = await pods.getKycStatus(
      isIdentityLookup
        ? { email, walletAddress }
        : { kycUserId: resolvedKycUserId },
    );

    return Response.json(status);
  } catch (error) {
    if (error instanceof PodsApiError && error.status === 404) {
      if (isIdentityLookup) {
        return Response.json(
          {
            success: false,
            error: {
              code: "kyc_profile_not_found",
              message: "No KYC profile found for this email and wallet address.",
            },
          },
          { status: 404 },
        );
      }

      return Response.json({
        success: true,
        data: {
          status: "pending",
        },
      });
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
