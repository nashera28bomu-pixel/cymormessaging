/**
 * Cymor Messaging — shared API client.
 * No build step: loaded as a plain <script> on every page.
 */
const CymorAPI = (() => {
  const BASE_URL = window.CYMOR_API_URL || "http://localhost:4000/api/v1";

  function getTokens() {
    return {
      accessToken: localStorage.getItem("cymor_access_token"),
      refreshToken: localStorage.getItem("cymor_refresh_token"),
    };
  }

  function setTokens({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem("cymor_access_token", accessToken);
    if (refreshToken) localStorage.setItem("cymor_refresh_token", refreshToken);
  }

  function clearSession() {
    localStorage.removeItem("cymor_access_token");
    localStorage.removeItem("cymor_refresh_token");
    localStorage.removeItem("cymor_organization_id");
  }

  function getOrganizationId() {
    return localStorage.getItem("cymor_organization_id");
  }

  function setOrganizationId(id) {
    localStorage.setItem("cymor_organization_id", id);
  }

  async function request(path, { method = "GET", body, auth = true, org = true, retry = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const { accessToken } = getTokens();
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    }
    if (org) {
      const orgId = getOrganizationId();
      if (orgId) headers["X-Organization-Id"] = orgId;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => ({ success: false, error: { code: "PARSE_ERROR", message: "Unexpected response" } }));

    if (res.status === 401 && auth && retry) {
      const refreshed = await tryRefresh();
      if (refreshed) return request(path, { method, body, auth, org, retry: false });
      clearSession();
      window.location.href = "/login.html";
      return Promise.reject(json.error);
    }

    if (!json.success) {
      throw Object.assign(new Error(json.error?.message || "Request failed"), { code: json.error?.code, details: json.error?.details });
    }

    return json;
  }

  async function tryRefresh() {
    const { refreshToken } = getTokens();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const json = await res.json();
      if (!json.success) return false;
      setTokens({ accessToken: json.data.accessToken });
      return true;
    } catch {
      return false;
    }
  }

  return {
    request,
    getTokens,
    setTokens,
    clearSession,
    getOrganizationId,
    setOrganizationId,
    isLoggedIn: () => Boolean(getTokens().accessToken),
  };
})();
