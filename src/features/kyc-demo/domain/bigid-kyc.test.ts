import { describe, expect, it } from "vitest";
import {
  buildBigDataKycSessionBody,
  buildBigDataKycSubmitBody,
  hasRequiredBigDataSessionFields,
  hasRequiredBigDataSubmitFields,
  readBigDataIframeUrl,
  readBigDataKycUserId,
} from "./bigid-kyc";

describe("BigDataCorp KYC helpers", () => {
  it("builds the session body with only supported fields", () => {
    expect(
      buildBigDataKycSessionBody({
        cpf: " CPF_FROM_USER ",
        email: " user@example.com ",
        externalUserId: " customer-user-1 ",
        walletAddress: " 0x0000000000000000000000000000000000000001 ",
      }),
    ).toEqual({
      cpf: "CPF_FROM_USER",
      email: "user@example.com",
      externalUserId: "customer-user-1",
      walletAddress: "0x0000000000000000000000000000000000000001",
    });
  });

  it("omits optional externalUserId when it is empty", () => {
    expect(
      buildBigDataKycSessionBody({
        cpf: "CPF_FROM_USER",
        email: "user@example.com",
        externalUserId: " ",
        walletAddress: "0x0000000000000000000000000000000000000001",
      }),
    ).toEqual({
      cpf: "CPF_FROM_USER",
      email: "user@example.com",
      walletAddress: "0x0000000000000000000000000000000000000001",
    });
  });

  it("builds the Avenia submit body without persisting unrelated data", () => {
    expect(
      buildBigDataKycSubmitBody({
        address: {
          city: " Campinas ",
          complement: " apto 12 ",
          country: "",
          number: " 42 ",
          phone: " 5519999999999 ",
          state: " SP ",
          streetAddress: " Rua Teste ",
          zipCode: " 13000000 ",
        },
        kycUserId: " 8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa ",
      }),
    ).toEqual({
      address: {
        city: "Campinas",
        complement: "apto 12",
        country: "BRA",
        number: "42",
        state: "SP",
        streetAddress: "Rua Teste",
        zipCode: "13000000",
      },
      kycUserId: "8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa",
      phone: "5519999999999",
    });
  });

  it("detects required session and submit fields", () => {
    expect(
      hasRequiredBigDataSessionFields({
        cpf: "CPF_FROM_USER",
        email: "user@example.com",
        externalUserId: "",
        walletAddress: "0x0000000000000000000000000000000000000001",
      }),
    ).toBe(true);
    expect(
      hasRequiredBigDataSubmitFields({
        city: "Campinas",
        complement: "",
        country: "BRA",
        number: "42",
        phone: "",
        state: "SP",
        streetAddress: "Rua Teste",
        zipCode: "13000000",
      }),
    ).toBe(true);
  });

  it("reads identifiers from native and wrapped API responses", () => {
    expect(
      readBigDataKycUserId({
        data: { kycUserId: "8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa" },
      }),
    ).toBe("8d07aa27-b7ea-4cf2-8cdb-c379ee5063aa");
    expect(
      readBigDataIframeUrl({
        bigdatacorp: { webViewLink: "https://iframe.example/session" },
      }),
    ).toBe("https://iframe.example/session");
  });
});
