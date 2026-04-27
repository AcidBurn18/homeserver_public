import json
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models import AuditEvent


def audit(db: Session, *, actor: str, action: str, details: dict) -> None:
    ev = AuditEvent(
        id=str(uuid4()),
        actor=actor,
        action=action,
        details=json.dumps(details, default=str),
    )
    db.add(ev)
    db.commit()

