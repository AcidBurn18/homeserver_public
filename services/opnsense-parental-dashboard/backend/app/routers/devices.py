from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device
from app.security import require_admin

router = APIRouter(prefix="/api/devices", tags=["devices"])


class DeviceIn(BaseModel):
    name: str
    mac: str
    last_ip: str | None = None
    profile_id: str | None = None
    notes: str | None = None
    enabled: bool = True


@router.get("", dependencies=[Depends(require_admin)])
def list_devices(db: Session = Depends(get_db)) -> list[dict[str, object]]:
    items = db.scalars(select(Device).order_by(Device.name.asc())).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "mac": d.mac,
            "last_ip": d.last_ip,
            "profile_id": d.profile_id,
            "enabled": d.enabled,
            "notes": d.notes,
            "last_seen_at": d.last_seen_at,
        }
        for d in items
    ]


@router.post("", dependencies=[Depends(require_admin)])
def create_device(body: DeviceIn, db: Session = Depends(get_db)) -> dict[str, object]:
    d = Device(
        id=str(uuid4()),
        name=body.name,
        mac=body.mac.lower(),
        last_ip=body.last_ip,
        profile_id=body.profile_id,
        enabled=body.enabled,
        notes=body.notes,
    )
    db.add(d)
    db.commit()
    return {"ok": True, "id": d.id}

