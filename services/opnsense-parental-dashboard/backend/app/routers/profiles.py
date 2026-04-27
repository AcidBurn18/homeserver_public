from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Profile
from app.security import require_admin

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


class ProfileIn(BaseModel):
    name: str


@router.get("", dependencies=[Depends(require_admin)])
def list_profiles(db: Session = Depends(get_db)) -> list[dict[str, object]]:
    items = db.scalars(select(Profile).order_by(Profile.name.asc())).all()
    return [{"id": p.id, "name": p.name, "created_at": p.created_at} for p in items]


@router.post("", dependencies=[Depends(require_admin)])
def create_profile(body: ProfileIn, db: Session = Depends(get_db)) -> dict[str, object]:
    p = Profile(id=str(uuid4()), name=body.name)
    db.add(p)
    db.commit()
    return {"ok": True, "id": p.id}

