# API Reference

Full interactive docs are also served as part of the frontend at `frontend/docs/index.html`. This file is the source-of-truth summary.

Base URL: `{API_URL}` (e.g. `https://cymor-messaging-api.onrender.com/api/v1`)

## Auth model

Two separate authentication schemes exist and are never interchangeable:

1. **Dashboard (session-based):** `Authorization: Bearer <accessToken>` + `X-Organization-Id: <organizationId>`. Used by the frontend dashboard. Routes live under `/api/v1/dashboard/...`, `/api/v1/organizations`, `/api/v1/whatsapp`, `/api/v1/conversations`, `/api/v1/campaigns`, `/api/v1/automations`, `/api/v1/media`, `/api/v1/analytics`, `/api/v1/audit-logs`, `/api/v1/notifications`.
2. **Public Developer API (API-key based):** `X-API-Key: cym_live_...` or `cym_test_...`. No session, no organization header — the key itself resolves the organization. Routes live directly under `/api/v1/...` (see below).

## Public Developer API

| Method | Path | Description |
|---|---|---|
| POST | `/v1/messages` | Send a message (text/template/image/document/audio/video/interactive) |
| GET | `/v1/messages` | List messages, cursor-paginated |
| GET | `/v1/messages/:id` | Fetch one message |
| GET | `/v1/contacts` | List contacts |
| POST | `/v1/contacts` | Create a contact |
| GET | `/v1/contacts/:id` | Fetch a contact |
| PATCH | `/v1/contacts/:id` | Update a contact |
| DELETE | `/v1/contacts/:id` | Delete a contact |
| GET | `/v1/templates` | List templates and their Meta approval status |
| POST | `/v1/otp/send` | Send a one-time code over WhatsApp |
| POST | `/v1/otp/verify` | Verify a one-time code |
| GET | `/v1/webhooks` | List your registered webhooks |
| POST | `/v1/webhooks` | Register a new webhook |
| DELETE | `/v1/webhooks/:id` | Remove a webhook |
| GET | `/v1/usage` | Usage records by metric and day |

## Response envelope

```json
{ "success": true, "data": { }, "requestId": "req_..." }
```
```json
{ "success": false, "error": { "code": "WHATSAPP_NOT_CONNECTED", "message": "..." }, "requestId": "req_..." }
```

## Errors

Common codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `INVALID_TOKEN`, `FORBIDDEN`, `NOT_AN_ORGANIZATION_MEMBER`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `WHATSAPP_NOT_CONNECTED`, `WHATSAPP_PROVIDER_ERROR`, `META_NOT_CONFIGURED`, `CLOUDINARY_NOT_CONFIGURED`, `INTERNAL_ERROR`.

## Rate limits

| Class | Limit |
|---|---|
| Auth (`/auth/*`) | 20 / 15 min, per IP |
| Dashboard | 300 / min, per user |
| Public API | 120 / min, per API key |
| OTP | 5 / min, per API key |
| Inbound webhooks | 600 / min, global |
