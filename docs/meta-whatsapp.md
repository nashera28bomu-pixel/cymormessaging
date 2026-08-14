# Meta / WhatsApp Setup

Cymor Messaging uses the official **WhatsApp Business Platform (Cloud API)** via **Embedded Signup**, Meta's current supported onboarding flow (v4, generally available; v2 is deprecated and Meta has announced its retirement on **October 15, 2026** — do not build against v2). No unofficial automation, QR scraping, or session hijacking is used anywhere in this codebase.

## 1. Create a Meta Developer app

1. Go to [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → **Business** type.
2. Add the **WhatsApp** product to the app.
3. Note your **App ID** and **App Secret** (App Settings → Basic) → `META_APP_ID`, `META_APP_SECRET`.

## 2. Set up Embedded Signup

1. In the app dashboard, go to WhatsApp → Embedded Signup (or Configuration) and create a **configuration** — this defines what the launched signup flow looks like and what assets it can create/attach.
2. Copy the resulting **Configuration ID** → `META_CONFIGURATION_ID`.
3. The frontend (`frontend/dashboard/whatsapp.html`) loads the Facebook JS SDK and calls `FB.login()` with this `config_id`. On completion, Meta posts a `message` event to the browser containing the new `waba_id` and `phone_number_id`, and `FB.login`'s own callback returns a short-lived `code`.

## 3. Exchange the code for a token

The frontend sends `{ code, wabaId, phoneNumberId }` to `POST /api/v1/whatsapp/connect`. The backend (`backend/src/integrations/meta/metaClient.ts#exchangeCodeForToken`) exchanges the code for a long-lived system user access token via `GET /oauth/access_token`, fetches WABA + phone number details, subscribes the app to the WABA's webhook events, and stores the token **encrypted** (`WhatsAppAccount.encryptedAccessToken`).

## 4. Webhook configuration

1. In the app dashboard, WhatsApp → Configuration → Webhooks, set the callback URL to `https://<your-backend-domain>/webhooks/meta`.
2. Set the verify token to the same value as `META_VERIFY_TOKEN` in your environment.
3. Subscribe to at least the `messages` field (covers inbound messages and status updates).
4. Meta will immediately perform a `GET` handshake against your callback URL with `hub.mode`, `hub.verify_token`, and `hub.challenge` — handled by `backend/src/webhooks/metaWebhook.controller.ts#verify`.

## 5. Required environment variables

| Variable | Required for | Notes |
|---|---|---|
| `META_APP_ID` | Embedded Signup, webhook signature | |
| `META_APP_SECRET` | Token exchange, webhook signature verification | |
| `META_GRAPH_API_VERSION` | All Graph API calls | Defaults to `v20.0`; bump periodically per Meta's version deprecation schedule |
| `META_VERIFY_TOKEN` | Webhook handshake | Any random string you choose |
| `META_SYSTEM_USER_ACCESS_TOKEN` | Only used to determine `metaIsConfigured` at boot | Per-account tokens are obtained dynamically via Embedded Signup, not this variable |
| `META_CONFIGURATION_ID` | Embedded Signup launch | From step 2 |

## 6. Development vs. production

- Use a Meta **test WhatsApp number** and a test WABA during development — Embedded Signup supports sandbox-style testing without a real business phone number.
- Production requires a real, verified WhatsApp Business Account and adherence to Meta's messaging policies (24-hour customer service window, template approval for business-initiated conversations, etc.) — enforced by Meta itself, not by Cymor.
- `META_GRAPH_API_VERSION` should be bumped roughly annually as Meta deprecates older Graph API versions; check the [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog) before upgrading.

## 7. Common Meta errors

| Error | Likely cause |
|---|---|
| `(#100) Invalid parameter` | Malformed template components or missing required fields |
| `(#131056) Message failed to send because more than 24 hours have passed` | Free-form (non-template) message sent outside the 24-hour customer service window — use an approved template instead |
| `(#10) Permission denied` | System user token missing the `whatsapp_business_messaging` permission, or app not yet approved for the number's tier |
| Webhook handshake `403` | `META_VERIFY_TOKEN` mismatch between your `.env` and the App Dashboard |

## 8. Testing the integration

1. Connect a test WhatsApp number via the dashboard's "Connect WhatsApp" flow.
2. Send yourself a text message from that number - it should appear in the shared inbox within a couple of seconds (delivered via the `/webhooks/meta` webhook, not polling).
3. Reply from the dashboard inbox - confirm delivery/read receipts update the message status in near-real-time.
