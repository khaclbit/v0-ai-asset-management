from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base.
    All ORM models should inherit from this class.
    Domain models are defined in Phase 26.
    """
    pass
