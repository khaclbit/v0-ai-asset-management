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

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _truncate(plain: str) -> str:
    return plain.encode("utf-8")[:72].decode("utf-8", errors="ignore")


def seed_admin(db: Session) -> None:
    """Create the first Admin user if not already present."""
    existing = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
    if existing:
        print(f"[seed] Admin user already exists: {settings.FIRST_ADMIN_EMAIL}")
        return

    admin = User(
        email=settings.FIRST_ADMIN_EMAIL,
        hashed_password=pwd_context.hash(_truncate(settings.FIRST_ADMIN_PASSWORD)),
        full_name="System Administrator",
        role="Admin",
        department="IT",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print(f"[seed] Created admin user: {settings.FIRST_ADMIN_EMAIL} (id={admin.id})")


def main() -> None:
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as db:
        seed_admin(db)
    print("[seed] Done.")


if __name__ == "__main__":
    main()
