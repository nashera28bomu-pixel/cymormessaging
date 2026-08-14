import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("Authentication", () => {
  it("registers a new user and their first organization", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      fullName: "Smiley Cymor",
      email: "smiley@cymortech.dev",
      password: "supersecret123",
      organizationName: "Cymor Tech Services",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("smiley@cymortech.dev");
    expect(res.body.data.organization.name).toBe("Cymor Tech Services");
  });

  it("rejects registration with a duplicate email", async () => {
    const payload = {
      fullName: "Dup User",
      email: "dup@cymortech.dev",
      password: "supersecret123",
      organizationName: "Org A",
    };
    await request(app).post("/api/v1/auth/register").send(payload).expect(201);

    const res = await request(app).post("/api/v1/auth/register").send(payload);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects registration with a weak password", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      fullName: "Weak Pass",
      email: "weak@cymortech.dev",
      password: "123",
      organizationName: "Org B",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in with correct credentials and returns tokens", async () => {
    await request(app).post("/api/v1/auth/register").send({
      fullName: "Login User",
      email: "login@cymortech.dev",
      password: "correcthorse123",
      organizationName: "Login Org",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "login@cymortech.dev",
      password: "correcthorse123",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.organizations).toHaveLength(1);
    expect(res.body.data.organizations[0].role).toBe("OWNER");
  });

  it("rejects login with the wrong password without revealing whether the email exists", async () => {
    await request(app).post("/api/v1/auth/register").send({
      fullName: "Real User",
      email: "real@cymortech.dev",
      password: "correcthorse123",
      organizationName: "Real Org",
    });

    const wrongPassword = await request(app).post("/api/v1/auth/login").send({ email: "real@cymortech.dev", password: "wrongpassword" });
    const noSuchUser = await request(app).post("/api/v1/auth/login").send({ email: "nosuchuser@cymortech.dev", password: "wrongpassword" });

    expect(wrongPassword.status).toBe(401);
    expect(noSuchUser.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe(noSuchUser.body.error.code);
  });

  it("rejects /me without a token and accepts it with a valid one", async () => {
    const unauthenticated = await request(app).get("/api/v1/auth/me");
    expect(unauthenticated.status).toBe(401);

    const login = await request(app).post("/api/v1/auth/register").send({
      fullName: "Me User",
      email: "me@cymortech.dev",
      password: "correcthorse123",
      organizationName: "Me Org",
    });
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email: "me@cymortech.dev", password: "correcthorse123" });

    const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe("me@cymortech.dev");
  });
});
