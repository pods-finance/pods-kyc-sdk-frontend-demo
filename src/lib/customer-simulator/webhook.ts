import crypto from "node:crypto";

type ApplicantReviewedWebhook = {
  applicantId?: unknown;
  clientId?: unknown;
  correlationId?: unknown;
  externalUserId?: unknown;
  inspectionId?: unknown;
  levelName?: unknown;
  reviewResult?: {
    clientComment?: unknown;
    moderationComment?: unknown;
    rejectLabels?: unknown;
    reviewAnswer?: unknown;
    reviewRejectType?: unknown;
  };
  reviewStatus?: unknown;
  type?: unknown;
};

const digestAlgorithms = {
  HMAC_SHA1_HEX: "sha1",
  HMAC_SHA256_HEX: "sha256",
  HMAC_SHA512_HEX: "sha512",
} as const;

type DigestAlgorithm = keyof typeof digestAlgorithms;

function isDigestAlgorithm(value: string): value is DigestAlgorithm {
  return value in digestAlgorithms;
}

function safeCompareHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createWebhookDigest({
  algorithm = "HMAC_SHA256_HEX",
  body,
  secret,
}: {
  algorithm?: DigestAlgorithm;
  body: string;
  secret: string;
}): string {
  return crypto
    .createHmac(digestAlgorithms[algorithm], secret)
    .update(body)
    .digest("hex");
}

export function verifySumsubWebhookDigest({
  algorithmHeader,
  body,
  digestHeader,
  secrets,
}: {
  algorithmHeader: string | null;
  body: string;
  digestHeader: string | null;
  secrets: string[];
}): boolean {
  if (!digestHeader || secrets.length === 0) {
    return false;
  }

  const algorithm = algorithmHeader?.trim() || "HMAC_SHA256_HEX";

  if (!isDigestAlgorithm(algorithm)) {
    return false;
  }

  return secrets.some((secret) => {
    const expectedDigest = createWebhookDigest({
      algorithm,
      body,
      secret,
    });

    return safeCompareHex(expectedDigest, digestHeader.trim());
  });
}

export function isApprovedApplicantReviewed(
  payload: ApplicantReviewedWebhook,
): boolean {
  return (
    payload.type === "applicantReviewed" &&
    payload.reviewStatus === "completed" &&
    payload.reviewResult?.reviewAnswer === "GREEN"
  );
}

export function isRejectedApplicantReviewed(
  payload: ApplicantReviewedWebhook,
): boolean {
  return (
    payload.type === "applicantReviewed" &&
    payload.reviewStatus === "completed" &&
    payload.reviewResult?.reviewAnswer === "RED"
  );
}

export function getWebhookReviewResult(payload: ApplicantReviewedWebhook) {
  const reviewResult = payload.reviewResult ?? {};

  return {
    clientComment: stringFrom(reviewResult.clientComment),
    correlationId: stringFrom(payload.correlationId),
    inspectionId: stringFrom(payload.inspectionId),
    levelName: stringFrom(payload.levelName),
    moderationComment: stringFrom(reviewResult.moderationComment),
    rejectLabels: stringArrayFrom(reviewResult.rejectLabels),
    reviewAnswer: stringFrom(reviewResult.reviewAnswer),
    reviewRejectType: stringFrom(reviewResult.reviewRejectType),
    reviewStatus: stringFrom(payload.reviewStatus),
  };
}

export function getWebhookApplicantId(payload: ApplicantReviewedWebhook): string {
  if (typeof payload.applicantId !== "string" || !payload.applicantId.trim()) {
    throw new Error("Webhook payload is missing applicantId");
  }

  return payload.applicantId.trim();
}

export function getWebhookExternalUserId(
  payload: ApplicantReviewedWebhook,
): string {
  if (
    typeof payload.externalUserId !== "string" ||
    !payload.externalUserId.trim()
  ) {
    throw new Error("Webhook payload is missing externalUserId");
  }

  return payload.externalUserId.trim();
}

function stringFrom(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function stringArrayFrom(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => stringFrom(item))
    .filter((item): item is string => Boolean(item));
}
