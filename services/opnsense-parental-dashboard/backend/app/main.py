from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routers import aliases, audit, content, control, devices, discovery, dnsbl, health, profiles, schedules, usage

app = FastAPI(title="OPNsense Parental Dashboard API")

@app.on_event("startup")
def _startup() -> None:
    # v1: lightweight schema creation (no migrations yet)
    Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(aliases.router)
app.include_router(control.router)
app.include_router(content.router)
app.include_router(profiles.router)
app.include_router(devices.router)
app.include_router(discovery.router)
app.include_router(schedules.router)
app.include_router(dnsbl.router)
app.include_router(usage.router)
app.include_router(audit.router)

