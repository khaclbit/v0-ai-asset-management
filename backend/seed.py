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

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.config import settings

# Import will fail until Phase 26 models are defined.
# The try/except allows Phase 25 scaffold to work without models.
try:
    from sqlalchemy.orm import Session
    from app.models.user import User  # noqa: F401 — defined in Phase 26
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def seed_admin(db: Session) -> None:
        """Create the first Admin user if not already present."""
        existing = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
        if existing:
            print(f"[seed] Admin user already exists: {settings.FIRST_ADMIN_EMAIL}")
            return

        admin = User(
            email=settings.FIRST_ADMIN_EMAIL,
            hashed_password=pwd_context.hash(settings.FIRST_ADMIN_PASSWORD),
            full_name="System Administrator",
            role="Admin",
            department="IT",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"[seed] Created admin user: {settings.FIRST_ADMIN_EMAIL}")

    def main() -> None:
        engine = create_engine(settings.DATABASE_URL)
        with Session(engine) as db:
            seed_admin(db)
        print("[seed] Done.")

    if __name__ == "__main__":
        main()

except ImportError as exc:
    # Phase 26 models not yet defined — this is expected during Phase 25.
    print(f"[seed] Skipping seed: {exc}")
    print("[seed] Run this script again after Phase 26 models are defined.")
    sys.exit(0)
