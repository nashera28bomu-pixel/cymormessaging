# Architecture

## Directory layout

```
cymor-messaging/
├── README.md
├── .gitignore
├── .env.example
├── frontend/                  # Phase 17 - vanilla HTML/CSS/JS, mobile-first
├── backend/
│   └── src/
│       ├── server.ts          # boots DB then HTTP listener
│       ├── app.ts             # express app, middleware, route mounting
│       ├── config/            # env, logger, database, redis
│       ├── auth/              # tokens, authenticate, tenant/RBAC, auth module
│       ├── middleware/        # errorHandler, rateLimiters
│       ├── modules/
│       │   ├── users/                 ✅ Phase 2
│       │   ├── organizations/         ✅ Phase 3 (org + team + RBAC)
│       │   ├── audit-logs/            ✅ Phase 3 (model + recorder)
│       │   ├── whatsapp/              ⏳ Phase 4
│       │   ├── messages/              ⏳ Phase 5
│       │   ├── webhooks/              ⏳ Phase 6
│       │   ├── conversations/         ⏳ Phase 7
│       │   ├── contacts/              ⏳ Phase 8
│       │   ├── api-keys/              ⏳ Phase 9
│       │   ├── templates/             ⏳ Phase 10
│       │   ├── campaigns/             ⏳ Phase 11
│       │   ├── automations/           ⏳ Phase 12
│       │   ├── otp/                   ⏳ Phase 13
│       │   ├── media/                 ⏳ Phase 14
│       │   ├── analytics/             ⏳ Phase 15
│       │   └── notifications/         ⏳ Phase 33 concept, wired alongside relevant phases
│       ├── integrations/
│       │   ├── meta/          ⏳ Phase 4 - isolated Meta Graph API client
│       │   └── cloudinary/    ⏳ Phase 14
│       ├── queues/            ⏳ Phase 5+ - BullMQ queue definitions
│       ├── sockets/           ⏳ Phase 7 - Socket.io realtime layer
│       └── types/
├── worker/
│   └── src/
│       ├── worker.ts          # bootstraps DB connection, queue registration TBD
│       ├── processors/        ⏳ Phase 5+ - one processor per queue
│       └── jobs/
└── docs/
    ├── architecture.md        (this file)
    ├── database.md            ⏳ written as models are added per phase
    ├── api.md                 ⏳ Phase 17
    ├── deployment.md          ⏳ Phase 19
    ├── security.md            ⏳ Phase 18
    └── meta-whatsapp.md       ⏳ Phase 4
```

## Multi-tenancy model

```
Organization
    |
    +-- OrganizationMember (role: OWNER | ADMIN | DEVELOPER | AGENT | ANALYST)
    +-- WhatsAppAccount        (Phase 4)
    +-- Contact                (Phase 8)
    +-- Conversation           (Phase 7)
    +-- Message                (Phase 5)
    +-- Template                (Phase 10)
    +-- Campaign                (Phase 11)
    +-- Automation               (Phase 12)
    +-- ApiKey                    (Phase 9)
    +-- Webhook                    (Phase 6)
    +-- Media                       (Phase 14)
    +-- UsageRecord                  (Phase 15)
    +-- AuditLog                      ✅ Phase 3
```

**Rule enforced today:** every future model MUST include a required, indexed `organizationId` field, and every repository/service query MUST filter by `req.organizationId` as resolved server-side by `requireOrganization()` — never by any organization ID supplied directly in a request body, query string, or path param.

## Build order (from the original spec, tracked here)

1. Project architecture and configuration — **done**
2. Database and authentication — **done**
3. Organization and team system — **done**
4. Meta/WhatsApp integration
5. Messaging engine
6. Webhooks
7. Inbox and conversations (+ Socket.io realtime)
8. Contacts
9. Developer API / API keys
10. Templates
11. Campaigns
12. Automation
13. OTP
14. Cloudinary media
15. Analytics
16. Logs/auditing (extends audit log module already in place)
17. Frontend + documentation site
18. Testing/security hardening
19. Deployment configuration

## Key isolation boundaries

- **Meta integration** lives entirely under `backend/src/integrations/meta/`. Nothing outside that folder should call the Graph API directly — all WhatsApp sends go through a `MessagingService` abstraction (Phase 5) so a future provider change doesn't ripple through the app.
- **Queues** (`backend/src/queues/`) define job contracts; **workers** (`worker/src/processors/`) implement them. The API process only ever enqueues jobs — it never sends WhatsApp messages synchronously in a request/response cycle.
- **Webhook processing** must be idempotent: incoming Meta events carry IDs that are checked against stored `WebhookDelivery`/`Message.providerMessageId` records before any write, so retried webhook deliveries never create duplicate messages.
