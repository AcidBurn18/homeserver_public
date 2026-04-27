from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.opnsense_client import OPNsenseClient
from app.security import require_admin
from app.settings import settings

router = APIRouter(prefix="/api/content", tags=["content"])


class DomainRequest(BaseModel):
    domain: str


def _norm_domain(domain: str) -> str:
    d = domain.strip().lower()
    return d[4:] if d.startswith("www.") else d


@router.get("/blocked_sites", dependencies=[Depends(require_admin)])
def blocked_sites() -> dict[str, object]:
    c = OPNsenseClient()
    res = c.alias_util_list(settings.alias_site_block_domains)
    return {"ok": True, "alias": settings.alias_site_block_domains, "result": res}


@router.post("/blocked_sites/add", dependencies=[Depends(require_admin)])
def blocked_sites_add(req: DomainRequest) -> dict[str, object]:
    d = _norm_domain(req.domain)
    if "." not in d:
        raise HTTPException(status_code=400, detail="Invalid domain")
    c = OPNsenseClient()
    c.alias_util_add(settings.alias_site_block_domains, d)
    c.alias_reconfigure()
    if settings.dnsbl_exception_uuid:
        # Also put into DNSBL blocklist for immediate DNS-based enforcement when configured.
        c.unbound_update_blocklist(uuid=settings.dnsbl_exception_uuid, domain=d, list_type="blocklists")
        c.unbound_reconfigure()
    return {"ok": True, "domain": d}


@router.post("/blocked_sites/delete", dependencies=[Depends(require_admin)])
def blocked_sites_delete(req: DomainRequest) -> dict[str, object]:
    d = _norm_domain(req.domain)
    c = OPNsenseClient()
    c.alias_util_delete(settings.alias_site_block_domains, d)
    c.alias_reconfigure()
    return {"ok": True, "domain": d}
