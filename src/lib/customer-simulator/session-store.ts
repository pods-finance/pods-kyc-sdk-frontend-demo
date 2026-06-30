export type DemoKycSessionMetadata = {
  clientComment?: string;
  createdAt: string;
  email?: string;
  externalUserId: string;
  kycUserId?: string;
  moderationComment?: string;
  phone?: string;
  rejectLabels?: string[];
  reviewRejectType?: string;
  status?: string;
  updatedAt: string;
  walletAddress?: string;
};

type GlobalWithDemoSessionStore = typeof globalThis & {
  __podsKycDemoSessionStore?: Map<string, DemoKycSessionMetadata>;
};

const globalStore = globalThis as GlobalWithDemoSessionStore;

function getStore(): Map<string, DemoKycSessionMetadata> {
  globalStore.__podsKycDemoSessionStore ??= new Map();
  return globalStore.__podsKycDemoSessionStore;
}

function nonEmptyString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function storeDemoKycSessionMetadata(input: {
  clientComment?: string;
  email?: string;
  externalUserId: string;
  kycUserId?: string;
  moderationComment?: string;
  phone?: string;
  rejectLabels?: string[];
  reviewRejectType?: string;
  status?: string;
  walletAddress?: string;
}) {
  const store = getStore();
  const now = new Date().toISOString();
  const existing = store.get(input.externalUserId);
  const metadata: DemoKycSessionMetadata = {
    clientComment: nonEmptyString(input.clientComment) ?? existing?.clientComment,
    createdAt: existing?.createdAt ?? now,
    email: nonEmptyString(input.email) ?? existing?.email,
    externalUserId: input.externalUserId,
    kycUserId: nonEmptyString(input.kycUserId) ?? existing?.kycUserId,
    moderationComment:
      nonEmptyString(input.moderationComment) ?? existing?.moderationComment,
    phone: nonEmptyString(input.phone) ?? existing?.phone,
    rejectLabels: input.rejectLabels ?? existing?.rejectLabels,
    reviewRejectType:
      nonEmptyString(input.reviewRejectType) ?? existing?.reviewRejectType,
    status: nonEmptyString(input.status) ?? existing?.status,
    updatedAt: now,
    walletAddress: nonEmptyString(input.walletAddress) ?? existing?.walletAddress,
  };

  store.set(input.externalUserId, metadata);

  return metadata;
}

export function getDemoKycSessionMetadata(
  externalUserId: string,
): DemoKycSessionMetadata | null {
  return getStore().get(externalUserId) ?? null;
}
