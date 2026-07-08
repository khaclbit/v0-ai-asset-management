"""
seed.py — Idempotent database seeder.

Creates demo users, IoT assets, additional assets, assignment records,
and maintenance records for development/demo environments.
Safe to run multiple times.

Usage:
    cd backend
    python seed.py

Or via Docker Compose after migrations:
    docker compose exec api python seed.py
"""
import sys
import os

from pathlib import Path


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import date
from decimal import Decimal

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config import settings
from app.models.asset import Asset
from app.models.assignment import Assignment
from app.models.maintenance import MaintenanceRecord
from app.models.user import User
from app.services.auth import hash_password


# ─── Users ───────────────────────────────────────────────────────────────────

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


DEMO_USERS = [
    # Asset Managers
    {"email": "alice.nguyen@company.com", "full_name": "Alice Nguyen",  "role": "Asset Manager", "department": "Operations",  "password": "Manager@123"},
    {"email": "bob.tran@company.com",     "full_name": "Bob Tran",      "role": "Asset Manager", "department": "IT",          "password": "Manager@123"},
    # Staff
    {"email": "carol.le@company.com",     "full_name": "Carol Le",      "role": "Staff",         "department": "Engineering", "password": "Staff@123"},
    {"email": "david.pham@company.com",   "full_name": "David Pham",    "role": "Staff",         "department": "Engineering", "password": "Staff@123"},
    {"email": "emma.vu@company.com",      "full_name": "Emma Vu",       "role": "Staff",         "department": "Sales",       "password": "Staff@123"},
    {"email": "frank.hoang@company.com",  "full_name": "Frank Hoang",   "role": "Staff",         "department": "Warehouse",   "password": "Staff@123"},
    {"email": "grace.do@company.com",     "full_name": "Grace Do",      "role": "Staff",         "department": "HR",          "password": "Staff@123"},
    # Auditor
    {"email": "henry.bui@company.com",    "full_name": "Henry Bui",     "role": "Auditor",       "department": "Finance",     "password": "Auditor@123"},
]


def seed_users(db: Session) -> dict[str, User]:
    """Seed demo users. Returns email→User map for use by downstream seeders."""
    created = 0
    user_map: dict[str, User] = {}
    for u in DEMO_USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            user_map[u["email"]] = existing
            continue
        user = User(
            email=u["email"],
            hashed_password=hash_password(u["password"]),
            full_name=u["full_name"],
            role=u["role"],
            department=u["department"],
            is_active=True,
        )
        db.add(user)
        db.flush()
        user_map[u["email"]] = user
        created += 1
    db.commit()
    print(f"[seed] Demo users: {created} new, {len(DEMO_USERS) - created} existing")
    return user_map


# ─── IoT Assets ──────────────────────────────────────────────────────────────

IOT_ASSETS = [
    {
        "name": "ThinkPad X1 Carbon",
        "category": "Laptop",
        "sensor_device_id": "DEV-LAPTOP-01",
        "status": "available",
        "location": "Floor 1",
        "purchase_date": date(2022, 3, 15),
        "purchase_price": Decimal("1850.00"),
        "warranty_months": 36,
        "usage_hours_per_week": Decimal("40.0"),
    },
    {
        "name": "Dell UltraSharp 27-inch",
        "category": "Monitor",
        "sensor_device_id": "DEV-MONITOR-01",
        "status": "available",
        "location": "Floor 1",
        "purchase_date": date(2022, 5, 20),
        "purchase_price": Decimal("650.00"),
        "warranty_months": 36,
        "usage_hours_per_week": Decimal("40.0"),
    },
    {
        "name": "HP LaserJet Pro M404n",
        "category": "Printer",
        "sensor_device_id": "DEV-PRINTER-01",
        "status": "available",
        "location": "Floor 2",
        "purchase_date": date(2021, 8, 10),
        "purchase_price": Decimal("480.00"),
        "warranty_months": 24,
        "repair_count": 1,
        "usage_hours_per_week": Decimal("20.0"),
    },
    {
        "name": "Toyota 8FGU25 Forklift",
        "category": "Forklift",
        "sensor_device_id": "DEV-FORKLIFT-01",
        "status": "available",
        "location": "Warehouse",
        "purchase_date": date(2020, 1, 5),
        "purchase_price": Decimal("22000.00"),
        "warranty_months": 24,
        "repair_count": 2,
        "usage_hours_per_week": Decimal("50.0"),
    },
    {
        "name": "Epson EB-L200F Projector",
        "category": "Office Equipment",
        "sensor_device_id": "DEV-OFFICE-01",
        "status": "available",
        "location": "Conference Room A",
        "purchase_date": date(2023, 2, 1),
        "purchase_price": Decimal("990.00"),
        "warranty_months": 24,
        "usage_hours_per_week": Decimal("10.0"),
    },
    
    
]

EXTRA_DEVICE_REGISTRY = [
    {"name": "MacBook Pro 16-inch (2023)", "category": "Laptop", "sensor_device_id": "DEV-MACBOOK-PRO-16-2023"},
    {"name": "Lenovo ThinkPad T14s", "category": "Laptop", "sensor_device_id": "DEV-THINKPAD-T14S"},
    {"name": "HP EliteBook 850 G8", "category": "Laptop", "sensor_device_id": "DEV-ELITEBOOK-850-G8"},
    {"name": "Dell Latitude 5530", "category": "Laptop", "sensor_device_id": "DEV-LATITUDE-5530"},
    {"name": "Samsung Odyssey G7 32-inch", "category": "Monitor", "sensor_device_id": "DEV-ODYSSEY-G7-32"},
    {"name": "LG UltraWide 34WL500", "category": "Monitor", "sensor_device_id": "DEV-ULTRAWIDE-34WL500"},
    {"name": "BenQ PD3220U 32-inch", "category": "Monitor", "sensor_device_id": "DEV-PD3220U-32"},
    {"name": "ASUS ProArt PA278QV", "category": "Monitor", "sensor_device_id": "DEV-PA278QV"},
    {"name": "Canon imageCLASS MF445dw", "category": "Printer", "sensor_device_id": "DEV-MF445DW"},
    {"name": "Xerox VersaLink C405", "category": "Printer", "sensor_device_id": "DEV-C405"},
    {"name": "Brother MFC-L8900CDW", "category": "Printer", "sensor_device_id": "DEV-MFC-L8900CDW"},
    {"name": "HP Color LaserJet E77830", "category": "Printer", "sensor_device_id": "DEV-E77830"},
    {"name": "Epson WorkForce WF-7840", "category": "Printer", "sensor_device_id": "DEV-WF-7840"},
    {"name": "Crown FC 4500 Series", "category": "Forklift", "sensor_device_id": "DEV-FC-4500"},
    {"name": "Hyster E50XN Forklift", "category": "Forklift", "sensor_device_id": "DEV-E50XN"},
    {"name": "Cisco IP Phone 8841", "category": "Office Equipment", "sensor_device_id": "DEV-IPPHONE-8841"},
    {"name": "Polycom RealPresence Group 300", "category": "Office Equipment", "sensor_device_id": "DEV-GROUP-300"},
    {"name": "Logitech MeetUp Conference Camera", "category": "Office Equipment", "sensor_device_id": "DEV-MEETUP-CAMERA"},
]

EXTRA_ASSETS = [
    # ── Laptops ──────────────────────────────────────────────────────────
    {
        "name": "MacBook Pro 16-inch (2023)",
        "category": "Laptop", "status": "available", "location": "Floor 2",
        "sensor_device_id": "DEV-MACBOOK-PRO-16-2023",
        "purchase_date": date(2023, 9, 1),  "purchase_price": Decimal("2499.00"),
        "warranty_months": 12, "usage_hours_per_week": Decimal("40.0"),
    },
    {
        "name": "Lenovo ThinkPad T14s",
        "category": "Laptop", "status": "assigned", "location": "Floor 2",
        "sensor_device_id": "DEV-THINKPAD-T14S",
        "purchase_date": date(2022, 7, 12), "purchase_price": Decimal("1350.00"),
        "warranty_months": 36, "usage_hours_per_week": Decimal("40.0"),
    },
    {
        "name": "HP EliteBook 850 G8",
        "category": "Laptop", "status": "maintenance", "location": "IT Storage",
        "sensor_device_id": "DEV-ELITEBOOK-850-G8",
        "purchase_date": date(2021, 4, 5),  "purchase_price": Decimal("1200.00"),
        "warranty_months": 36, "repair_count": 2, "usage_hours_per_week": Decimal("40.0"),
    },
    {
        "name": "Dell Latitude 5530",
        "category": "Laptop", "status": "assigned", "location": "Floor 3",
        "sensor_device_id": "DEV-LATITUDE-5530",
        "purchase_date": date(2023, 1, 20), "purchase_price": Decimal("1150.00"),
        "warranty_months": 36, "usage_hours_per_week": Decimal("35.0"),
    },
    # ── Monitors ─────────────────────────────────────────────────────────
    {
        "name": "Samsung Odyssey G7 32-inch",
        "category": "Monitor", "status": "available", "location": "Floor 3",
        "sensor_device_id": "DEV-ODYSSEY-G7-32",
        "purchase_date": date(2023, 3, 8),  "purchase_price": Decimal("750.00"),
        "warranty_months": 36, "usage_hours_per_week": Decimal("40.0"),
    },
    {
        "name": "LG UltraWide 34WL500",
        "category": "Monitor", "status": "assigned", "location": "Floor 1",
        "sensor_device_id": "DEV-ULTRAWIDE-34WL500",
        "purchase_date": date(2022, 11, 1), "purchase_price": Decimal("500.00"),
        "warranty_months": 24, "usage_hours_per_week": Decimal("35.0"),
    },
    {
        "name": "BenQ PD3220U 32-inch",
        "category": "Monitor", "status": "available", "location": "Conference Room B",
        "sensor_device_id": "DEV-PD3220U-32",
        "purchase_date": date(2022, 6, 15), "purchase_price": Decimal("850.00"),
        "warranty_months": 36, "usage_hours_per_week": Decimal("20.0"),
    },
    {
        "name": "ASUS ProArt PA278QV",
        "category": "Monitor", "status": "maintenance", "location": "IT Storage",
        "sensor_device_id": "DEV-PA278QV",
        "purchase_date": date(2020, 9, 10), "purchase_price": Decimal("420.00"),
        "warranty_months": 36, "repair_count": 1, "usage_hours_per_week": Decimal("40.0"),
    },
    # ── Printers ─────────────────────────────────────────────────────────
    {
        "name": "Canon imageCLASS MF445dw",
        "category": "Printer", "status": "available", "location": "Floor 3",
        "sensor_device_id": "DEV-MF445DW",
        "purchase_date": date(2023, 4, 12), "purchase_price": Decimal("380.00"),
        "warranty_months": 12, "usage_hours_per_week": Decimal("15.0"),
    },
    {
        "name": "Xerox VersaLink C405",
        "category": "Printer", "status": "retired", "location": "Storage",
        "sensor_device_id": "DEV-C405",
        "purchase_date": date(2018, 2, 1),  "purchase_price": Decimal("650.00"),
        "warranty_months": 12, "repair_count": 5, "usage_hours_per_week": Decimal("0.0"),
    },
    {
        "name": "Brother MFC-L8900CDW",
        "category": "Printer", "status": "maintenance", "location": "Floor 2",
        "sensor_device_id": "DEV-MFC-L8900CDW",
        "purchase_date": date(2021, 10, 5), "purchase_price": Decimal("520.00"),
        "warranty_months": 24, "repair_count": 2, "usage_hours_per_week": Decimal("20.0"),
    },
    {
        "name": "HP Color LaserJet E77830",
        "category": "Printer", "status": "available", "location": "Floor 1",
        "sensor_device_id": "DEV-E77830",
        "purchase_date": date(2023, 6, 1),  "purchase_price": Decimal("2200.00"),
        "warranty_months": 36, "usage_hours_per_week": Decimal("30.0"),
    },
    {
        "name": "Epson WorkForce WF-7840",
        "category": "Printer", "status": "assigned", "location": "HR Office",
        "sensor_device_id": "DEV-WF-7840",
        "purchase_date": date(2022, 3, 5),  "purchase_price": Decimal("350.00"),
        "warranty_months": 12, "usage_hours_per_week": Decimal("20.0"),
    },
    # ── Forklifts ────────────────────────────────────────────────────────
    {
        "name": "Crown FC 4500 Series",
        "category": "Forklift", "status": "available", "location": "Warehouse",
        "sensor_device_id": "DEV-FC-4500",
        "purchase_date": date(2021, 6, 1),  "purchase_price": Decimal("18500.00"),
        "warranty_months": 24, "usage_hours_per_week": Decimal("45.0"),
    },
    {
        "name": "Hyster E50XN Forklift",
        "category": "Forklift", "status": "maintenance", "location": "Maintenance Bay",
        "sensor_device_id": "DEV-E50XN",
        "purchase_date": date(2019, 3, 15), "purchase_price": Decimal("19800.00"),
        "warranty_months": 24, "repair_count": 3, "usage_hours_per_week": Decimal("50.0"),
    },
    # ── Office Equipment ─────────────────────────────────────────────────
    {
        "name": "Cisco IP Phone 8841",
        "category": "Office Equipment", "status": "assigned", "location": "Floor 1",
        "sensor_device_id": "DEV-IPPHONE-8841",
        "purchase_date": date(2022, 1, 10), "purchase_price": Decimal("320.00"),
        "warranty_months": 12, "usage_hours_per_week": Decimal("40.0"),
    },
    {
        "name": "Polycom RealPresence Group 300",
        "category": "Office Equipment", "status": "available", "location": "Conference Room A",
        "sensor_device_id": "DEV-GROUP-300",
        "purchase_date": date(2022, 8, 20), "purchase_price": Decimal("1800.00"),
        "warranty_months": 24, "usage_hours_per_week": Decimal("10.0"),
    },
    {
        "name": "Logitech MeetUp Conference Camera",
        "category": "Office Equipment", "status": "available", "location": "Conference Room B",
        "sensor_device_id": "DEV-MEETUP-CAMERA",
        "purchase_date": date(2023, 5, 1),  "purchase_price": Decimal("849.00"),
        "warranty_months": 24, "usage_hours_per_week": Decimal("8.0"),
    },  
]
SEED_DEVICE_REGISTRY = IOT_ASSETS + EXTRA_ASSETS
SEED_DEVICE_BY_NAME = {item["name"]: item for item in SEED_DEVICE_REGISTRY}


def seed_iot_assets(db: Session) -> dict[str, Asset]:
    """Seed IoT-enabled assets. Returns sensor_device_id→Asset map."""
    created = 0
    asset_map: dict[str, Asset] = {}
    for item in SEED_DEVICE_REGISTRY:
        sensor_device_id = item.get("sensor_device_id")
        if not sensor_device_id:
            continue
        existing = db.query(Asset).filter(
            Asset.sensor_device_id == sensor_device_id
        ).first()
        if existing:
            asset_map[sensor_device_id] = existing
            print(f"[seed] IoT asset already exists: {sensor_device_id}")
            continue
        asset = Asset(
            name=item["name"],
            category=item["category"],
            sensor_device_id=sensor_device_id,
            status=item["status"],
            location=item["location"],
            purchase_date=item["purchase_date"],
            purchase_price=item.get("purchase_price"),
            warranty_months=item.get("warranty_months", 12),
            repair_count=item.get("repair_count", 0),
            usage_hours_per_week=item.get("usage_hours_per_week", Decimal("0.0")),
        )
        db.add(asset)
        db.flush()
        asset_map[sensor_device_id] = asset
        created += 1
    db.commit()
    print(f"[seed] IoT assets: {created} new asset(s)")
    return asset_map


# ─── Additional Assets ───────────────────────────────────────────────────────

def seed_additional_assets(db: Session, user_map: dict[str, User]) -> dict[str, Asset]:
    """Seed non-IoT assets with varied statuses/locations. Returns name→Asset map."""

    created = 0
    asset_map: dict[str, Asset] = {}
    for item in EXTRA_ASSETS:
        existing = db.query(Asset).filter(Asset.name == item["name"]).first()
        if existing:
            sensor_device_id = item.get("sensor_device_id")
            if sensor_device_id and existing.sensor_device_id != sensor_device_id:
                existing.sensor_device_id = sensor_device_id
            asset_map[item["name"]] = existing
            continue
        assignee = item.get("assignee")
        asset = Asset(
            name=item["name"],
            category=item["category"],
            status=item["status"],
            location=item["location"],
            purchase_date=item["purchase_date"],
            purchase_price=item.get("purchase_price"),
            warranty_months=item.get("warranty_months", 12),
            repair_count=item.get("repair_count", 0),
            usage_hours_per_week=item.get("usage_hours_per_week", Decimal("0.0")),
            sensor_device_id=item.get("sensor_device_id"),
            assignee_id=assignee.id if assignee else None,
        )
        db.add(asset)
        db.flush()
        asset_map[item["name"]] = asset
        created += 1
    db.commit()
    print(f"[seed] Additional assets: {created} new asset(s)")
    return asset_map


# ─── Assignments ─────────────────────────────────────────────────────────────

def seed_assignments(db: Session, asset_map: dict[str, Asset], user_map: dict[str, User]) -> None:
    """Seed active assignment records for assigned assets."""
    ASSIGNMENTS = [
        ("Lenovo ThinkPad T14s",     "carol.le@company.com",    date(2023, 1, 15), date(2023, 1, 16), date(2024, 1, 15)),
        ("Dell Latitude 5530",       "david.pham@company.com",  date(2023, 2, 1),  date(2023, 2, 2),  date(2024, 2, 1)),
        ("LG UltraWide 34WL500",     "emma.vu@company.com",     date(2022, 12, 1), date(2022, 12, 2), date(2023, 12, 1)),
        ("Cisco IP Phone 8841",      "frank.hoang@company.com", date(2022, 2, 1),  date(2022, 2, 2),  date(2023, 2, 1)),
        ("Epson WorkForce WF-7840",  "grace.do@company.com",    date(2022, 4, 1),  date(2022, 4, 2),  date(2023, 4, 1)),
    ]
    created = 0
    for asset_name, email, req_date, appr_date, exp_return in ASSIGNMENTS:
        asset = asset_map.get(asset_name)
        user  = user_map.get(email)
        if not asset or not user:
            continue
        existing = (
            db.query(Assignment)
            .filter(
                Assignment.asset_id == asset.id,
                Assignment.assignee_id == user.id,
                Assignment.status == "active",
            )
            .first()
        )
        if existing:
            continue
        db.add(Assignment(
            asset_id=asset.id,
            assignee_id=user.id,
            status="active",
            requested_date=req_date,
            approved_date=appr_date,
            expected_return_date=exp_return,
        ))
        created += 1
    db.commit()
    print(f"[seed] Assignments: {created} new record(s)")


# ─── Maintenance Records ─────────────────────────────────────────────────────

def seed_maintenance_records(
    db: Session,
    iot_map: dict[str, Asset],
    extra_map: dict[str, Asset],
) -> None:
    """Seed maintenance records (completed history + current open tickets)."""

    def _find(key: str) -> Asset | None:
        return iot_map.get(key) or extra_map.get(key)

    RECORDS = [
        # ── Completed past maintenance ────────────────────────────────────
        {
            "asset_key": "DEV-LAPTOP-01",
            "title": "RAM upgrade to 32 GB",
            "description": "Upgraded RAM from 16 GB to 32 GB for engineering workloads.",
            "status": "completed",
            "scheduled_date": date(2023, 6, 1),
            "completed_date": date(2023, 6, 2),
        },
        {
            "asset_key": "DEV-PRINTER-01",
            "title": "Toner and drum replacement",
            "description": "Standard consumables replaced at 50 k page count.",
            "status": "completed",
            "scheduled_date": date(2023, 9, 5),
            "completed_date": date(2023, 9, 5),
        },
        {
            "asset_key": "DEV-FORKLIFT-01",
            "title": "Annual service and oil change",
            "description": "Routine annual service: oil change, brake inspection, tire rotation.",
            "status": "completed",
            "scheduled_date": date(2023, 1, 10),
            "completed_date": date(2023, 1, 12),
        },
        {
            "asset_key": "DEV-MONITOR-01",
            "title": "Stand replacement",
            "description": "Original stand cracked; replaced with third-party ergonomic arm.",
            "status": "completed",
            "scheduled_date": date(2023, 4, 3),
            "completed_date": date(2023, 4, 3),
        },
        {
            "asset_key": "Crown FC 4500 Series",
            "title": "Quarterly battery check",
            "description": "Battery capacity test and terminal cleaning.",
            "status": "completed",
            "scheduled_date": date(2023, 10, 1),
            "completed_date": date(2023, 10, 2),
        },
        # ── Active / scheduled tickets ────────────────────────────────────
        {
            "asset_key": "HP EliteBook 850 G8",
            "title": "Battery replacement",
            "description": "Battery swollen and no longer holds charge. Replacement ordered.",
            "status": "in_progress",
            "scheduled_date": date(2024, 1, 8),
        },
        {
            "asset_key": "Brother MFC-L8900CDW",
            "title": "Drum unit and fuser replacement",
            "description": "Drum life at 95 %, fuser showing heat warnings. Scheduled for full replacement.",
            "status": "scheduled",
            "scheduled_date": date(2024, 2, 5),
        },
        {
            "asset_key": "Hyster E50XN Forklift",
            "title": "Annual safety inspection",
            "description": "Mandatory annual safety inspection and load test. Unit pulled from service.",
            "status": "scheduled",
            "scheduled_date": date(2024, 1, 20),
        },
        {
            "asset_key": "ASUS ProArt PA278QV",
            "title": "Backlight flickering — panel inspection",
            "description": "Intermittent backlight flicker reported by user. Sent for panel assessment.",
            "status": "in_progress",
            "scheduled_date": date(2024, 1, 15),
        },
        {
            "asset_key": "DEV-OFFICE-01",
            "title": "Lamp replacement",
            "description": "Projector lamp hours exceeded 3 000 h. Replacing with OEM lamp.",
            "status": "scheduled",
            "scheduled_date": date(2024, 2, 10),
        },
    ]

    created = 0
    for rec in RECORDS:
        asset = _find(rec["asset_key"])
        if not asset:
            continue
        existing = (
            db.query(MaintenanceRecord)
            .filter(
                MaintenanceRecord.asset_id == asset.id,
                MaintenanceRecord.title == rec["title"],
            )
            .first()
        )
        if existing:
            continue
        db.add(MaintenanceRecord(
            asset_id=asset.id,
            title=rec["title"],
            description=rec.get("description"),
            status=rec["status"],
            scheduled_date=rec.get("scheduled_date"),
            completed_date=rec.get("completed_date"),
        ))
        created += 1
    db.commit()
    print(f"[seed] Maintenance records: {created} new record(s)")


# ─── Entry point ─────────────────────────────────────────────────────────────

def main() -> None:
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as db:
        seed_admin(db)
        user_map  = seed_users(db)
        iot_map   = seed_iot_assets(db)
        extra_map = seed_additional_assets(db, user_map)
        seed_assignments(db, extra_map, user_map)
        seed_maintenance_records(db, iot_map, extra_map)
    print("[seed] Done.")


if __name__ == "__main__":
    main()
