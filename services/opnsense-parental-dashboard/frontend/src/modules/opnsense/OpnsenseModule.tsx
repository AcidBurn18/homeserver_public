import { StatusCard } from "@/src/components/ui/StatusCard";
import type { OpnsenseModuleProps } from "./types";

export function OpnsenseModule({
  apiBase,
  checksOk,
  checksTotal,
  dnsRows,
  dnsEnabled,
  devices,
  selectedDeviceId,
  setSelectedDeviceId,
  blockedRows,
  preflight,
  warningMessage,
  setWarningMessage,
  allowed,
  setAllowed,
  blocked,
  setBlocked,
  siteDomain,
  setSiteDomain,
  dnsblExceptionUuid,
  setDnsblExceptionUuid,
  dnsblDomain,
  setDnsblDomain,
  usage,
  loadDevices,
  loadDnsbl,
  refreshDiscovery,
  callControl,
  setDeviceTimeout,
  loadWarningMessage,
  saveWarningMessage,
  replace,
  loadBlockedSites,
  addBlockedSite,
  removeBlockedSite,
  setFamilyMode,
  toggleDnsbl,
  addException,
  loadUsage,
  loadAllDiscoveredIps,
  createSampleDevices,
  setMsg,
}: OpnsenseModuleProps) {
  return (
    <>
      <div className="status-grid">
        <StatusCard
          label="Gateway Checks"
          value={`${checksOk}/${checksTotal || 0}`}
          hint="Read-only preflight against OPNsense"
          tone={checksTotal > 0 && checksOk === checksTotal ? "good" : "warn"}
        />
        <StatusCard
          label="DNSBL Lists"
          value={`${dnsRows?.length || 0}`}
          hint={`${dnsEnabled} enabled`}
          tone={dnsEnabled > 0 ? "good" : "neutral"}
        />
        <StatusCard
          label="Tracked Devices"
          value={`${devices.length}`}
          hint="Loaded from dashboard inventory"
          tone={devices.length > 0 ? "good" : "neutral"}
        />
        <StatusCard
          label="Blocked Domains"
          value={`${blockedRows.length}`}
          hint="Runtime alias content"
          tone={blockedRows.length > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="panel-grid panel-grid-wide">
        <section className="panel hero-panel">
          <div className="hero-copy">
            <div className="chip">Module Health</div>
            <h3>Firewall, DNSBL, and discovery in one network section</h3>
            <p>
              This is the first consolidation step toward a single homeserver
              dashboard. OPNsense stays fully functional but no longer looks
              like a separate product.
            </p>
          </div>
          <div className="hero-actions">
            <button
              className="action primary"
              onClick={() => loadDevices().catch((e) => setMsg(String(e)))}
            >
              Load Devices
            </button>
            <button
              className="action"
              onClick={() => createSampleDevices().catch((e) => setMsg(String(e)))}
            >
              Create Sample Devices
            </button>
            <button
              className="action"
              onClick={() => loadAllDiscoveredIps().catch((e) => setMsg(String(e)))}
            >
              List All IPs
            </button>
            <button
              className="action"
              onClick={() => loadDnsbl().catch((e) => setMsg(String(e)))}
            >
              Load DNSBL
            </button>
            <button
              className="action"
              onClick={() => refreshDiscovery().catch((e) => setMsg(String(e)))}
            >
              Refresh Discovery
            </button>
          </div>
        </section>

        <section className="panel preflight-panel">
          <div className="panel-title-row">
            <h3>Preflight Diagnostics</h3>
            <span className="panel-badge">{checksOk} OK</span>
          </div>
          <div className="meta-line">API base: {apiBase}</div>
          <pre className="code-block">
            {preflight ? JSON.stringify(preflight, null, 2) : "Loading..."}
          </pre>
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-title-row">
            <h3>Parental Lock</h3>
            <span className="panel-badge warn">control</span>
          </div>
          <p className="panel-copy">
            Bedtime rule toggles and temporary device timeouts.
          </p>
          <div className="button-row">
            <button
              className="action primary"
              onClick={() =>
                callControl("/api/control/bedtime_lock", true).catch((e) =>
                  setMsg(String(e)),
                )
              }
            >
              Bedtime ON
            </button>
            <button
              className="action"
              onClick={() =>
                callControl("/api/control/bedtime_lock", false).catch((e) =>
                  setMsg(String(e)),
                )
              }
            >
              Bedtime OFF
            </button>
          </div>
          <div className="field-stack">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              <option value="">Select device for timeout</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.last_ip || "no-ip"})
                </option>
              ))}
            </select>
            <div className="button-row">
              <button
                className="action"
                onClick={() =>
                  setDeviceTimeout(30).catch((e) => setMsg(String(e)))
                }
              >
                Timeout 30m
              </button>
              <button
                className="action"
                onClick={() =>
                  setDeviceTimeout(60).catch((e) => setMsg(String(e)))
                }
              >
                Timeout 60m
              </button>
              <button
                className="action"
                onClick={() =>
                  setDeviceTimeout(120).catch((e) => setMsg(String(e)))
                }
              >
                Timeout 120m
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h3>Warning Redirect</h3>
            <span className="panel-badge">content</span>
          </div>
          <p className="panel-copy">
            Store the redirect message that your blocking page should show.
          </p>
          <div className="button-row">
            <button
              className="action"
              onClick={() => loadWarningMessage().catch((e) => setMsg(String(e)))}
            >
              Load Message
            </button>
          </div>
          <textarea
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            placeholder="Go study!"
          />
          <button
            className="action primary"
            onClick={() => saveWarningMessage().catch((e) => setMsg(String(e)))}
          >
            Save Warning Text
          </button>
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-title-row">
            <h3>Alias Management</h3>
            <span className="panel-badge">firewall</span>
          </div>
          <div className="alias-grid">
            <div className="field-stack">
              <label>Allowlist IPs</label>
              <textarea
                value={allowed}
                onChange={(e) => setAllowed(e.target.value)}
                placeholder={"10.27.27.10\n10.27.27.11"}
              />
              <button
                className="action primary"
                onClick={() => replace("allowed").catch((e) => setMsg(String(e)))}
              >
                Apply Allowlist
              </button>
            </div>
            <div className="field-stack">
              <label>Blocklist IPs</label>
              <textarea
                value={blocked}
                onChange={(e) => setBlocked(e.target.value)}
                placeholder={"10.27.27.121"}
              />
              <button
                className="action danger"
                onClick={() => replace("blocked").catch((e) => setMsg(String(e)))}
              >
                Apply Blocklist
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h3>Blocked Sites</h3>
            <span className="panel-badge warn">dns/content</span>
          </div>
          <div className="button-row">
            <button
              className="action"
              onClick={() => loadBlockedSites().catch((e) => setMsg(String(e)))}
            >
              Load Blocked Sites
            </button>
          </div>
          <div className="input-row">
            <input
              value={siteDomain}
              onChange={(e) => setSiteDomain(e.target.value)}
              placeholder="youtube.com"
            />
            <button
              className="action danger"
              onClick={() => addBlockedSite().catch((e) => setMsg(String(e)))}
            >
              Block
            </button>
          </div>
          <div className="list-shell">
            {blockedRows.length === 0 ? (
              <div className="empty-state">No blocked sites loaded yet.</div>
            ) : (
              blockedRows.map((r, idx) => {
                const dom =
                  String(r.address || r.value || r.host || `entry-${idx}`);
                return (
                  <div className="list-row" key={`${dom}-${idx}`}>
                    <span>{dom}</span>
                    <button
                      className="mini-action"
                      onClick={() =>
                        removeBlockedSite(dom).catch((e) => setMsg(String(e)))
                      }
                    >
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-title-row">
            <h3>DNSBL Control</h3>
            <span className="panel-badge">unbound</span>
          </div>
          <div className="button-row">
            <button
              className="action"
              onClick={() => loadDnsbl().catch((e) => setMsg(String(e)))}
            >
              Load Lists
            </button>
            <button
              className="action primary"
              onClick={() => setFamilyMode(true).catch((e) => setMsg(String(e)))}
            >
              Family ON
            </button>
            <button
              className="action"
              onClick={() => setFamilyMode(false).catch((e) => setMsg(String(e)))}
            >
              Family OFF
            </button>
          </div>
          <div className="list-shell compact">
            {dnsRows?.length === 0 ? (
              <div className="empty-state">No DNSBL entries loaded yet.</div>
            ) : (
              dnsRows?.map((r) => {
                const isEnabled =
                  r.enabled === "1" ||
                  r.enabled === "true" ||
                  r.enabled === "yes";
                return (
                  <div className="list-row stack" key={r.uuid}>
                    <div>
                      <div className="list-title">{r.description || r.uuid}</div>
                      <div className="list-subtitle">{r.url || r.uuid}</div>
                    </div>
                    <button
                      className={`mini-action ${isEnabled ? "active" : ""}`}
                      onClick={() =>
                        toggleDnsbl(r.uuid, !isEnabled).catch((e) =>
                          setMsg(String(e)),
                        )
                      }
                    >
                      {isEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
          <div className="field-stack">
            <input
              value={dnsblExceptionUuid}
              onChange={(e) => setDnsblExceptionUuid(e.target.value)}
              placeholder="DNSBL UUID for exception"
            />
            <input
              value={dnsblDomain}
              onChange={(e) => setDnsblDomain(e.target.value)}
              placeholder="domain.com"
            />
            <div className="button-row">
              <button
                className="action primary"
                onClick={() =>
                  addException("allowlists").catch((e) => setMsg(String(e)))
                }
              >
                Allow Domain
              </button>
              <button
                className="action danger"
                onClick={() =>
                  addException("blocklists").catch((e) => setMsg(String(e)))
                }
              >
                Block Domain
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h3>Discovery & Usage</h3>
            <span className="panel-badge">diagnostics</span>
          </div>
          <div className="button-row">
            <button
              className="action"
              onClick={() => refreshDiscovery().catch((e) => setMsg(String(e)))}
            >
              Refresh Device IP Map
            </button>
            <button
              className="action"
              onClick={() => loadUsage().catch((e) => setMsg(String(e)))}
            >
              Load Top Talkers
            </button>
          </div>
          <pre className="code-block">
            {usage
              ? JSON.stringify(usage, null, 2)
              : "No usage payload loaded."}
          </pre>
        </section>
      </div>
    </>
  );
}
