import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

interface Session {
  accessToken: string;
  organizationId: string;
}

async function registerAndLogin(email: string, orgName: string): Promise<Session> {
  await request(app).post("/api/v1/auth/register").send({
    fullName: "Test User",
    email,
    password: "correcthorse123",
    organizationName: orgName,
  });
  const login = await request(app).post("/api/v1/auth/login").send({ email, password: "correcthorse123" });
  return {
    accessToken: login.body.data.accessToken,
    organizationId: login.body.data.organizations[0].organizationId._id ?? login.body.data.organizations[0].organizationId,
  };
}

function authed(session: Session) {
  return {
    Authorization: `Bearer ${session.accessToken}`,
    "X-Organization-Id": session.organizationId,
  };
}

describe("Multi-tenant isolation", () => {
  let orgA: Session;
  let orgB: Session;

  beforeEach(async () => {
    orgA = await registerAndLogin("owner-a@cymortech.dev", "Organization A");
    orgB = await registerAndLogin("owner-b@cymortech.dev", "Organization B");
  });

  it("rejects a request with no X-Organization-Id header on org-scoped routes", async () => {
    const res = await request(app).get("/api/v1/dashboard/contacts").set("Authorization", `Bearer ${orgA.accessToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ORGANIZATION_ID_REQUIRED");
  });

  it("rejects a request where the caller has no membership in the claimed organization", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/contacts")
      .set("Authorization", `Bearer ${orgA.accessToken}`)
      .set("X-Organization-Id", orgB.organizationId); // orgA's user has no membership in orgB

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("NOT_AN_ORGANIZATION_MEMBER");
  });

  it("never returns Organization B's contacts to Organization A, even when queried directly by ID", async () => {
    const createRes = await request(app)
      .post("/api/v1/dashboard/contacts")
      .set(authed(orgB))
      .send({ name: "Org B Customer", phone: "254700111222" });
    expect(createRes.status).toBe(201);
    const orgBContactId = createRes.body.data._id;

    // Org A must not see it in a list...
    const listRes = await request(app).get("/api/v1/dashboard/contacts").set(authed(orgA));
    expect(listRes.body.data.find((c: { _id: string }) => c._id === orgBContactId)).toBeUndefined();

    // ...and must not be able to fetch it directly by ID either.
    const getRes = await request(app).get(`/api/v1/dashboard/contacts/${orgBContactId}`).set(authed(orgA));
    expect(getRes.status).toBe(404);
  });

  it("never allows Organization A to update or delete Organization B's contact", async () => {
    const createRes = await request(app).post("/api/v1/dashboard/contacts").set(authed(orgB)).send({ name: "Protected", phone: "254700333444" });
    const orgBContactId = createRes.body.data._id;

    const updateRes = await request(app).patch(`/api/v1/dashboard/contacts/${orgBContactId}`).set(authed(orgA)).send({ name: "Hacked" });
    expect(updateRes.status).toBe(404);

    const deleteRes = await request(app).delete(`/api/v1/dashboard/contacts/${orgBContactId}`).set(authed(orgA));
    expect(deleteRes.status).toBe(404);

    // Confirm it's untouched from Org B's own perspective.
    const confirmRes = await request(app).get(`/api/v1/dashboard/contacts/${orgBContactId}`).set(authed(orgB));
    expect(confirmRes.body.data.name).toBe("Protected");
  });

  it("keeps audit logs scoped per organization", async () => {
    await request(app).post("/api/v1/dashboard/contacts").set(authed(orgA)).send({ name: "A1", phone: "254700555666" });
    await request(app).post("/api/v1/dashboard/contacts").set(authed(orgB)).send({ name: "B1", phone: "254700777888" });

    const orgALogs = await request(app).get("/api/v1/audit-logs").set(authed(orgA));
    const actions = orgALogs.body.data.map((l: { resource: string }) => l.resource);
    expect(actions).toContain("contact");
    expect(orgALogs.body.data.every((l: { organizationId: string }) => l.organizationId === orgA.organizationId)).toBe(true);
  });
});
