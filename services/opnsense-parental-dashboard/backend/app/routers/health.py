from fastapi import APIRouter

from app.opnsense_client import OPNsenseClient, OPNsenseError
from app.settings import settings

router = APIRouter()


@router.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/api/preflight")
def preflight() -> dict[str, object]:
    """
    Attempts a few read-only calls to detect feature availability.
    This is how we 'confirm' your OPNsense capabilities in a repeatable way.
    """
    c = OPNsenseClient()
    result: dict[str, object] = {
        "opnsense_base_url": settings.opnsense_base_url,
        "checks": {},
        "notes": [
            "If a check is 'unavailable', it may be disabled in OPNsense, not installed, or blocked by API permissions.",
            "Preflight is safe: it only performs GETs.",
        ],
    }

    def run_check(name: str, fn):
        try:
            payload = fn()
            result["checks"][name] = {"ok": True, "payload": payload}
        except OPNsenseError as e:
            result["checks"][name] = {"ok": False, "error": str(e)}

    run_check("firewall_alias_uuid_allowed_ips", lambda: {"uuid": c.alias_get_uuid_by_name(settings.alias_allowed_ips)})
    run_check("unbound_dnsbl_status", c.unbound_dnsbl_status)
    run_check("unbound_blocklist_enabled", c.unbound_is_blocklist_enabled)
    run_check("dhcp_leases4_search", c.dhcp_leases4_search)
    run_check("diagnostics_get_arp", c.diagnostics_get_arp)
    run_check("diagnostics_traffic_top", c.diagnostics_traffic_top)
    return result

