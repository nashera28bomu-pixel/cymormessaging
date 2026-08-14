# Database

MongoDB Atlas + Mongoose. Every collection below except `User` and `RawMetaEvent` carries a required, indexed `organizationId` — see `docs/security.md` for how tenant isolation is enforced at the query layer.

| Collection | Model file | Purpose |
|---|---|---|
| `User` | `modules/users/user.model.ts` | Global identity, not tenant-scoped |
| `Organization` | `modules/organizations/organization.model.ts` | Tenant root |
| `OrganizationMember` | `modules/organizations/organizationMember.model.ts` | User↔Org join + role (RBAC) |
| `AuditLog` | `modules/audit-logs/auditLog.model.ts` | Important account/security actions |
| `WhatsAppAccount` | `modules/whatsapp/whatsappAccount.model.ts` | Connected WABA + phone number, encrypted token |
| `Contact` | `modules/contacts/contact.model.ts` | Customers reachable on WhatsApp |
| `Conversation` | `modules/conversations/conversation.model.ts` | Inbox thread per contact per WhatsApp account |
| `Message` | `modules/messages/message.model.ts` | Every inbound/outbound message + delivery status |
| `Template` | `modules/templates/template.model.ts` | Cymor-side mirror of Meta template state |
| `Campaign` / `CampaignRecipient` | `modules/campaigns/campaign.model.ts` | Bulk template sends, one recipient row per contact |
| `Automation` / `AutomationExecution` | `modules/automations/automation.model.ts` | Trigger→action rules + execution history |
| `OtpRequest` | `modules/otp/otpRequest.model.ts` | Hashed OTP codes, TTL-indexed for auto-cleanup |
| `ApiKey` | `modules/api-keys/apiKey.model.ts` | Hashed developer API credentials |
| `Webhook` / `WebhookDelivery` | `modules/webhooks/webhook.model.ts` | Developer-configured outbound event subscriptions |
| `RawMetaEvent` | `modules/webhooks/rawMetaEvent.model.ts` | Inbound webhook dedupe ledger (not tenant-scoped - keyed by Meta's own event ID) |
| `Media` | `modules/media/media.model.ts` | Cloudinary asset metadata |
| `UsageRecord` | `modules/analytics/usageRecord.model.ts` | Daily per-metric counters, designed for future billing |
| `ApiLog` | `modules/analytics/apiLog.model.ts` | Public API request log |
| `Notification` | `modules/notifications/notification.model.ts` | In-dashboard alerts |

## Key indexes

- `OrganizationMember`: unique on `(organizationId, userId)`.
- `Contact`: unique on `(organizationId, phone)` — prevents duplicate contacts.
- `Message`: unique+sparse on `providerMessageId` (Meta's own message ID) — the idempotency guarantee for webhook processing; compound `(organizationId, createdAt)` and `(organizationId, conversationId, createdAt)` for pagination.
- `Template`: unique on `(organizationId, name, language)`.
- `CampaignRecipient`: unique on `(campaignId, contactId)`.
- `OtpRequest`: TTL index on `expiresAt` (auto-deletes an hour after expiry).
- `RawMetaEvent`: unique on `dedupeKey`.

## Multi-tenant query rule

Every service function in `modules/*/*.service.ts` takes `organizationId` as an explicit parameter and includes it in every `find`/`findOne`/`update`/`delete` filter. This is verified by `tests/multiTenancy.test.ts`.
