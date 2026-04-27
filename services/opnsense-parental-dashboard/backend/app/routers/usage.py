from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device
from app.opnsense_client import OPNsenseClient, OPNsenseError
from app.security import require_admin

router = APIRouter(prefix="/api/usage", tags=["usage"])


@router.get("/top_talkers", dependencies=[Depends(require_admin)])
def top_talkers(db: Session = Depends(get_db)) -> dict[str, object]:
    """
    Best-effort first-pass usage:
    - Returns OPNsense 'Top Talkers' raw payload
    - Adds a simple per-device view by matching Device.last_ip
    """
    c = OPNsenseClient()
    try:
        payload = c.diagnostics_traffic_top()
    except OPNsenseError as e:
        return {"ok": False, "error": str(e)}

    devices = db.scalars(select(Device).where(Device.enabled == True)).all()  # noqa: E712
    devices_by_ip = {d.last_ip: d for d in devices if d.last_ip}

    device_rows = []
    for row in payload.get("rows", []) if isinstance(payload, dict) else []:
        ip = row.get("ip") or row.get("address") or row.get("src") or row.get("host")
        if not ip:
            continue
        d = devices_by_ip.get(ip)
        if d:
            device_rows.append(
                {
                    "device_id": d.id,
                    "device_name": d.name,
                    "mac": d.mac,
                    "ip": ip,
                    "raw": row,
                }
            )

    return {"ok": True, "raw": payload, "devices": device_rows}

