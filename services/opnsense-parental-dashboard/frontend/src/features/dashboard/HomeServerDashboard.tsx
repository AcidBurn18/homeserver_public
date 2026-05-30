"use client";

import { useEffect, useMemo, useState } from "react";

import { SectionHeader } from "@/src/components/ui/SectionHeader";
import { StatusCard } from "@/src/components/ui/StatusCard";
import { OpnsenseModule } from "@/src/modules/opnsense/OpnsenseModule";
import type {
  DeviceRow,
  DnsblLists,
  Preflight,
} from "@/src/modules/opnsense/types";
import {
  countAllChecks,
  countOkChecks,
  extractRuntimeRows,
  getApiBase,
} from "@/src/modules/opnsense/utils";

type ServiceSummary = {
  name: string;
  status: "healthy" | "degraded" | "planned";
  detail: string;
};

export function HomeServerDashboard() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [token, setToken] = useState("");
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [dnsbl, setDnsbl] = useState<DnsblLists | null>(null);
  const [dnsblExceptionUuid, setDnsblExceptionUuid] = useState("");
  const [dnsblDomain, setDnsblDomain] = useState("");
  const [usage, setUsage] = useState<unknown>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [blockedSites, setBlockedSites] = useState<unknown>(null);
  const [siteDomain, setSiteDomain] = useState("");
  const [warningMessage, setWarningMessage] = useState("Go study!");
  const [allowed, setAllowed] = useState("");
  const [blocked, setBlocked] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState("Network");
  const [activeNetworkModule, setActiveNetworkModule] = useState("OPNsense");

  useEffect(() => {
    fetch(`${apiBase}/api/preflight`)
      .then((r) => r.json())
      .then(setPreflight)
      .catch((e) => setMsg(String(e)));
  }, [apiBase]);

  async function loadDnsbl() {
    const res = await fetch(`${apiBase}/api/dnsbl/lists`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setDnsbl(await res.json());
  }

  async function toggleDnsbl(uuid: string, enabled: boolean) {
    const res = await fetch(`${apiBase}/api/dnsbl/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uuid, enabled, reconfigure: true }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    await loadDnsbl();
  }

  async function setFamilyMode(enabled: boolean) {
    const res = await fetch(`${apiBase}/api/dnsbl/family_mode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enabled, reconfigure: true }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    await loadDnsbl();
  }

  async function addException(listType: "allowlists" | "blocklists") {
    const res = await fetch(`${apiBase}/api/dnsbl/exception`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        uuid: dnsblExceptionUuid,
        domain: dnsblDomain,
        list_type: listType,
        reconfigure: true,
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg(`Added ${listType} entry for ${dnsblDomain}`);
  }

  async function callControl(path: string, enabled: boolean) {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg(`${enabled ? "Enabled" : "Disabled"} ${path}`);
  }

  async function loadDevices() {
    const res = await fetch(`${apiBase}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = (await res.json()) as DeviceRow[];
    setDevices(rows);
    if (!selectedDeviceId && rows.length > 0) setSelectedDeviceId(rows[0].id);
  }

  async function loadAllDiscoveredIps() {
    const res = await fetch(`${apiBase}/api/discovery/all_ips`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const data = await res.json();
    setMsg(`Found ${Object.keys(data.ips || {}).length} discovered IPs`);
  }

  async function createSampleDevices() {
    const res = await fetch(`${apiBase}/api/discovery/create_sample_devices`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const result = await res.json();
    setMsg(`Created ${result.created} sample devices`);
    await loadDevices();
  }

  async function setDeviceTimeout(minutes: 30 | 60 | 120) {
    if (!selectedDeviceId) throw new Error("Pick a device first");
    const res = await fetch(`${apiBase}/api/control/device_timeout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ device_id: selectedDeviceId, minutes }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg(`Device timeout applied for ${minutes} minutes`);
  }

  async function loadBlockedSites() {
    const res = await fetch(`${apiBase}/api/content/blocked_sites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setBlockedSites(await res.json());
  }

  async function addBlockedSite() {
    const res = await fetch(`${apiBase}/api/content/blocked_sites/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ domain: siteDomain }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setSiteDomain("");
    await loadBlockedSites();
  }

  async function removeBlockedSite(domain: string) {
    const res = await fetch(`${apiBase}/api/content/blocked_sites/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ domain }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    await loadBlockedSites();
  }

  async function loadWarningMessage() {
    const res = await fetch(`${apiBase}/api/control/warning_redirect_message`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const payload = await res.json();
    setWarningMessage(payload.message || "Go study!");
  }

  async function saveWarningMessage() {
    const res = await fetch(`${apiBase}/api/control/warning_redirect_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: warningMessage }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg("Warning redirect message saved");
  }

  async function refreshDiscovery() {
    const res = await fetch(`${apiBase}/api/discovery/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg(`Discovery refresh: ${JSON.stringify(await res.json())}`);
  }

  async function loadUsage() {
    const res = await fetch(`${apiBase}/api/usage/top_talkers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setUsage(await res.json());
  }

  async function replace(which: "allowed" | "blocked") {
    setMsg(null);
    const content = (which === "allowed" ? allowed : blocked)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const path =
      which === "allowed"
        ? "/api/aliases/replace/allowed_ips"
        : "/api/aliases/replace/blocked_ips";
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        type: "host",
        apply: true,
        description: `Managed by parental dashboard (${which})`,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${txt}`);
    }
    setMsg(`Updated ${which} alias`);
  }

  const checksOk = countOkChecks(preflight);
  const checksTotal = countAllChecks(preflight);
  const dnsRows = dnsbl?.rows || [];
  const dnsEnabled = dnsRows.filter(
    (r) => r.enabled === "1" || r.enabled === "true" || r.enabled === "yes",
  ).length;
  const blockedRows = extractRuntimeRows(blockedSites);
  const navItems = [
    "Overview",
    "Services",
    "Network",
    "Security",
    "Logs",
    "Settings",
  ];
  const serviceCards: ServiceSummary[] = [
    {
      name: "OPNsense Gateway",
      status: checksTotal > 0 && checksOk === checksTotal ? "healthy" : "degraded",
      detail: `${checksOk}/${checksTotal || 0} preflight checks available`,
    },
    {
      name: "Media Stack",
      status: "planned",
      detail: "Plex, Jellyfin, and related service telemetry still to be wired",
    },
    {
      name: "Storage & Backups",
      status: "planned",
      detail: "Nextcloud, backup jobs, and capacity reporting pending integration",
    },
    {
      name: "Observability",
      status: "planned",
      detail: "Grafana and monitoring panels will be attached to this dashboard later",
    },
  ];
  const recentEvents = [
    `Gateway preflight: ${checksOk}/${checksTotal || 0} checks passing`,
    `DNSBL loaded entries: ${dnsRows.length}`,
    `Tracked devices currently loaded: ${devices.length}`,
    `Blocked site entries currently loaded: ${blockedRows.length}`,
  ];

  function renderOverview() {
    return (
      <>
        <SectionHeader
          eyebrow="Overview"
          title="Homeserver Main Dashboard"
          detail="This is now the primary dashboard shell. OPNsense is only one module inside the broader homeserver control surface."
        />

        <div className="status-grid">
          <StatusCard
            label="Integrated Modules"
            value="1"
            hint="OPNsense is the first live module"
            tone="good"
          />
          <StatusCard
            label="Planned Modules"
            value="4"
            hint="Media, storage, observability, and services"
            tone="neutral"
          />
          <StatusCard
            label="Network Checks"
            value={`${checksOk}/${checksTotal || 0}`}
            hint="Live OPNsense preflight status"
            tone={checksTotal > 0 && checksOk === checksTotal ? "good" : "warn"}
          />
          <StatusCard
            label="Dashboard Scope"
            value="Main"
            hint="Homeserver is the top-level product now"
            tone="good"
          />
        </div>

        <div className="panel-grid panel-grid-wide">
          <section className="panel hero-panel">
            <div className="hero-copy">
              <div className="chip">Platform Direction</div>
              <h3>Single homeserver dashboard, modular subsystems</h3>
              <p>
                The current implementation keeps the OPNsense backend logic
                intact, but the frontend direction is now explicitly modular:
                overview at the top, domains by section, tools nested beneath.
              </p>
            </div>
            <div className="hero-actions">
              <button
                className="action primary"
                onClick={() => setActiveNav("Network")}
              >
                Open Network
              </button>
              <button
                className="action"
                onClick={() => setActiveNav("Services")}
              >
                Open Services
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title-row">
              <h3>Recent Platform Notes</h3>
              <span className="panel-badge">live</span>
            </div>
            <div className="list-shell">
              {recentEvents.map((event) => (
                <div className="list-row stack" key={event}>
                  <div>
                    <div className="list-title">{event}</div>
                    <div className="list-subtitle">
                      Derived from the currently wired OPNsense integration.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderServices() {
    return (
      <>
        <SectionHeader
          eyebrow="Services"
          title="Service Domains"
          detail="Top-level homeserver service areas. Only OPNsense is live today; the rest are placeholders for the eventual unified dashboard."
        />

        <div className="service-grid">
          {serviceCards.map((service) => (
            <section className="panel service-card" key={service.name}>
              <div className="panel-title-row">
                <h3>{service.name}</h3>
                <span
                  className={`panel-badge ${service.status === "degraded" ? "warn" : ""}`}
                >
                  {service.status}
                </span>
              </div>
              <p className="panel-copy">{service.detail}</p>
            </section>
          ))}
        </div>
      </>
    );
  }

  function renderNetwork() {
    return (
      <>
        <SectionHeader
          eyebrow="Network"
          title="Network Stack"
          detail="OPNsense is now one network module inside the main homeserver dashboard. Additional modules can be introduced beside it later."
        />

        <div className="module-tabs">
          {["OPNsense", "Tailscale", "DNS", "Routing"].map((moduleName) => (
            <button
              key={moduleName}
              className={`module-tab ${activeNetworkModule === moduleName ? "active" : ""}`}
              onClick={() => setActiveNetworkModule(moduleName)}
            >
              {moduleName}
            </button>
          ))}
        </div>

        {activeNetworkModule === "OPNsense" ? (
          <OpnsenseModule
            apiBase={apiBase}
            checksOk={checksOk}
            checksTotal={checksTotal}
            dnsRows={dnsRows}
            dnsEnabled={dnsEnabled}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            setSelectedDeviceId={setSelectedDeviceId}
            blockedRows={blockedRows}
            preflight={preflight}
            warningMessage={warningMessage}
            setWarningMessage={setWarningMessage}
            allowed={allowed}
            setAllowed={setAllowed}
            blocked={blocked}
            setBlocked={setBlocked}
            siteDomain={siteDomain}
            setSiteDomain={setSiteDomain}
            dnsblExceptionUuid={dnsblExceptionUuid}
            setDnsblExceptionUuid={setDnsblExceptionUuid}
            dnsblDomain={dnsblDomain}
            setDnsblDomain={setDnsblDomain}
            usage={usage}
            loadDevices={loadDevices}
            loadDnsbl={loadDnsbl}
            refreshDiscovery={refreshDiscovery}
            callControl={callControl}
            setDeviceTimeout={setDeviceTimeout}
            loadWarningMessage={loadWarningMessage}
            saveWarningMessage={saveWarningMessage}
            replace={replace}
            loadBlockedSites={loadBlockedSites}
            addBlockedSite={addBlockedSite}
            removeBlockedSite={removeBlockedSite}
            setFamilyMode={setFamilyMode}
            toggleDnsbl={toggleDnsbl}
            addException={addException}
            loadUsage={loadUsage}
            loadAllDiscoveredIps={loadAllDiscoveredIps}
            createSampleDevices={createSampleDevices}
            setMsg={setMsg}
          />
        ) : (
          <section className="panel empty-panel">
            <div className="panel-title-row">
              <h3>{activeNetworkModule}</h3>
              <span className="panel-badge">planned</span>
            </div>
            <p className="panel-copy">
              This module has a slot in the homeserver dashboard now, but it
              has not been wired yet. OPNsense remains the only live network
              module.
            </p>
          </section>
        )}
      </>
    );
  }

  function renderSecurity() {
    return (
      <>
        <SectionHeader
          eyebrow="Security"
          title="Security Control Plane"
          detail="This section will eventually centralize policy, auth, and hardening views above individual subsystems."
        />
        <section className="panel empty-panel">
          <div className="panel-title-row">
            <h3>Security Section Pending</h3>
            <span className="panel-badge">planned</span>
          </div>
          <p className="panel-copy">
            Once the platform expands, OPNsense policy summaries, access
            control, VPN posture, and system alerts should land here instead of
            being scattered inside module pages.
          </p>
        </section>
      </>
    );
  }

  function renderLogs() {
    return (
      <>
        <SectionHeader
          eyebrow="Logs"
          title="Activity & Logs"
          detail="Cross-system activity should live here once more modules are integrated."
        />
        <section className="panel">
          <div className="panel-title-row">
            <h3>Current Feed</h3>
            <span className="panel-badge">derived</span>
          </div>
          <div className="list-shell">
            {recentEvents.map((event) => (
              <div className="list-row stack" key={`log-${event}`}>
                <div>
                  <div className="list-title">{event}</div>
                  <div className="list-subtitle">
                    This is a temporary unified feed seeded from the active
                    network integration.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderSettings() {
    return (
      <>
        <SectionHeader
          eyebrow="Settings"
          title="Dashboard Settings"
          detail="Global homeserver dashboard settings should be separated from any single subsystem."
        />
        <section className="panel">
          <div className="panel-title-row">
            <h3>Platform Access</h3>
            <span className="panel-badge">global</span>
          </div>
          <p className="panel-copy">
            For now, the OPNsense admin token is still injected from the top
            header because only that module is live. As more modules are added,
            this section should own shared credentials, preferences, and
            refresh behavior.
          </p>
        </section>
      </>
    );
  }

  function renderActiveSection() {
    switch (activeNav) {
      case "Overview":
        return renderOverview();
      case "Services":
        return renderServices();
      case "Network":
        return renderNetwork();
      case "Security":
        return renderSecurity();
      case "Logs":
        return renderLogs();
      case "Settings":
        return renderSettings();
      default:
        return renderNetwork();
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-device">
          <div className="device-mark">HS</div>
          <div>
            <div className="device-name">Homeserver Control</div>
            <div className="device-subtitle">Node: network stack</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-item ${activeNav === item ? "active" : ""}`}
              onClick={() => setActiveNav(item)}
            >
              <span className="nav-dot" />
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-group">
          <div className="sidebar-label">Network Modules</div>
          <button className="module-item active">
            <span className="module-mark">OP</span>
            <span>OPNsense</span>
          </button>
          <button className="module-item" disabled>
            <span className="module-mark">TS</span>
            <span>Tailscale</span>
          </button>
          <button className="module-item" disabled>
            <span className="module-mark">DN</span>
            <span>DNS</span>
          </button>
        </div>

        <div className="sidebar-foot">
          <div className="foot-label">Current Scope</div>
          <div className="foot-value">Network / OPNsense</div>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div>
            <div className="topbar-kicker">Homeserver Dashboard</div>
            <h1>Network / OPNsense Control Center</h1>
            <p>
              The OPNsense controls now live inside the wider homeserver
              dashboard structure. Backend integrations remain the same.
            </p>
          </div>

          <div className="admin-panel">
            <label className="token-field">
              <span>Admin Token</span>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste ADMIN_TOKEN"
              />
            </label>
          </div>
        </header>

        <div className="content-shell">
          {renderActiveSection()}
          {msg ? <div className="flash-message">{msg}</div> : null}
        </div>
      </main>
    </div>
  );
}
