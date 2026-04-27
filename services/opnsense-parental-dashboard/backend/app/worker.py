import time
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import TimeoutBlock
from app.opnsense_client import OPNsenseClient
from app.scheduler import compute_blocked_ips
from app.settings import settings


def tick() -> None:
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # Cleanup expired timeout blocks.
        now = datetime.now(timezone.utc)
        expired = [x for x in db.query(TimeoutBlock).all() if x.until_at <= now]
        for x in expired:
            db.delete(x)
        db.commit()

        decision = compute_blocked_ips(db, now=datetime.now(timezone.utc))
    finally:
        db.close()

    c = OPNsenseClient()
    c.alias_add_or_replace(
        name=settings.alias_blocked_ips,
        alias_type="host",
        content_lines=sorted(decision.blocked_ips),
        description="Managed by parental dashboard (worker enforced schedule blocks)",
    )
    c.alias_reconfigure()


def main() -> None:
    sched = BackgroundScheduler()
    sched.add_job(tick, "interval", seconds=60, id="tick")
    sched.start()

    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

