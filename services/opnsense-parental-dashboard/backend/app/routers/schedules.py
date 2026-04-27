import json
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.opnsense_client import OPNsenseClient
from app.scheduler import compute_blocked_ips
from app.security import require_admin
from app.settings import settings
from app.models import Schedule
from app.audit import audit

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


class ScheduleIn(BaseModel):
    profile_id: str
    name: str
    definition: dict = Field(
        ...,
        description="See scheduler.py for v1 JSON format. This is stored as JSON string in DB.",
    )
    enabled: bool = True


@router.get("", dependencies=[Depends(require_admin)])
def list_schedules(db: Session = Depends(get_db)) -> list[dict[str, object]]:
    items = db.scalars(select(Schedule).order_by(Schedule.created_at.desc())).all()
    return [
        {
            "id": s.id,
            "profile_id": s.profile_id,
            "name": s.name,
            "definition": json.loads(s.definition_json),
            "enabled": s.enabled,
            "created_at": s.created_at,
        }
        for s in items
    ]


@router.post("", dependencies=[Depends(require_admin)])
def create_schedule(body: ScheduleIn, db: Session = Depends(get_db)) -> dict[str, object]:
    s = Schedule(
        id=str(uuid4()),
        profile_id=body.profile_id,
        name=body.name,
        definition_json=json.dumps(body.definition),
        enabled=body.enabled,
    )
    db.add(s)
    db.commit()
    return {"ok": True, "id": s.id}


@router.post("/apply_now", dependencies=[Depends(require_admin)])
def apply_now(db: Session = Depends(get_db)) -> dict[str, object]:
    decision = compute_blocked_ips(db, now=datetime.utcnow())
    c = OPNsenseClient()
    c.alias_add_or_replace(
        name=settings.alias_blocked_ips,
        alias_type="host",
        content_lines=sorted(decision.blocked_ips),
        description="Managed by parental dashboard (computed schedule blocks)",
    )
    c.alias_reconfigure()
    audit(db, actor="admin", action="schedules.apply_now", details={"blocked_ips": sorted(decision.blocked_ips)})
    return {"ok": True, "blocked_ips": sorted(decision.blocked_ips), "reason": decision.reason}

