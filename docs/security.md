# Security

## Secrets

- All configuration is loaded and validated through `zod` in `backend/src/config/env.ts` — the process refuses to start if a required secret is missing or too short.
- WhatsApp access tokens are encrypted at rest with AES-256-GCM (`backend/src/utils/encryption.ts`) before being stored in `WhatsAppAccount.encryptedAccessToken`, which is also a `select: false` field — it is never returned from a query unless explicitly requested.
- API keys are never stored in reversible form — only a SHA-256 hash (`ApiKey.keyHash`, `select: false`). The raw key is shown exactly once, at creation or rotation time.
- Passwords are hashed with bcrypt (cost factor 12). OTP codes are hashed the same way conceptually (SHA-256) and are never stored or logged in plaintext.

## Tenant isolation

Every organization-owned collection carries a required, indexed `organizationId`. The `requireOrganization()` middleware (`backend/src/auth/tenant.ts`) is the single point where a request's organization context is established:

1. The client sends `X-Organization-Id`.
2. The server looks up an **active** `OrganizationMember` record for `(organizationId, req.userId)`.
3. If none exists, the request is rejected (`403 NOT_AN_ORGANIZATION_MEMBER`) — the header alone grants nothing.
4. Only then is `req.organizationId` set, and every downstream service filters its queries by that value.

No route handler, service, or repository in this codebase should ever read an organization ID from `req.body`, `req.query`, or `req.params` and use it for a database filter. `tests/multiTenancy.test.ts` verifies this end-to-end: cross-organization reads, updates, and deletes all return `404`, and audit logs are scoped per organization.

## RBAC

Roles (`OWNER`, `ADMIN`, `DEVELOPER`, `AGENT`, `ANALYST`) are enforced by `requireRole(...)` middleware, always applied after `requireOrganization()`. Route-by-route classification:

| Class | Example | Middleware |
|---|---|---|
| Public | `/auth/register`, `/auth/login` | none (rate limited) |
| Authenticated user | `/auth/me`, `/organizations/mine` | `authenticate` |
| Organization member | `/conversations`, `/contacts` | `authenticate` + `requireOrganization()` |
| Role restricted | `/organizations/members/invite` | + `requireRole("OWNER","ADMIN")` |
| API key | `/api/v1/messages`, `/api/v1/contacts` (public API) | `authenticateApiKey` |
| Webhook | `/webhooks/meta` | signature verification, no user/session |

The frontend never gates access on its own — every permission check is re-verified server-side.

## Webhook security

- **Inbound** (Meta → Cymor): every POST is verified against `X-Hub-Signature-256` using `META_APP_SECRET` (`backend/src/integrations/meta/metaClient.ts#verifyWebhookSignature`) before the body is parsed or trusted.
- **Outbound** (Cymor → developer's URL): every delivery is signed with a per-webhook secret via `X-Cymor-Signature` (HMAC-SHA256), shown once at webhook creation.
- **Idempotency**: inbound events are deduplicated by Meta's own message/status ID before any write (`RawMetaEvent`, unique `dedupeKey`) — a retried delivery can never create a duplicate `Message`. See `tests/webhookIdempotency.test.ts`.

## Rate limiting

Redis-backed, split by traffic class (`backend/src/middleware/rateLimiters.ts`): authentication, dashboard, public API (keyed by API key, not IP), OTP (tightest — 5/minute), and inbound webhooks.

## Logging

- Structured logs (`winston`) redact any field whose key contains `password`, `token`, `secret`, `otp`, or `authorization`.
- The centralized error handler never returns a stack trace in production responses.
- API request logs (`ApiLog`) capture method/endpoint/status/duration/requestId — never request or response bodies.

## Testing

`backend/tests/` covers: registration/login/duplicate-email rejection, multi-tenant isolation (cross-org read/update/delete all fail), API key lifecycle (create → authenticate → revoke → immediately stops working), OTP (correct/incorrect code, max attempts, expiry, resend cooldown), and webhook idempotency (duplicate Meta deliveries never create duplicate messages).
