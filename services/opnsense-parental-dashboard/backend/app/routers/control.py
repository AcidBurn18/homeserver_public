from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.db import get_db
from app.models import AppSetting, Device, TimeoutBlock
from app.opnsense_client import OPNsenseClient
from app.security import require_admin
from app.settings import settings

router = APIRouter(prefix="/api/control", tags=["control"])


class ToggleRequest(BaseModel):
    enabled: bool


def _toggle_rule(rule_uuid: str | None, enabled: bool) -> dict:
    if not rule_uuid:
        raise HTTPException(status_code=400, detail="Rule UUID is not configured in .env")
    c = OPNsenseClient()
    res = c.firewall_toggle_rule(rule_uuid, enabled=enabled)
    c.firewall_filter_reconfigure()
    return res


@router.post("/internet_killswitch", dependencies=[Depends(require_admin)])
def internet_killswitch(req: ToggleRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    res = _toggle_rule(settings.internet_kill_rule_uuid, req.enabled)
    audit(db, actor="admin", action="control.internet_killswitch", details={"enabled": req.enabled, "result": res})
    return {"ok": True, "result": res}


@router.post("/guest_mute", dependencies=[Depends(require_admin)])
def guest_mute(req: ToggleRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    res = _toggle_rule(settings.guest_mute_rule_uuid, req.enabled)
    audit(db, actor="admin", action="control.guest_mute", details={"enabled": req.enabled, "result": res})
    return {"ok": True, "result": res}


@router.post("/bedtime_lock", dependencies=[Depends(require_admin)])
def bedtime_lock(req: ToggleRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    # Uses an Automation rule UUID if configured.
    res = _toggle_rule(settings.bedtime_rule_uuid, req.enabled)
    audit(db, actor="admin", action="control.bedtime_lock", details={"enabled": req.enabled, "result": res})
    return {"ok": True, "result": res}


class TimeoutRequest(BaseModel):
    device_id: str
    minutes: int


@router.post("/device_timeout", dependencies=[Depends(require_admin)])
def device_timeout(req: TimeoutRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    if req.minutes not in {30, 60, 120}:
        raise HTTPException(status_code=400, detail="minutes must be one of 30, 60, 120")
    d = db.scalar(select(Device).where(Device.id == req.device_id))
    if not d:
        raise HTTPException(status_code=404, detail="Device not found")
    if not d.last_ip:
        raise HTTPException(status_code=400, detail="Device has no known IP. Run discovery refresh first.")

    item = TimeoutBlock(
        id=str(uuid4()),
        device_id=d.id,
        ip=d.last_ip,
        until_at=datetime.now(timezone.utc) + timedelta(minutes=req.minutes),
    )
    db.add(item)
    db.commit()
    audit(db, actor="admin", action="control.device_timeout", details={"device_id": d.id, "ip": d.last_ip, "minutes": req.minutes})
    return {"ok": True, "timeout_id": item.id, "until_at": item.until_at}


class WarningMessageRequest(BaseModel):
    message: str


@router.get("/warning_redirect_message", dependencies=[Depends(require_admin)])
def get_warning_message(db: Session = Depends(get_db)) -> dict[str, object]:
    row = db.scalar(select(AppSetting).where(AppSetting.key == "warning_redirect_message"))
    return {"ok": True, "message": row.value if row else "Go study!"}


@router.post("/warning_redirect_message", dependencies=[Depends(require_admin)])
def set_warning_message(req: WarningMessageRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    row = db.scalar(select(AppSetting).where(AppSetting.key == "warning_redirect_message"))
    if row:
        row.value = req.message
    else:
        db.add(AppSetting(key="warning_redirect_message", value=req.message))
    db.commit()
    audit(db, actor="admin", action="content.warning_message", details={"message": req.message})
    return {"ok": True}
