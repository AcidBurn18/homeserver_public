from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.opnsense_client import OPNsenseClient
from app.security import require_admin
from app.settings import settings
from app.audit import audit
from app.db import get_db

router = APIRouter(prefix="/api/dnsbl", tags=["dnsbl"])


@router.get("/status", dependencies=[Depends(require_admin)])
def status() -> dict[str, object]:
    c = OPNsenseClient()
    return {"dnsbl": c.unbound_dnsbl_status(), "blocklist_enabled": c.unbound_is_blocklist_enabled()}


@router.get("/lists", dependencies=[Depends(require_admin)])
def lists() -> dict[str, object]:
    c = OPNsenseClient()
    return c.unbound_search_dnsbl()


class ToggleRequest(BaseModel):
    uuid: str
    enabled: bool
    reconfigure: bool = True


@router.post("/toggle", dependencies=[Depends(require_admin)])
def toggle(req: ToggleRequest, db=Depends(get_db)) -> dict[str, object]:
    c = OPNsenseClient()
    res = c.unbound_toggle_dnsbl(req.uuid, req.enabled)
    if req.reconfigure:
        c.unbound_reconfigure()
    audit(db, actor="admin", action="dnsbl.toggle", details={"uuid": req.uuid, "enabled": req.enabled})
    return {"ok": True, "result": res}


class FamilyModeRequest(BaseModel):
    enabled: bool = True
    reconfigure: bool = True


@router.post("/family_mode", dependencies=[Depends(require_admin)])
def family_mode(req: FamilyModeRequest, db=Depends(get_db)) -> dict[str, object]:
    """
    Enables (or disables) a configured set of DNSBL UUIDs.
    Configure via env: FAMILY_DNSBL_UUIDS (comma-separated).
    """
    if not settings.family_dnsbl_uuids:
        raise HTTPException(status_code=400, detail="FAMILY_DNSBL_UUIDS not configured")

    uuids = [u.strip() for u in settings.family_dnsbl_uuids.split(",") if u.strip()]
    if not uuids:
        raise HTTPException(status_code=400, detail="FAMILY_DNSBL_UUIDS empty")

    c = OPNsenseClient()
    results = []
    for u in uuids:
        results.append({"uuid": u, "result": c.unbound_toggle_dnsbl(u, req.enabled)})
    if req.reconfigure:
        c.unbound_reconfigure()
    audit(db, actor="admin", action="dnsbl.family_mode", details={"enabled": req.enabled, "uuids": uuids})
    return {"ok": True, "applied": results}


class ExceptionRequest(BaseModel):
    uuid: str
    domain: str
    list_type: str  # allowlists | blocklists
    reconfigure: bool = True


@router.post("/exception", dependencies=[Depends(require_admin)])
def upsert_exception(req: ExceptionRequest, db=Depends(get_db)) -> dict[str, object]:
    if req.list_type not in {"allowlists", "blocklists"}:
        raise HTTPException(status_code=400, detail="list_type must be allowlists|blocklists")
    c = OPNsenseClient()
    res = c.unbound_update_blocklist(uuid=req.uuid, domain=req.domain, list_type=req.list_type)
    if req.reconfigure:
        c.unbound_reconfigure()
    audit(db, actor="admin", action="dnsbl.exception", details={"uuid": req.uuid, "domain": req.domain, "type": req.list_type})
    return {"ok": True, "result": res}

