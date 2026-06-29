from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
async def login():
    """Implemented in Phase 27."""
    return {"detail": "Not yet implemented"}


@router.post("/refresh")
async def refresh_token():
    """Implemented in Phase 27."""
    return {"detail": "Not yet implemented"}


@router.get("/me")
async def get_me():
    """Implemented in Phase 27."""
    return {"detail": "Not yet implemented"}
