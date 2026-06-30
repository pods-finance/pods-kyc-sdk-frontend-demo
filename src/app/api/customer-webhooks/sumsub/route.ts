import { getCustomerSimulatorEnv } from "@/lib/customer-simulator/env";
import { PodsKycClient } from "@/lib/customer-simulator/pods";
import {
  getDemoKycSessionMetadata,
  storeDemoKycSessionMetadata,
} from "@/lib/customer-simulator/session-store";
import { SumsubClient } from "@/lib/customer-simulator/sumsub";
import {
  getWebhookApplicantId,
  getWebhookExternalUserId,
  getWebhookReviewResult,
  isApprovedApplicantReviewed,
  isRejectedApplicantReviewed,
  verifySumsubWebhookDigest,
} from "@/lib/customer-simulator/webhook";

export const runtime = "nodejs";

type SubmitMetadata = {
  email: string;
  walletAddress: string;
};

function stringFrom(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function responseDataFrom(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const maybeEnvelope = response as Record<string, unknown>;

  if (maybeEnvelope.data && typeof maybeEnvelope.data === "object") {
    return maybeEnvelope.data as Record<string, unknown>;
  }

  return maybeEnvelope;
}

async function getRequiredSubmitMetadata(
  externalUserId: string,
): Promise<SubmitMetadata> {
  const metadata = getDemoKycSessionMetadata(externalUserId);

  if (metadata?.email && metadata.walletAddress) {
    return {
      email: metadata.email,
      walletAddress: metadata.walletAddress,
    };
  }

  throw new Error(
    "Demo session metadata is missing email or walletAddress for this externalUserId. Generate the SDK link again from the demo UI with email and wallet address filled before completing Sumsub.",
  );
}

export async function POST(request: Request) {
  const body = await request.text();

  try {
    const env = getCustomerSimulatorEnv();
    const digestIsValid = verifySumsubWebhookDigest({
      algorithmHeader: request.headers.get("x-payload-digest-alg"),
      body,
      digestHeader: request.headers.get("x-payload-digest"),
      secrets: env.sumsubWebhookSecrets,
    });

    if (!digestIsValid) {
      return Response.json(
        {
          success: false,
          error: {
            code: "unauthorized",
            message: "Invalid Sumsub webhook digest",
          },
        },
        { status: 401 },
      );
    }

    const payload = JSON.parse(body) as Record<string, unknown>;

    if (isRejectedApplicantReviewed(payload)) {
      const applicantId = getWebhookApplicantId(payload);
      const externalUserId = getWebhookExternalUserId(payload);
      const reviewResult = getWebhookReviewResult(payload);
      storeDemoKycSessionMetadata({
        clientComment: reviewResult.clientComment,
        externalUserId,
        moderationComment: reviewResult.moderationComment,
        rejectLabels: reviewResult.rejectLabels,
        reviewRejectType: reviewResult.reviewRejectType,
        status: "rejected",
      });

      console.info("[customer-simulator] Rejected Sumsub KYC stored locally", {
        applicantId,
        externalUserId,
        reviewRejectType: reviewResult.reviewRejectType,
      });

      return Response.json({
        success: true,
        data: {
          applicantId,
          externalUserId,
          processed: true,
          reviewAnswer: reviewResult.reviewAnswer ?? "RED",
          reviewRejectType: reviewResult.reviewRejectType,
          rejectLabels: reviewResult.rejectLabels,
          status: "sumsub_rejected",
        },
      });
    }

    if (!isApprovedApplicantReviewed(payload)) {
      console.info("[customer-simulator] Sumsub webhook stored but ignored", {
        reviewStatus: payload.reviewStatus,
        reviewAnswer:
          typeof payload.reviewResult === "object" &&
          payload.reviewResult !== null &&
          "reviewAnswer" in payload.reviewResult
            ? payload.reviewResult.reviewAnswer
            : undefined,
        type: payload.type,
      });

      return Response.json({
        success: true,
        data: {
          processed: false,
          status: "ignored",
          type: payload.type,
        },
      });
    }

    const applicantId = getWebhookApplicantId(payload);
    const externalUserId = getWebhookExternalUserId(payload);
    const pods = new PodsKycClient({
      apiKey: env.podsApiKey,
      baseUrl: env.podsApiBaseUrl,
    });
    const submitMetadata = await getRequiredSubmitMetadata(externalUserId);
    const sumsub = new SumsubClient({
      appToken: env.sumsubAppToken,
      baseUrl: env.sumsubApiBaseUrl,
      secretKey: env.sumsubSecretKey,
    });
    const shareToken = await sumsub.generateShareToken({
      applicantId,
      forClientId: env.aveniaForClientId,
      ttlInSecs: 600,
    });
    const podsResponse = await pods.importSumsubShareToken({
      email: submitMetadata.email,
      shareToken: shareToken.token,
      sumsubApplicantId: applicantId,
      walletAddress: submitMetadata.walletAddress,
    });
    const podsResponseData = responseDataFrom(podsResponse);
    const kycUserId = stringFrom(podsResponseData?.kycUserId);

    if (kycUserId) {
      storeDemoKycSessionMetadata({
        email: submitMetadata.email,
        externalUserId,
        kycUserId,
        walletAddress: submitMetadata.walletAddress,
      });
    }

    console.info("[customer-simulator] Approved Sumsub KYC sent to Pods", {
      applicantId,
      environment: env.sumsubEnvironment,
      externalUserId,
      kycUserId,
    });

    return Response.json({
      success: true,
      data: {
        applicantId,
        externalUserId,
        kycUserId,
        podsResponse,
        processed: true,
        status: "submitted_to_pods",
      },
    });
  } catch (error) {
    console.error("[customer-simulator] Sumsub webhook processing failed", {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              path: "path" in error ? error.path : undefined,
              responseBody:
                "responseBody" in error ? error.responseBody : undefined,
              status: "status" in error ? error.status : undefined,
            }
          : error,
    });

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
