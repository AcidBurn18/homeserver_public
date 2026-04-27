import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import audit
from app.db import get_db
from app.models import AuditEvent
from app.opnsense_client import OPNsenseClient
from app.security import require_admin
from app.settings import settings

router = APIRouter(prefix="/api/aliases", tags=["aliases"])


class AliasReplaceRequest(BaseModel):
    name: str = Field(..., description="OPNsense alias name")
    type: str = Field("host", description="Alias type, e.g. host, network, urltable (OPNsense types)")
    description: str = ""
    content: list[str] = Field(default_factory=list, description="One entry per line (IP/CIDR/host depending on type)")
    apply: bool = True


@router.get("/runtime/{name}", dependencies=[Depends(require_admin)])
def runtime_list(name: str) -> dict[str, object]:
    """
    Lists the *runtime table* for an alias (pf table), not the config.
    Useful for confirming enforcement quickly.
    """
    c = OPNsenseClient()
    return {"ok": True, "name": name, "result": c.alias_util_list(name)}


class AliasEntryRequest(BaseModel):
    address: str
    apply: bool = True


@router.post("/runtime/{name}/add", dependencies=[Depends(require_admin)])
def runtime_add(name: str, req: AliasEntryRequest) -> dict[str, object]:
    c = OPNsenseClient()
    res = c.alias_util_add(name, req.address)
    if req.apply:
        c.alias_reconfigure()
    return {"ok": True, "result": res}


@router.post("/runtime/{name}/delete", dependencies=[Depends(require_admin)])
def runtime_delete(name: str, req: AliasEntryRequest) -> dict[str, object]:
    c = OPNsenseClient()
    res = c.alias_util_delete(name, req.address)
    if req.apply:
        c.alias_reconfigure()
    return {"ok": True, "result": res}


@router.post("/replace", dependencies=[Depends(require_admin)])
def replace_alias(req: AliasReplaceRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    c = OPNsenseClient()

    previous: dict[str, object] | None = None
    existing_uuid = c.alias_get_uuid_by_name(req.name)
    if existing_uuid:
        try:
            previous = c.alias_get_item(existing_uuid)
        except Exception:
            previous = None

    uuid = c.alias_add_or_replace(name=req.name, alias_type=req.type, content_lines=req.content, description=req.description)
    if req.apply:
        c.alias_reconfigure()

    audit(
        db,
        actor="admin",
        action="alias.replace",
        details={"name": req.name, "uuid": uuid, "previous": previous, "new_content": req.content},
    )
    return {"ok": True, "uuid": uuid}


@router.post("/replace/allowed_ips", dependencies=[Depends(require_admin)])
def replace_allowed_ips(req: AliasReplaceRequest) -> dict[str, object]:
    req.name = settings.alias_allowed_ips
    req.type = req.type or "host"
    return replace_alias(req)


@router.post("/replace/blocked_ips", dependencies=[Depends(require_admin)])
def replace_blocked_ips(req: AliasReplaceRequest) -> dict[str, object]:
    req.name = settings.alias_blocked_ips
    req.type = req.type or "host"
    return replace_alias(req)


@router.post("/rollback/{name}", dependencies=[Depends(require_admin)])
def rollback_alias(name: str, db: Session = Depends(get_db)) -> dict[str, object]:
    """
    Best-effort rollback: find the most recent alias.replace audit event for this alias and
    re-apply its captured `previous.alias.content` if present.
    """
    events = db.scalars(
        select(AuditEvent).where(AuditEvent.action == "alias.replace").order_by(AuditEvent.created_at.desc()).limit(100)
    ).all()
    for e in events:
        try:
            details = json.loads(e.details)
        except Exception:
            continue
        if details.get("name") != name:
            continue

        prev = details.get("previous") or {}
        alias = prev.get("alias") if isinstance(prev, dict) else None
        content = None
        if isinstance(alias, dict):
            content = alias.get("content")

        if not isinstance(content, str):
            raise HTTPException(status_code=400, detail="No previous content available to rollback to")

        lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
        c = OPNsenseClient()
        c.alias_add_or_replace(name=name, alias_type="host", content_lines=lines, description="Rollback from audit event")
        c.alias_reconfigure()

        audit(db, actor="admin", action="alias.rollback", details={"name": name, "rolled_back_to_event": e.id})
        return {"ok": True, "rolled_back_to_event": e.id, "restored_lines": len(lines)}

    raise HTTPException(status_code=404, detail="No prior alias.replace event found for this alias")

