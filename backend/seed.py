"""
seed.py — Idempotent database seeder.

Creates the first Admin user if it doesn't exist.
Safe to run multiple times.

Usage:
    cd backend
    python seed.py

Or via Docker Compose after migrations:
    docker compose exec api python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config import settings
from app.models.asset import Asset
from app.models.user import User
from app.services.auth import hash_password


def seed_admin(db: Session) -> None:
    """Create the first Admin user if not already present."""
    existing = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
    if existing:
        print(f"[seed] Admin user already exists: {settings.FIRST_ADMIN_EMAIL}")
        return

    admin = User(
        email=settings.FIRST_ADMIN_EMAIL,
        hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
        full_name="System Administrator",
        role="Admin",
        department="IT",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print(f"[seed] Created admin user: {settings.FIRST_ADMIN_EMAIL} (id={admin.id})")


def seed_iot_assets(db: Session) -> None:
    """Seed 5 assets with sensor_device_id for IoT simulator. Idempotent."""
    ASSETS_TO_SEED = [
        {"name": "ThinkPad X1 Carbon",    "category": "Laptop",           "sensor_device_id": "DEV-LAPTOP-01"},
        {"name": 'Dell UltraSharp 27"',    "category": "Monitor",          "sensor_device_id": "DEV-MONITOR-01"},
        {"name": "HP LaserJet Pro",        "category": "Printer",          "sensor_device_id": "DEV-PRINTER-01"},
        {"name": "Toyota 8FGU25 Forklift", "category": "Forklift",         "sensor_device_id": "DEV-FORKLIFT-01"},
        {"name": "Epson EB-L200F",         "category": "Office Equipment",  "sensor_device_id": "DEV-OFFICE-01"},
    ]
    created = 0
    for item in ASSETS_TO_SEED:
        exists = db.query(Asset).filter(
            Asset.sensor_device_id == item["sensor_device_id"]
        ).first()
        if exists:
            print(f"[seed] IoT asset already exists: {item['sensor_device_id']}")
            continue
        asset = Asset(
            name=item["name"],
            category=item["category"],
            sensor_device_id=item["sensor_device_id"],
            status="available",
            location="Floor 1",
            purchase_date=date(2023, 1, 1),
        )
        db.add(asset)
        created += 1
    db.commit()
    print(f"[seed] Created IoT assets: {created} new asset(s)")


def main() -> None:
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as db:
        seed_admin(db)
        seed_iot_assets(db)
    print("[seed] Done.")


if __name__ == "__main__":
    main()
