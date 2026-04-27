from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device
from app.opnsense_client import OPNsenseClient, OPNsenseError
from app.security import require_admin
from app.audit import audit

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


def _norm_mac(mac: str) -> str:
    return mac.strip().lower().replace("-", ":")


@router.get("/snapshot", dependencies=[Depends(require_admin)])
def snapshot() -> dict[str, object]:
    """
    Returns raw discovery sources (best-effort). Useful when adapting to your OPNsense version.
    """
    c = OPNsenseClient()
    out: dict[str, object] = {"arp": None, "dhcp": None, "errors": []}
    try:
        out["arp"] = c.diagnostics_get_arp()
    except OPNsenseError as e:
        out["errors"].append({"source": "arp", "error": str(e)})
    try:
        out["dhcp"] = c.dhcp_leases4_search()
    except OPNsenseError as e:
        out["errors"].append({"source": "dhcp", "error": str(e)})
    return out


@router.post("/refresh", dependencies=[Depends(require_admin)])
def refresh(db: Session = Depends(get_db)) -> dict[str, object]:
    """
    Best-effort update: refresh Device.last_ip and Device.last_seen_at from ARP/DHCP.
    This supports the mixed-LAN model where we enforce by IP aliases.
    """
    c = OPNsenseClient()

    arp = {}
    dhcp = {}

    try:
        arp_payload = c.diagnostics_get_arp()
        # Expected shape: {"rows":[{"ipaddress":"...","macaddress":"..."}...]}
        for row in arp_payload.get("rows", []) if isinstance(arp_payload, dict) else []:
            ip = row.get("ipaddress") or row.get("ip") or row.get("address")
            mac = row.get("macaddress") or row.get("mac") or row.get("mac_address")
            if ip and mac:
                arp[_norm_mac(mac)] = ip
    except OPNsenseError:
        pass

    try:
        dhcp_payload = c.dhcp_leases4_search()
        # Common shape: {"rows":[{"address":"1.2.3.4","hwaddr":"aa:bb:..","hostname":"..."}]}
        for row in dhcp_payload.get("rows", []) if isinstance(dhcp_payload, dict) else []:
            ip = row.get("address") or row.get("ip") or row.get("ipaddress")
            mac = row.get("hwaddr") or row.get("mac") or row.get("macaddress")
            if ip and mac:
                dhcp[_norm_mac(mac)] = ip
    except OPNsenseError:
        pass

    now = datetime.now(timezone.utc)
    updated = 0

    devices = db.scalars(select(Device)).all()
    for d in devices:
        mac = _norm_mac(d.mac)
        ip = dhcp.get(mac) or arp.get(mac)
        if ip and ip != d.last_ip:
            d.last_ip = ip
            updated += 1
        if ip:
            d.last_seen_at = now
    db.commit()

    audit(db, actor="admin", action="discovery.refresh", details={"updated": updated})
    return {"ok": True, "updated": updated, "seen": sum(1 for d in devices if d.last_seen_at)}

