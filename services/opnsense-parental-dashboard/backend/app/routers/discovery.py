from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device
from uuid import uuid4
from app.opnsense_client import OPNsenseClient, OPNsenseError
from app.security import require_admin
from app.audit import audit

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


def _norm_mac(mac: str) -> str:
    return mac.strip().lower().replace("-", ":")


def _rows(payload: dict[str, object]) -> list[dict[str, object]]:
    for key in ("rows", "data"):
        rows = payload.get(key)
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


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
        # OPNsense variants return ARP rows under either `rows` or `data`.
        for row in _rows(arp_payload) if isinstance(arp_payload, dict) else []:
            ip = row.get("ipaddress") or row.get("ip") or row.get("address")
            mac = row.get("macaddress") or row.get("mac") or row.get("mac_address")
            if ip and mac:
                arp[_norm_mac(mac)] = ip
    except OPNsenseError:
        pass

    try:
        dhcp_payload = c.dhcp_leases4_search()
        # OPNsense variants return DHCP lease rows under either `rows` or `data`.
        for row in _rows(dhcp_payload) if isinstance(dhcp_payload, dict) else []:
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


@router.get("/all_ips", dependencies=[Depends(require_admin)])
def all_ips() -> dict[str, object]:
    """
    Returns all discovered IPs from OPNsense (ARP + DHCP combined).
    Useful for seeing all active IPs on the network.
    """
    c = OPNsenseClient()
    ips = {}  # ip -> {mac, source}

    try:
        arp_payload = c.diagnostics_get_arp()
        for row in _rows(arp_payload) if isinstance(arp_payload, dict) else []:
            ip = row.get("ipaddress") or row.get("ip") or row.get("address")
            mac = row.get("macaddress") or row.get("mac") or row.get("mac_address")
            if ip and mac:
                if ip not in ips:
                    ips[ip] = {"mac": _norm_mac(mac), "sources": []}
                ips[ip]["sources"].append("arp")
    except OPNsenseError:
        pass

    try:
        dhcp_payload = c.dhcp_leases4_search()
        for row in _rows(dhcp_payload) if isinstance(dhcp_payload, dict) else []:
            ip = row.get("address") or row.get("ip") or row.get("ipaddress")
            mac = row.get("hwaddr") or row.get("mac") or row.get("macaddress")
            if ip and mac:
                if ip not in ips:
                    ips[ip] = {"mac": _norm_mac(mac), "sources": []}
                if "dhcp" not in ips[ip]["sources"]:
                    ips[ip]["sources"].append("dhcp")
    except OPNsenseError:
        pass

    return {"ok": True, "ips": ips}


@router.post("/create_sample_devices", dependencies=[Depends(require_admin)])
def create_sample_devices(db: Session = Depends(get_db)) -> dict[str, object]:
    """
    Creates sample Device entries from discovered IPs (for testing/demo).
    Takes first 5 discovered IPs and creates devices if they don't already exist.
    """
    c = OPNsenseClient()
    ips = {}

    try:
        arp_payload = c.diagnostics_get_arp()
        for row in _rows(arp_payload) if isinstance(arp_payload, dict) else []:
            ip = row.get("ipaddress") or row.get("ip") or row.get("address")
            mac = row.get("macaddress") or row.get("mac") or row.get("mac_address")
            if ip and mac and len(ips) < 5:
                mac_norm = _norm_mac(mac)
                if mac_norm not in ips:
                    ips[mac_norm] = ip
    except OPNsenseError:
        pass

    created = []
    for mac, ip in list(ips.items())[:5]:
        existing = db.scalar(select(Device).where(Device.mac == mac))
        if not existing:
            device = Device(
                id=str(uuid4()),
                name=f"Device-{mac[-5:]}",
                mac=mac,
                last_ip=ip,
                enabled=True,
            )
            db.add(device)
            created.append({"id": device.id, "name": device.name, "mac": mac, "ip": ip})

    db.commit()
    audit(db, actor="admin", action="discovery.create_sample_devices", details={"created": len(created)})
    return {"ok": True, "created": len(created), "devices": created}
