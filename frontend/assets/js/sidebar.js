const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { href: "index.html", label: "Overview", key: "overview" },
      { href: "inbox.html", label: "Inbox", key: "inbox" },
      { href: "contacts.html", label: "Contacts", key: "contacts" },
      { href: "conversations.html", label: "Conversations", key: "conversations" },
    ],
  },
  {
    label: "Messaging",
    items: [
      { href: "whatsapp.html", label: "WhatsApp", key: "whatsapp" },
      { href: "templates.html", label: "Templates", key: "templates" },
      { href: "campaigns.html", label: "Campaigns", key: "campaigns" },
      { href: "automations.html", label: "Automations", key: "automations" },
      { href: "otp.html", label: "OTP", key: "otp" },
    ],
  },
  {
    label: "Developer",
    items: [
      { href: "api/keys.html", label: "API keys", key: "api-keys" },
      { href: "api/webhooks.html", label: "Webhooks", key: "api-webhooks" },
      { href: "api/logs.html", label: "API logs", key: "api-logs" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "analytics.html", label: "Analytics", key: "analytics" },
      { href: "media.html", label: "Media", key: "media" },
      { href: "audit-logs.html", label: "Audit logs", key: "audit-logs" },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "team.html", label: "Team", key: "team" },
      { href: "settings.html", label: "Settings", key: "settings" },
    ],
  },
];

function renderSidebar(activeKey) {
  const el = document.getElementById("sidebar");
  if (!el) return;

  const groups = NAV_SECTIONS.map(
    (section) => `
    <div class="nav-group">
      <div class="nav-group-label">${section.label}</div>
      ${section.items
        .map(
          (item) => `<a class="nav-item ${item.key === activeKey ? "active" : ""}" href="${item.href}">
            <span class="dot"></span>${item.label}
          </a>`
        )
        .join("")}
    </div>`
  ).join("");

  el.innerHTML = `
    <div class="logo">Cymor Messaging</div>
    ${groups}
    <div class="sidebar-footer">
      <div class="org-switcher" id="org-name">Loading workspace…</div>
      <a href="#" class="logout-link" id="logout-link">Log out</a>
    </div>
  `;

  document.getElementById("logout-link").addEventListener("click", (e) => {
    e.preventDefault();
    CymorAPI.clearSession();
    window.location.href = "../login.html".replace("../", activeKey === "api-keys" || activeKey === "api-webhooks" || activeKey === "api-logs" ? "../../" : "../");
  });

  loadOrgName();
}

async function loadOrgName() {
  try {
    const { data } = await CymorAPI.request("/organizations/mine");
    const current = data.find((m) => String(m.organizationId?._id || m.organizationId) === CymorAPI.getOrganizationId());
    const label = document.getElementById("org-name");
    if (label) label.textContent = current?.organizationId?.name || "Your workspace";
  } catch {
    /* non-critical - sidebar still renders without the org label */
  }
}
