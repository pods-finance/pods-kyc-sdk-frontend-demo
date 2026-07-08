# KYC Provider Guide

This guide shows how to integrate the Pods KYC API with either supported
provider:

- Sumsub reusable KYC share token.
- BigDataCorp hosted iframe.

Both providers end in the same place: a Pods `kycUserId` with canonical status
available through `GET /api/v1/kyc/status`. Enable onramp/offramp only when that
status is `approved`.

## Integration Rule

Your browser should never call BigDataCorp, Avenia, or Pods with secret
credentials directly. Your frontend should call your backend, and your backend
should call Pods with `PODS_API_KEY`.

In this demo repository, the Next.js route below simulates that customer
backend:

```text
POST /api/demo/pods
```

The demo proxy is intentionally allowlisted and attaches `PODS_KYC_API_KEY`
server-side. For BigDataCorp, this means the browser calls Pods endpoints only;
if Pods needs to call BigDataCorp `CheckResults`, that happens inside the Pods
API, not in the customer frontend.

## Required Configuration

Pods provides:

```env
PODS_API_BASE_URL="https://deframe-picn-papais-brl-brpga0.herokuapp.com"
PODS_API_KEY="<provided-by-pods>"
AVENIA_FOR_CLIENT_ID="<provided-by-pods>"
```

If you use Sumsub, your Sumsub account also provides:

```env
SUMSUB_API_BASE_URL="https://api.sumsub.com"
SUMSUB_APP_TOKEN="<your-sumsub-app-token>"
SUMSUB_SECRET_KEY="<your-sumsub-secret-key>"
SUMSUB_LEVEL_NAME="pods-kyc-level"
```

The Sumsub app token must include permission to share applicant data through
Reusable Identity. If this permission is missing, Sumsub can reject share token
generation with `403`.

## Provider Option 1: Sumsub Share Token

Use this flow when your application already owns Sumsub WebSDK and wants to
share an approved applicant with Avenia through Pods.

### Step 1: Create a Sumsub WebSDK Token

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

### Step 2: Launch Sumsub WebSDK

Send the generated access token to your frontend and initialize Sumsub WebSDK.

The user completes the verification in Sumsub. Your app should keep enough
state to map the approved Sumsub applicant back to:

- `email`
- `walletAddress`
- Sumsub `applicantId`

### Step 3: Wait for an Approved Applicant

Continue only when the applicant result is approved:

```text
type=applicantReviewed
reviewStatus=completed
reviewResult.reviewAnswer=GREEN
```

You can detect this through a Sumsub webhook or by polling Sumsub from your
backend. The demo uses a webhook because it is convenient for local testing, but
polling is also acceptable if your backend owns the Sumsub credentials.

If Sumsub returns `reviewAnswer=RED`, do not submit a share token to Pods.
Surface the rejection reason to your user or support team.

The demo's GREEN check is in:

- `src/lib/customer-simulator/webhook.ts`

### Step 4: Generate a Sumsub Share Token

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

### Step 5: Submit the Share Token to Pods

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

## Provider Option 2: BigDataCorp Iframe

Use this flow when you want Pods to own the BigDataCorp provider interaction.
Your frontend/backend creates a Pods KYC session, displays the iframe returned
by Pods, polls Pods for status, and then sends address data to Pods only when
the verified capture is ready to be submitted to Avenia.

### Step 1: Create the BigDataCorp Iframe Session

Your backend calls Pods:

```http
POST /api/v1/kyc/bigdatacorp/sessions
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
Content-Type: application/json
```

Example request body:

```json
{
  "cpf": "CPF_FROM_USER",
  "email": "user@example.com",
  "walletAddress": "0x0000000000000000000000000000000000000001",
  "externalUserId": "optional-customer-user-reference"
}
```

Required fields:

- `cpf`: user CPF collected by your application.
- `email`: user's email.
- `walletAddress`: user's EVM wallet address.

Optional fields:

- `externalUserId`: your internal user reference.
- `restartExistingSession`: use only when your product intentionally wants to
  replace an unfinished BigDataCorp session for the same customer/user.

Example successful response:

```json
{
  "kycUserId": "kyc_123",
  "provider": "bigdatacorp",
  "iframeUrl": "https://provider.example/iframe",
  "status": "created"
}
```

Store `kycUserId` immediately. It is the stable Pods identifier used for every
later status and submit call.

### Step 2: Display the Iframe

Open the `iframeUrl` in your frontend. The user completes document capture and
liveness inside the provider iframe.

Do not call BigDataCorp directly from the browser. The iframe URL is the only
provider-facing value your frontend needs.

### Step 3: Poll Pods KYC Status

Your backend can poll Pods:

```http
GET /api/v1/kyc/status?kycUserId=KYC_USER_ID
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
```

Pods owns the provider polling. If the BigDataCorp result needs to be refreshed,
Pods will call BigDataCorp server-side, update the KYC profile, and return the
canonical status response to you.

Example response while the iframe capture is still in progress:

```json
{
  "kycUserId": "kyc_123",
  "provider": "bigdatacorp",
  "status": "created",
  "providerResult": "PENDING_CAPTURE",
  "documentStatus": "captured",
  "livenessStatus": "captured",
  "brlaEnabled": false
}
```

Example response when Pods is ready for the final Avenia submit step:

```json
{
  "kycUserId": "kyc_123",
  "provider": "bigdatacorp",
  "status": "created",
  "providerResult": "WAITING_ADDRESS_TO_SUBMIT_TO_AVENIA",
  "documentStatus": "passed",
  "livenessStatus": "passed",
  "ageAtVerification": 26,
  "birthDate": "2000-01-01",
  "brlaEnabled": false
}
```

### Step 4: Submit Verified BigDataCorp KYC to Avenia

Once Pods status shows the BigDataCorp capture is ready, your backend sends the
address fields needed by Avenia:

```http
POST /api/v1/kyc/bigdatacorp/submit
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
Content-Type: application/json
```

Example request body:

```json
{
  "kycUserId": "kyc_123",
  "address": {
    "country": "BRA",
    "state": "SP",
    "city": "Sao Paulo",
    "zipCode": "01001000",
    "streetAddress": "Avenida Example",
    "number": "100",
    "complement": "optional"
  },
  "phone": "+5511999999999"
}
```

Required fields:

- `kycUserId`
- `address.state`
- `address.city`
- `address.zipCode`
- `address.streetAddress`
- `address.number`

Pods uses the verified BigDataCorp capture and the address fields to submit KYC
to Avenia. The address is transit data for this request and should not be stored
by your frontend.

Example response:

```json
{
  "kycUserId": "kyc_123",
  "provider": "bigdatacorp",
  "status": "provider_pending",
  "brlaEnabled": false
}
```

After this submit, keep polling `GET /api/v1/kyc/status?kycUserId=...` until the
status becomes `approved` or a rejection state.

## Canonical KYC Status

This endpoint is shared by both providers:

```http
GET /api/v1/kyc/status?kycUserId=KYC_USER_ID
Authorization: Bearer PODS_API_KEY
x-api-key: PODS_API_KEY
```

Expected high-level statuses:

- `created`: local profile exists, iframe/session is open, or provider capture
  has not been submitted to Avenia yet.
- `provider_pending`: Pods submitted the KYC to Avenia and is waiting for the
  final result.
- `approved`: money movement can be enabled.
- `rejected` or `rejected_retryable`: show the rejection reason or retry path.
- `blocked`: do not allow money movement.

Provider-specific details can appear as auxiliary fields:

- `provider`
- `providerStatus`
- `providerResult`
- `providerMessage`
- `documentStatus`
- `livenessStatus`
- `ageAtVerification`
- `birthDate`
- `rejectReason`

Your product should use the public `status` as the gating field for onramp and
offramp. Use provider-specific fields for support/debugging.

## Production Checklist

- Pods API key is only used server-side.
- Browser calls your backend, not BigDataCorp, Avenia, or Pods directly with
  secrets.
- If using Sumsub, level name is exactly `pods-kyc-level`.
- If using Sumsub, the app token has Reusable Identity sharing permission.
- If using Sumsub, Avenia recipient is configured in Sumsub.
- `AVENIA_FOR_CLIENT_ID` is provided by Pods.
- `email` and `walletAddress` are stored before starting either provider flow.
- Sumsub share tokens are not stored or reused.
- Full CPF, address, document images, and raw provider payloads are not stored
  in browser state.
