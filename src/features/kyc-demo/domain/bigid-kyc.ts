import { firstStringAtPath, trimOrNull } from "../lib/records";

export type BigDataKycSessionForm = {
  cpf: string;
  email: string;
  externalUserId: string;
  walletAddress: string;
};

export type BigDataKycAddressForm = {
  city: string;
  complement: string;
  country: string;
  number: string;
  phone: string;
  state: string;
  streetAddress: string;
  zipCode: string;
};

export const defaultBigDataKycSessionForm: BigDataKycSessionForm = {
  cpf: "",
  email: "",
  externalUserId: "",
  walletAddress: "",
};

export const defaultBigDataKycAddressForm: BigDataKycAddressForm = {
  city: "",
  complement: "",
  country: "BRA",
  number: "",
  phone: "",
  state: "",
  streetAddress: "",
  zipCode: "",
};

const kycUserIdPaths = [
  ["kycUserId"],
  ["data", "kycUserId"],
  ["profile", "kycUserId"],
  ["data", "profile", "kycUserId"],
] as const;

const iframeUrlPaths = [
  ["iframeUrl"],
  ["kycUrl"],
  ["data", "iframeUrl"],
  ["data", "kycUrl"],
  ["bigdatacorp", "webViewLink"],
  ["data", "bigdatacorp", "webViewLink"],
] as const;

export function buildBigDataKycSessionBody(
  form: BigDataKycSessionForm,
): Record<string, unknown> {
  const cpf = trimOrNull(form.cpf);
  const email = trimOrNull(form.email);
  const walletAddress = trimOrNull(form.walletAddress);
  const externalUserId = trimOrNull(form.externalUserId);
  const body: Record<string, unknown> = {};

  if (cpf) {
    body.cpf = cpf;
  }

  if (email) {
    body.email = email;
  }

  if (walletAddress) {
    body.walletAddress = walletAddress;
  }

  if (externalUserId) {
    body.externalUserId = externalUserId;
  }

  return body;
}

export function buildBigDataKycSubmitBody({
  address,
  kycUserId,
}: {
  address: BigDataKycAddressForm;
  kycUserId: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    address: {
      city: address.city.trim(),
      country: address.country.trim() || "BRA",
      number: address.number.trim(),
      state: address.state.trim(),
      streetAddress: address.streetAddress.trim(),
      zipCode: address.zipCode.trim(),
    },
    kycUserId: kycUserId.trim(),
  };
  const complement = trimOrNull(address.complement);
  const phone = trimOrNull(address.phone);

  if (complement) {
    (body.address as Record<string, string>).complement = complement;
  }

  if (phone) {
    body.phone = phone;
  }

  return body;
}

export function readBigDataKycUserId(payload: unknown): string | null {
  return firstStringAtPath(payload, kycUserIdPaths);
}

export function readBigDataIframeUrl(payload: unknown): string | null {
  return firstStringAtPath(payload, iframeUrlPaths);
}

export function hasRequiredBigDataSessionFields(
  form: BigDataKycSessionForm,
): boolean {
  return Boolean(
    trimOrNull(form.cpf) &&
      trimOrNull(form.email) &&
      trimOrNull(form.walletAddress),
  );
}

export function hasRequiredBigDataSubmitFields(
  address: BigDataKycAddressForm,
): boolean {
  return Boolean(
    trimOrNull(address.city) &&
      trimOrNull(address.number) &&
      trimOrNull(address.state) &&
      trimOrNull(address.streetAddress) &&
      trimOrNull(address.zipCode),
  );
}
