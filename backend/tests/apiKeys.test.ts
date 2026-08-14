import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

async function registerAndLogin(email: string, orgName: string) {
  await request(app).post("/api/v1/auth/register").send({ fullName: "Dev User", email, password: "correcthorse123", organizationName: orgName });
  const login = await request(app).post("/api/v1/auth/login").send({ email, password: "correcthorse123" });
  const organizationId = login.body.data.organizations[0].organizationId._id ?? login.body.data.organizations[0].organizationId;
  return { accessToken: login.body.data.accessToken, organizationId };
}

describe("API keys", () => {
  let session: { accessToken: string; organizationId: string };

  beforeEach(async () => {
    session = await registerAndLogin("dev@cymortech.dev", "Dev Org");
  });

  it("creates a key, returns the raw secret exactly once, and authenticates the public API with it", async () => {
    const createRes = await request(app)
      .post("/api/v1/dashboard/api-keys")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .set("X-Organization-Id", session.organizationId)
      .send({ name: "Test key", environment: "test" });

    expect(createRes.status).toBe(201);
    const rawKey = createRes.body.data.key;
    expect(rawKey).toMatch(/^cym_test_/);

    // The stored record must never expose the raw key or its hash.
    const listRes = await request(app)
      .get("/api/v1/dashboard/api-keys")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .set("X-Organization-Id", session.organizationId);
    expect(listRes.body.data[0].keyHash).toBeUndefined();
    expect(listRes.body.data[0].key).toBeUndefined();

    // The raw key authenticates a public API request, with no session token at all.
    const publicRes = await request(app).get("/api/v1/contacts").set("X-API-Key", rawKey);
    expect(publicRes.status).toBe(200);
  });

  it("rejects the public API with a missing or invalid key", async () => {
    const missing = await request(app).get("/api/v1/contacts");
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe("API_KEY_REQUIRED");

    const invalid = await request(app).get("/api/v1/contacts").set("X-API-Key", "cym_live_not_a_real_key");
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe("INVALID_API_KEY");
  });

  it("stops authenticating immediately once a key is revoked", async () => {
    const createRes = await request(app)
      .post("/api/v1/dashboard/api-keys")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .set("X-Organization-Id", session.organizationId)
      .send({ name: "Revoke me", environment: "live" });

    const rawKey = createRes.body.data.key;
    const keyId = createRes.body.data.apiKey._id;

    await request(app)
      .post(`/api/v1/dashboard/api-keys/${keyId}/revoke`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .set("X-Organization-Id", session.organizationId)
      .expect(200);

    const afterRevoke = await request(app).get("/api/v1/contacts").set("X-API-Key", rawKey);
    expect(afterRevoke.status).toBe(401);
    expect(afterRevoke.body.error.code).toBe("INVALID_API_KEY");
  });
});
