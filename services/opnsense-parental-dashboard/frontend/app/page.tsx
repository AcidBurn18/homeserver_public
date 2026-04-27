"use client";

import { useEffect, useMemo, useState } from "react";

type Preflight = {
  opnsense_base_url: string;
  checks: Record<string, unknown>;
  notes: string[];
};

type DnsblLists = {
  rows?: Array<{
    uuid: string;
    enabled: string;
    description?: string;
    url?: string;
    type?: string;
  }>;
  [k: string]: unknown;
};

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
}

function countOkChecks(preflight: Preflight | null): number {
  if (!preflight?.checks) return 0;
  return Object.values(preflight.checks).filter((v) => {
    if (v && typeof v === "object" && "ok" in v) return Boolean((v as { ok: boolean }).ok);
    return false;
  }).length;
}

function countAllChecks(preflight: Preflight | null): number {
  return preflight?.checks ? Object.keys(preflight.checks).length : 0;
}

export default function Page() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [token, setToken] = useState("");
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [dnsbl, setDnsbl] = useState<DnsblLists | null>(null);
  const [dnsblExceptionUuid, setDnsblExceptionUuid] = useState("");
  const [dnsblDomain, setDnsblDomain] = useState("");
  const [usage, setUsage] = useState<any>(null);
  const [devices, setDevices] = useState<Array<{ id: string; name: string; mac: string; last_ip?: string }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [blockedSites, setBlockedSites] = useState<any>(null);
  const [siteDomain, setSiteDomain] = useState("");
  const [warningMessage, setWarningMessage] = useState("Go study!");
  const [allowed, setAllowed] = useState("");
  const [blocked, setBlocked] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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
    setMsg(`Added ${listType} exception for ${dnsblDomain}`);
  }

  async function callControl(path: string, enabled: boolean) {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg(`${path} => ${enabled ? "enabled" : "disabled"}`);
  }

  async function loadDevices() {
    const res = await fetch(`${apiBase}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = await res.json();
    setDevices(rows);
    if (!selectedDeviceId && rows.length > 0) setSelectedDeviceId(rows[0].id);
  }

  async function setDeviceTimeout(minutes: 30 | 60 | 120) {
    if (!selectedDeviceId) throw new Error("Pick a device first");
    const res = await fetch(`${apiBase}/api/control/device_timeout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_id: selectedDeviceId, minutes }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg(`Device timeout applied: ${minutes} minutes`);
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ domain: siteDomain }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setSiteDomain("");
    await loadBlockedSites();
  }

  async function removeBlockedSite(domain: string) {
    const res = await fetch(`${apiBase}/api/content/blocked_sites/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: warningMessage }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg("Warning redirect message saved.");
  }

  async function refreshDiscovery() {
    const res = await fetch(`${apiBase}/api/discovery/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    setMsg(`Discovery refresh OK: ${JSON.stringify(await res.json())}`);
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

    const path = which === "allowed" ? "/api/aliases/replace/allowed_ips" : "/api/aliases/replace/blocked_ips";
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content, type: "host", apply: true, description: `Managed by parental dashboard (${which})` }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${txt}`);
    }
    setMsg(`Updated ${which} alias OK`);
  }

  const checksOk = countOkChecks(preflight);
  const checksTotal = countAllChecks(preflight);
  const dnsRows = dnsbl?.rows || [];
  const dnsEnabled = dnsRows.filter((r) => r.enabled === "1" || r.enabled === "true" || r.enabled === "yes").length;

  return (
    <div className="shell">
      <div className="topbar">
        <div>
          <h1 className="title">Home Internet Control Center</h1>
          <p className="subtitle">OPNsense parental dashboard · modern control panel</p>
        </div>
        <div className="pill">
          <span className={`dot ${checksTotal > 0 && checksOk === checksTotal ? "ok" : "warn"}`} />
          API checks {checksOk}/{checksTotal || 0}
        </div>
      </div>

      <div className="grid">
        <section className="card span-12">
          <h3>Master Lock Controls</h3>
          <div className="row">
            <button className="btn danger" onClick={() => callControl("/api/control/internet_killswitch", true).catch((e) => setMsg(String(e)))}>
              Internet Kill Switch ON
            </button>
            <button className="btn ghost" onClick={() => callControl("/api/control/internet_killswitch", false).catch((e) => setMsg(String(e)))}>
              Internet Kill Switch OFF
            </button>
            <button className="btn danger" onClick={() => callControl("/api/control/guest_mute", true).catch((e) => setMsg(String(e)))}>
              Guest Network Mute ON
            </button>
            <button className="btn ghost" onClick={() => callControl("/api/control/guest_mute", false).catch((e) => setMsg(String(e)))}>
              Guest Network Mute OFF
            </button>
          </div>
          <p className="hint">Requires Firewall Automation rule UUIDs in `.env` for kill/guest toggles.</p>
        </section>

        <section className="card span-12">
          <h3>Parental Lock</h3>
          <div className="row" style={{ marginBottom: 8 }}>
            <button className="btn success" onClick={() => callControl("/api/control/bedtime_lock", true).catch((e) => setMsg(String(e)))}>
              Bedtime Auto Lock ON
            </button>
            <button className="btn ghost" onClick={() => callControl("/api/control/bedtime_lock", false).catch((e) => setMsg(String(e)))}>
              Bedtime Auto Lock OFF
            </button>
          </div>
          <div className="row">
            <button className="btn" onClick={() => loadDevices().catch((e) => setMsg(String(e)))}>
              Load Devices
            </button>
            <select value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>
              <option value="">Select device for timeout</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.last_ip || "no-ip"})
                </option>
              ))}
            </select>
            <button className="btn" onClick={() => setDeviceTimeout(30).catch((e) => setMsg(String(e)))}>
              Timeout 30m
            </button>
            <button className="btn" onClick={() => setDeviceTimeout(60).catch((e) => setMsg(String(e)))}>
              Timeout 60m
            </button>
            <button className="btn" onClick={() => setDeviceTimeout(120).catch((e) => setMsg(String(e)))}>
              Timeout 120m
            </button>
          </div>
        </section>

        <section className="card span-12">
          <h3>Content & Site Module</h3>
          <div className="row">
            <button className="btn" onClick={() => loadBlockedSites().catch((e) => setMsg(String(e)))}>
              Load Blocked Sites
            </button>
            <input value={siteDomain} onChange={(e) => setSiteDomain(e.target.value)} placeholder="youtube.com" />
            <button className="btn danger" onClick={() => addBlockedSite().catch((e) => setMsg(String(e)))}>
              Block Site
            </button>
          </div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Blocked Domain</th>
                <th style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(blockedSites?.result?.rows) && blockedSites.result.rows.length > 0 ? (
                blockedSites.result.rows.map((r: any, idx: number) => {
                  const dom = r.address || r.value || r.host || String(r);
                  return (
                    <tr key={`${dom}-${idx}`}>
                      <td>{dom}</td>
                      <td>
                        <button className="btn ghost" onClick={() => removeBlockedSite(dom).catch((e) => setMsg(String(e)))}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={2}>No blocked sites loaded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => loadWarningMessage().catch((e) => setMsg(String(e)))}>
              Load Warning Message
            </button>
            <input value={warningMessage} onChange={(e) => setWarningMessage(e.target.value)} placeholder="Go study!" />
            <button className="btn success" onClick={() => saveWarningMessage().catch((e) => setMsg(String(e)))}>
              Save Warning Redirect Text
            </button>
          </div>
          <p className="hint">Custom warning text is saved in app settings. To display it on blocked requests, connect your local Nginx warning page to this value.</p>
        </section>

        <section className="card span-12">
          <div className="stats">
            <div className="stat">
              <div className="stat-label">API base</div>
              <div className="stat-value mono">{apiBase}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Preflight</div>
              <div className="stat-value">{checksOk}/{checksTotal || 0} checks</div>
            </div>
            <div className="stat">
              <div className="stat-label">DNSBL loaded</div>
              <div className="stat-value">{dnsRows.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label">DNSBL enabled</div>
              <div className="stat-value">{dnsEnabled}</div>
            </div>
          </div>
        </section>

        <section className="card span-4">
          <h3>Admin Access</h3>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste ADMIN_TOKEN"
          />
          <p className="hint">Used as Bearer token for protected actions. Keep this dashboard LAN-only.</p>
        </section>

        <section className="card span-8">
          <h3>Preflight Diagnostics</h3>
          <p className="hint">Read-only environment checks against OPNsense endpoints.</p>
          <pre className="pre">{preflight ? JSON.stringify(preflight, null, 2) : "Loading..."}</pre>
        </section>

        <section className="card span-6">
          <h3>Allowlist IPs</h3>
          <textarea
            value={allowed}
            onChange={(e) => setAllowed(e.target.value)}
            placeholder={"One IP per line\nExample:\n10.27.27.10\n10.27.27.11"}
          />
          <div className="row">
            <button className="btn success" onClick={() => replace("allowed").catch((e) => setMsg(String(e)))}>
              Apply Allowlist
            </button>
          </div>
        </section>

        <section className="card span-6">
          <h3>Blocklist IPs</h3>
          <textarea
            value={blocked}
            onChange={(e) => setBlocked(e.target.value)}
            placeholder={"One IP per line\nExample:\n10.27.27.121"}
          />
          <div className="row">
            <button className="btn danger" onClick={() => replace("blocked").catch((e) => setMsg(String(e)))}>
              Apply Blocklist
            </button>
          </div>
        </section>

        <section className="card span-12">
          <h3>DNS Filtering (Unbound DNSBL)</h3>
          <div className="row" style={{ marginBottom: 10 }}>
            <button className="btn" onClick={() => loadDnsbl().catch((e) => setMsg(String(e)))}>
              Load DNSBL Lists
            </button>
            <button className="btn success" onClick={() => setFamilyMode(true).catch((e) => setMsg(String(e)))}>
              Family Mode ON
            </button>
            <button className="btn ghost" onClick={() => setFamilyMode(false).catch((e) => setMsg(String(e)))}>
              Family Mode OFF
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 220 }}>UUID</th>
                <th>Description / URL</th>
                <th style={{ width: 120 }}>State</th>
              </tr>
            </thead>
            <tbody>
              {dnsRows.length === 0 ? (
                <tr>
                  <td colSpan={3}>No DNSBL entries loaded yet.</td>
                </tr>
              ) : (
                dnsRows.map((r) => {
                  const isEnabled = r.enabled === "1" || r.enabled === "true" || r.enabled === "yes";
                  return (
                    <tr key={r.uuid}>
                      <td className="mono">{r.uuid}</td>
                      <td>
                        <div>{r.description || "-"}</div>
                        <div className="hint">{r.url || ""}</div>
                      </td>
                      <td>
                        <button className={`btn ${isEnabled ? "success" : "ghost"}`} onClick={() => toggleDnsbl(r.uuid, !isEnabled).catch((e) => setMsg(String(e)))}>
                          {isEnabled ? "Enabled" : "Disabled"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="row" style={{ marginTop: 10 }}>
            <input
              value={dnsblExceptionUuid}
              onChange={(e) => setDnsblExceptionUuid(e.target.value)}
              placeholder="DNSBL UUID for exception"
            />
            <input value={dnsblDomain} onChange={(e) => setDnsblDomain(e.target.value)} placeholder="domain.com" />
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn success" onClick={() => addException("allowlists").catch((e) => setMsg(String(e)))}>
              Allow Domain
            </button>
            <button className="btn danger" onClick={() => addException("blocklists").catch((e) => setMsg(String(e)))}>
              Block Domain
            </button>
          </div>
          <p className="hint">This writes Unbound blocklist exceptions and reconfigures DNS.</p>
        </section>

        <section className="card span-6">
          <h3>Client Discovery</h3>
          <p className="hint">Refreshes known device IPs via DHCP/ARP mapping for schedule enforcement.</p>
          <button className="btn" onClick={() => refreshDiscovery().catch((e) => setMsg(String(e)))}>
            Refresh Device IP Map
          </button>
        </section>

        <section className="card span-6">
          <h3>Usage Snapshot</h3>
          <p className="hint">Top Talkers (best effort; depends on OPNsense endpoint support).</p>
          <button className="btn" onClick={() => loadUsage().catch((e) => setMsg(String(e)))}>
            Load Top Talkers
          </button>
          <pre className="pre" style={{ marginTop: 10 }}>{usage ? JSON.stringify(usage, null, 2) : "No usage payload loaded."}</pre>
        </section>

        {msg ? (
          <section className="span-12">
            <div className="notice">{msg}</div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

