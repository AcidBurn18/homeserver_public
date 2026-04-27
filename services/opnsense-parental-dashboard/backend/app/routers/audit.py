import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuditEvent
from app.security import require_admin

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", dependencies=[Depends(require_admin)])
def list_events(db: Session = Depends(get_db), limit: int = 50) -> list[dict[str, object]]:
    items = db.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit)).all()
    return [
        {
            "id": e.id,
            "created_at": e.created_at,
            "actor": e.actor,
            "action": e.action,
            "details": json.loads(e.details),
        }
        for e in items
    ]

