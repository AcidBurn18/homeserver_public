from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

import requests
from requests.auth import HTTPBasicAuth

from app.settings import settings


class OPNsenseError(RuntimeError):
    pass


@dataclass(frozen=True)
class OPNsenseResponse:
    status_code: int
    json: dict[str, Any]


class OPNsenseClient:
    def __init__(self) -> None:
        self._base = settings.opnsense_base_url.rstrip("/")
        self._auth = HTTPBasicAuth(settings.opnsense_api_key, settings.opnsense_api_secret)

        self._verify: bool | str = True
        if settings.opnsense_insecure_skip_verify:
            self._verify = False
        elif settings.opnsense_ca_bundle_path:
            self._verify = settings.opnsense_ca_bundle_path

    def _url(self, path: str) -> str:
        path = path.lstrip("/")
        return f"{self._base}/{path}"

    def request(self, method: str, path: str, *, json_body: dict[str, Any] | None = None) -> OPNsenseResponse:
        url = self._url(path)
        r = requests.request(
            method=method,
            url=url,
            auth=self._auth,
            json=json_body,
            timeout=15,
            verify=self._verify,
        )

        try:
            payload = r.json()
        except Exception:
            payload = {"raw": r.text}

        if r.status_code >= 400:
            raise OPNsenseError(f"{method} {path} failed: {r.status_code} {json.dumps(payload)[:500]}")

        if isinstance(payload, dict):
            return OPNsenseResponse(status_code=r.status_code, json=payload)
        return OPNsenseResponse(status_code=r.status_code, json={"data": payload})

    # ---- Firewall alias helpers ----
    def alias_get_uuid_by_name(self, name: str) -> str | None:
        r = self.request("GET", f"/api/firewall/alias/getAliasUUID/{name}")
        # OPNsense returns: {"uuid":"..."} or empty
        uuid = r.json.get("uuid")
        if isinstance(uuid, str) and uuid:
            return uuid
        return None

    def alias_get_item(self, uuid: str) -> dict[str, Any]:
        r = self.request("GET", f"/api/firewall/alias/get_item/{uuid}")
        return r.json

    def alias_add_or_replace(self, *, name: str, alias_type: str, content_lines: list[str], description: str = "") -> str:
        existing_uuid = self.alias_get_uuid_by_name(name)
        payload = {
            "alias": {
                "enabled": "1",
                "name": name,
                "type": alias_type,
                "proto": "",
                "counters": "0",
                "description": description,
                "content": "\n".join(content_lines),
            }
        }
        if existing_uuid:
            self.request("POST", f"/api/firewall/alias/set_item/{existing_uuid}", json_body=payload)
            return existing_uuid

        r = self.request("POST", "/api/firewall/alias/add_item", json_body=payload)
        # add_item often returns uuid under `uuid`
        uuid = r.json.get("uuid")
        if isinstance(uuid, str) and uuid:
            return uuid
        # fallback: look up by name
        uuid2 = self.alias_get_uuid_by_name(name)
        if not uuid2:
            raise OPNsenseError("Alias created but UUID not found")
        return uuid2

    def alias_reconfigure(self) -> None:
        self.request("POST", "/api/firewall/alias/reconfigure")

    def firewall_filter_reconfigure(self) -> dict[str, Any]:
        return self.request("POST", "/api/firewall/filter/reconfigure").json

    def firewall_toggle_rule(self, uuid: str, enabled: bool) -> dict[str, Any]:
        # toggle_rule takes disabled flag, so invert enabled
        disabled = "0" if enabled else "1"
        return self.request("POST", f"/api/firewall/filter/toggle_rule/{uuid}/{disabled}").json

    # ---- Firewall alias_util helpers (incremental updates to runtime table) ----
    def alias_util_list(self, alias_name: str) -> dict[str, Any]:
        return self.request("GET", f"/api/firewall/alias_util/list/{alias_name}").json

    def alias_util_add(self, alias_name: str, address: str) -> dict[str, Any]:
        return self.request("POST", f"/api/firewall/alias_util/add/{alias_name}", json_body={"address": address}).json

    def alias_util_delete(self, alias_name: str, address: str) -> dict[str, Any]:
        return self.request("POST", f"/api/firewall/alias_util/delete/{alias_name}", json_body={"address": address}).json

    def alias_util_flush(self, alias_name: str) -> dict[str, Any]:
        return self.request("POST", f"/api/firewall/alias_util/flush/{alias_name}").json

    # ---- Unbound DNSBL helpers ----
    def unbound_dnsbl_status(self) -> dict[str, Any]:
        return self.request("GET", "/api/unbound/service/dnsbl").json

    def unbound_is_blocklist_enabled(self) -> dict[str, Any]:
        return self.request("GET", "/api/unbound/overview/is_block_list_enabled").json

    def unbound_search_dnsbl(self) -> dict[str, Any]:
        return self.request("GET", "/api/unbound/settings/search_dnsbl").json

    def unbound_toggle_dnsbl(self, uuid: str, enabled: bool) -> dict[str, Any]:
        enabled_param = "1" if enabled else "0"
        return self.request("POST", f"/api/unbound/settings/toggle_dnsbl/{uuid}/{enabled_param}").json

    def unbound_update_blocklist(self, *, uuid: str, domain: str, list_type: str) -> dict[str, Any]:
        """
        list_type: 'allowlists' or 'blocklists'
        """
        return self.request(
            "POST",
            "/api/unbound/settings/update_blocklist",
            json_body={"uuid": uuid, "domain": domain, "type": list_type},
        ).json

    def unbound_reconfigure(self) -> dict[str, Any]:
        return self.request("POST", "/api/unbound/service/reconfigure").json

    # ---- DHCP / ARP / Traffic (for discovery + usage) ----
    def dhcp_leases4_search(self) -> dict[str, Any]:
        # Returns a paginated-like result set; format depends on OPNsense version.
        return self.request("GET", "/api/dhcp/leases4/searchLease").json

    def diagnostics_get_arp(self) -> dict[str, Any]:
        # Prefer snake_case endpoint for newer OPNsense privilege model.
        return self.request("GET", "/api/diagnostics/interface/get_arp").json

    def diagnostics_traffic_top(self) -> dict[str, Any]:
        return self.request("GET", "/api/diagnostics/traffic/top").json

