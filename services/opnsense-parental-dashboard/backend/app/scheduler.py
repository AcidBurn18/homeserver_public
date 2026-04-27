from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Device, Profile, Schedule, TimeoutBlock


@dataclass(frozen=True)
class BlockDecision:
    blocked_ips: set[str]
    reason: str


def _parse_def(definition_json: str) -> dict:
    return json.loads(definition_json)


def _is_now_in_block_window(defn: dict, *, now: datetime) -> bool:
    """
    Definition format (v1):
    {
      "timezone": "Asia/Kolkata",
      "blocked": [
        {"days":[0,1,2,3,4], "start":"21:00", "end":"07:00"},
        {"days":[5,6], "start":"22:00", "end":"08:00"}
      ]
    }

    days: 0=Mon ... 6=Sun (Python weekday)
    Supports overnight windows where end < start.
    """
    tz = ZoneInfo(defn.get("timezone") or "UTC")
    local_now = now.astimezone(tz)
    wd = local_now.weekday()
    now_t = local_now.time()

    for w in defn.get("blocked", []):
        days = set(w.get("days", []))
        if wd not in days:
            continue
        start_s = w.get("start", "00:00")
        end_s = w.get("end", "00:00")
        h1, m1 = [int(x) for x in start_s.split(":")]
        h2, m2 = [int(x) for x in end_s.split(":")]
        start_t = time(hour=h1, minute=m1)
        end_t = time(hour=h2, minute=m2)

        if end_t == start_t:
            # treated as "block all day" on selected days
            return True

        if end_t > start_t:
            if start_t <= now_t < end_t:
                return True
        else:
            # overnight window
            if now_t >= start_t or now_t < end_t:
                return True

    return False


def compute_blocked_ips(db: Session, *, now: datetime | None = None) -> BlockDecision:
    now = now or datetime.utcnow()

    blocked: set[str] = set()

    schedules = db.scalars(select(Schedule).where(Schedule.enabled == True)).all()  # noqa: E712
    profiles_by_id = {p.id: p for p in db.scalars(select(Profile)).all()}
    devices = db.scalars(select(Device).where(Device.enabled == True)).all()  # noqa: E712

    devices_by_profile: dict[str, list[Device]] = {}
    for d in devices:
        if d.profile_id:
            devices_by_profile.setdefault(d.profile_id, []).append(d)

    for sch in schedules:
        defn = _parse_def(sch.definition_json)
        if not _is_now_in_block_window(defn, now=now):
            continue

        profile = profiles_by_id.get(sch.profile_id)
        if not profile:
            continue

        for d in devices_by_profile.get(profile.id, []):
            if d.last_ip:
                blocked.add(d.last_ip)

    # Add temporary device timeout blocks.
    timeout_rows = db.scalars(select(TimeoutBlock)).all()
    for t in timeout_rows:
        if t.until_at > now:
            blocked.add(t.ip)

    return BlockDecision(blocked_ips=blocked, reason="computed_from_schedules")

