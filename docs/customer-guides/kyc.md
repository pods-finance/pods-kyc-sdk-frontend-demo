# KYC and Sumsub Share Token Guide

This guide shows how to integrate Sumsub reusable KYC with Pods.

Use this flow when your application wants a user to complete KYC in Sumsub,
share the approved KYC result with Avenia, and then unlock Pods onramp/offramp
routes for that user's wallet.

## What Your Backend Owns

Your backend should:

1. Generate Sumsub WebSDK access tokens.
2. Detect when a Sumsub applicant is approved.
3. Generate a fresh Sumsub share token for Avenia.
4. Submit that share token to Pods.
5. Store the returned `kycUserId`.
6. Poll Pods KYC status before enabling money movement.

The browser should only receive short-lived Sumsub WebSDK access tokens and
non-secret Pods API responses.

## Required Configuration

Pods provides:

```env
PODS_API_BASE_URL="https://deframe-picn-papais-brl-brpga0.herokuapp.com"
PODS_API_KEY="<provided-by-pods>"
AVENIA_FOR_CLIENT_ID="<provided-by-pods>"
```

Your Sumsub account provides:

```env
SUMSUB_API_BASE_URL="https://api.sumsub.com"
SUMSUB_APP_TOKEN="<your-sumsub-app-token>"
SUMSUB_SECRET_KEY="<your-sumsub-secret-key>"
SUMSUB_LEVEL_NAME="pods-kyc-level"
```

The Sumsub app token must include permission to share applicant data through
Reusable Identity. If this permission is missing, Sumsub can reject share token
generation with `403`.

## Step 1: Create a Sumsub WebSDK Token

Your backend calls Sumsub:

```http
POST /resources/accessTokens/sdk
```

Example request body:

```json
{
  "userId": "your-user-reference",
  "levelName": "pods-kyc-level",
  "ttlInSecs": 600
}
```

This request must be signed with your Sumsub app token and secret key.

The demo implementation is in:

- `src/lib/customer-simulator/sumsub.ts`
- `src/app/api/demo/kyc-session/route.ts`

Important: collect and persist the user's `email` and `walletAddress` before
starting Sumsub. Pods needs both when you submit the share token.

## Step 2: Launch Sumsub WebSDK

Send the generated access token to your frontend and initialize Sumsub WebSDK.

The user completes the verification in Sumsub. Your app should keep enough
state to map the approved Sumsub applicant back to:

- `email`
- `walletAddress`
- Sumsub `applicantId`

## Step 3: Wait for an Approved Applicant

Continue only when the applicant result is approved:

```text
type=applicantReviewed
reviewStatus=completed
reviewResult.reviewAnswer=GREEN
```

You can detect this through a Sumsub webhook or by polling Sumsub from your
backend. The demo uses a webhook because it is convenient for local testing,
but polling is also acceptable if your backend owns the Sumsub credentials.

If Sumsub returns `reviewAnswer=RED`, do not submit a share token to Pods.
Surface the rejection reason to your user or support team.

The demo's GREEN check is in:

- `src/lib/customer-simulator/webhook.ts`

## Step 4: Generate a Sumsub Share Token

After Sumsub returns `GREEN`, your backend calls Sumsub:

```http
POST /resources/accessTokens/shareToken
```

Example request body:

```json
{
  "applicantId": "SUMSUB_APPLICANT_ID",
  "forClientId": "AVENIA_FOR_CLIENT_ID",
  "ttlInSecs": 600
}
```

Rules:

- Generate the share token only after approval.
- Generate a fresh token for each submission to Pods.
- Do not store the token.
- Submit it to Pods immediately.

## Step 5: Submit the Share Token to Pods

Your backend calls Pods:

```http
POST /api/v1/kyc/sumsub-share-token
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
Content-Type: application/json
```

Example request body:

```json
{
  "shareToken": "SUMSUB_SHARE_TOKEN",
  "sumsubApplicantId": "SUMSUB_APPLICANT_ID",
  "email": "user@example.com",
  "walletAddress": "0x0000000000000000000000000000000000000001"
}
```

Required fields:

- `shareToken`: fresh Sumsub share token generated for Avenia.
- `sumsubApplicantId`: Sumsub applicant id used for traceability.
- `email`: user's email.
- `walletAddress`: user's EVM wallet address.

Example successful response:

```json
{
  "kycUserId": "kyc_123",
  "status": "approved"
}
```

Store `kycUserId`. Use it to poll KYC status and support future operations.

The demo implementation is in:

- `src/app/api/customer-webhooks/sumsub/route.ts`
- `src/lib/customer-simulator/pods.ts`

## Step 6: Poll Pods KYC Status

Your backend can check the KYC state:

```http
GET /api/v1/kyc/status?kycUserId=KYC_USER_ID
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
```

Enable onramp/offramp only when status is approved.

Expected high-level statuses:

- `created`: local profile exists but provider processing has not finished.
- `provider_pending`: Pods submitted the KYC to the provider and is waiting.
- `approved`: money movement can be enabled.
- `rejected` or `rejected_retryable`: show the rejection reason or retry path.
- `blocked`: do not allow money movement.

## Production Checklist

- Sumsub level name is exactly `pods-kyc-level`.
- Sumsub app token has Reusable Identity sharing permission.
- Avenia recipient is configured in Sumsub.
- `AVENIA_FOR_CLIENT_ID` is provided by Pods.
- Pods API key is only used server-side.
- `email` and `walletAddress` are stored before starting Sumsub.
- Share tokens are not stored or reused.
